import { describe, expect, it, vi } from "vitest";
import {
  NgrokSession,
  NgrokSessionDisposedError,
  type Listener,
  type Session,
  type SessionFactory,
} from "./ngrokSession";

const createListener = (url: string): Listener => ({
  close: vi.fn(),
  forward: vi.fn().mockResolvedValue(undefined),
  url: vi.fn().mockReturnValue(url),
});

const createSession = (...listeners: Listener[]) => {
  const listen = vi.fn();
  const listenAndForward = vi.fn();
  listeners.forEach((listener) => {
    listen.mockResolvedValueOnce(listener);
    listenAndForward.mockResolvedValueOnce(listener);
  });

  const session: Session = {
    close: vi.fn(),
    httpEndpoint: vi.fn().mockReturnValue({ listen, listenAndForward }),
  };

  return { listen, listenAndForward, session };
};

describe("NgrokSession", () => {
  it("creates its session lazily and reuses it across listeners", async () => {
    const firstListener = createListener("https://first.example");
    const secondListener = createListener("https://second.example");
    const { listen, listenAndForward, session } = createSession(
      firstListener,
      secondListener,
    );
    const factory = vi.fn<SessionFactory>().mockResolvedValue(session);
    const ngrok = new NgrokSession(factory);

    expect(factory).not.toHaveBeenCalled();

    await ngrok.forward({ addr: "3000", authToken: "test-token" });
    await ngrok.forward({ addr: "4000", authToken: "test-token" });

    expect(factory).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledWith("test-token");
    expect(listen).not.toHaveBeenCalled();
    expect(listenAndForward).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000",
    );
    expect(listenAndForward).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000",
    );
    expect(firstListener.forward).not.toHaveBeenCalled();
    expect(secondListener.forward).not.toHaveBeenCalled();
  });

  it("records each listener it creates", async () => {
    const firstListener = createListener("https://first.example");
    const secondListener = createListener("https://second.example");
    const { session } = createSession(firstListener, secondListener);
    const ngrok = new NgrokSession(
      vi.fn<SessionFactory>().mockResolvedValue(session),
    );

    await ngrok.forward({ addr: "3000", authToken: "test-token" });
    await ngrok.forward({ addr: "4000", authToken: "test-token" });

    expect(ngrok.listeners).toEqual([firstListener, secondListener]);
  });

  it("awaits a listener close before closing its final session", async () => {
    let finishClosingListener!: () => void;
    const listenerClose = new Promise<void>((resolve) => {
      finishClosingListener = resolve;
    });
    const listener = createListener("https://only.example");
    vi.mocked(listener.close).mockReturnValue(listenerClose);
    const { session } = createSession(listener);
    const ngrok = new NgrokSession(
      vi.fn<SessionFactory>().mockResolvedValue(session),
    );
    await ngrok.forward({ addr: "3000", authToken: "test-token" });

    const disconnect = ngrok.disconnect("https://only.example");

    expect(session.close).not.toHaveBeenCalled();
    finishClosingListener();
    await disconnect;
    expect(listener.close).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();
    expect(ngrok.listeners).toEqual([]);
    expect(ngrok.session).toBeNull();
  });

  it("rejects a listener created after final-listener teardown begins", async () => {
    let finishClosingListener!: () => void;
    const listenerClose = new Promise<void>((resolve) => {
      finishClosingListener = resolve;
    });
    let finishCreatingLateListener!: (listener: Listener) => void;
    const lateListenerCreation = new Promise<Listener>((resolve) => {
      finishCreatingLateListener = resolve;
    });
    const listener = createListener("https://only.example");
    const lateListener = createListener("https://late.example");
    vi.mocked(listener.close).mockReturnValue(listenerClose);
    const { listenAndForward, session } = createSession(listener);
    listenAndForward
      .mockReset()
      .mockResolvedValueOnce(listener)
      .mockReturnValueOnce(lateListenerCreation);
    const ngrok = new NgrokSession(
      vi.fn<SessionFactory>().mockResolvedValue(session),
    );
    await ngrok.forward({ addr: "3000", authToken: "test-token" });

    const disconnect = ngrok.disconnect("https://only.example");
    const lateForward = expect(
      ngrok.forward({ addr: "4000", authToken: "test-token" }),
    ).rejects.toThrow("ngrok session closed before forwarding started");
    await vi.waitFor(() => {
      expect(listenAndForward).toHaveBeenCalledTimes(2);
    });

    finishClosingListener();
    await Promise.resolve();
    expect(session.close).not.toHaveBeenCalled();
    finishCreatingLateListener(lateListener);

    await lateForward;
    await disconnect;
    expect(lateListener.close).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();
    expect(ngrok.listeners).toEqual([]);
    expect(ngrok.session).toBeNull();
  });

  it("disconnects all listeners by closing the session once", async () => {
    const listener = createListener("https://only.example");
    const { session } = createSession(listener);
    let finishClosingSession!: () => void;
    vi.mocked(session.close).mockReturnValue(
      new Promise<void>((resolve) => {
        finishClosingSession = resolve;
      }),
    );
    const ngrok = new NgrokSession(
      vi.fn<SessionFactory>().mockResolvedValue(session),
    );
    await ngrok.forward({ addr: "3000", authToken: "test-token" });

    const firstDisconnect = ngrok.disconnectAll();
    const secondDisconnect = ngrok.disconnectAll();
    await Promise.resolve();

    expect(session.close).toHaveBeenCalledOnce();
    finishClosingSession();
    await Promise.all([firstDisconnect, secondDisconnect]);
    await ngrok.disconnectAll();

    expect(session.close).toHaveBeenCalledOnce();
    expect(listener.close).not.toHaveBeenCalled();
    expect(ngrok.listeners).toEqual([]);
    expect(ngrok.session).toBeNull();
  });

  it("can create a new session after disconnectAll", async () => {
    const firstListener = createListener("https://first.example");
    const secondListener = createListener("https://second.example");
    const first = createSession(firstListener);
    const second = createSession(secondListener);
    const factory = vi
      .fn<SessionFactory>()
      .mockResolvedValueOnce(first.session)
      .mockResolvedValueOnce(second.session);
    const ngrok = new NgrokSession(factory);
    await ngrok.forward({ addr: "3000", authToken: "test-token" });

    await ngrok.disconnectAll();
    await ngrok.forward({ addr: "4000", authToken: "test-token" });

    expect(factory).toHaveBeenCalledTimes(2);
    expect(first.session.close).toHaveBeenCalledOnce();
    expect(second.session.close).not.toHaveBeenCalled();
    expect(ngrok.listeners).toEqual([secondListener]);
    expect(ngrok.session).toBe(second.session);
  });

  it("clears listener and session state when closing the session fails", async () => {
    const listener = createListener("https://only.example");
    const { session } = createSession(listener);
    vi.mocked(session.close).mockRejectedValueOnce(new Error("close failed"));
    const ngrok = new NgrokSession(
      vi.fn<SessionFactory>().mockResolvedValue(session),
    );
    await ngrok.forward({ addr: "3000", authToken: "test-token" });

    await expect(ngrok.disconnectAll()).rejects.toThrow("close failed");

    expect(ngrok.listeners).toEqual([]);
    expect(ngrok.session).toBeNull();
    await expect(ngrok.disconnectAll()).resolves.toBeUndefined();
    expect(session.close).toHaveBeenCalledOnce();
  });

  it("can be disposed repeatedly without closing the session twice", async () => {
    const listener = createListener("https://only.example");
    const { session } = createSession(listener);
    const ngrok = new NgrokSession(
      vi.fn<SessionFactory>().mockResolvedValue(session),
    );
    await ngrok.forward({ addr: "3000", authToken: "test-token" });

    await ngrok.dispose();
    await ngrok.dispose();

    expect(session.close).toHaveBeenCalledOnce();
    expect(ngrok.listeners).toEqual([]);
    expect(ngrok.session).toBeNull();
  });

  it("does not record a listener when forwarding setup fails", async () => {
    const listener = createListener("https://failed.example");
    const { listenAndForward, session } = createSession(listener);
    listenAndForward.mockReset().mockRejectedValue(new Error("forward failed"));
    const ngrok = new NgrokSession(
      vi.fn<SessionFactory>().mockResolvedValue(session),
    );

    await expect(
      ngrok.forward({ addr: "3000", authToken: "test-token" }),
    ).rejects.toThrow("forward failed");

    expect(listenAndForward).toHaveBeenCalledWith("http://localhost:3000");
    expect(ngrok.listeners).toEqual([]);
  });

  it("creates one session for concurrent forwarding requests", async () => {
    const firstListener = createListener("https://first.example");
    const secondListener = createListener("https://second.example");
    const { session } = createSession(firstListener, secondListener);
    const factory = vi.fn<SessionFactory>().mockResolvedValue(session);
    const ngrok = new NgrokSession(factory);

    await Promise.all([
      ngrok.forward({ addr: "3000", authToken: "test-token" }),
      ngrok.forward({ addr: "4000", authToken: "test-token" }),
    ]);

    expect(factory).toHaveBeenCalledOnce();
    expect(ngrok.listeners).toEqual([firstListener, secondListener]);
  });

  it("awaits and closes a session created while disposal is in progress", async () => {
    let finishCreatingSession!: (session: Session) => void;
    const sessionCreation = new Promise<Session>((resolve) => {
      finishCreatingSession = resolve;
    });
    const listener = createListener("https://late.example");
    const { listenAndForward, session } = createSession(listener);
    const ngrok = new NgrokSession(
      vi.fn<SessionFactory>().mockReturnValue(sessionCreation),
    );
    const forwarding = expect(
      ngrok.forward({ addr: "3000", authToken: "test-token" }),
    ).rejects.toThrow();
    let disposed = false;

    const disposal = ngrok.dispose().then(() => {
      disposed = true;
    });
    await Promise.resolve();

    expect(disposed).toBe(false);
    finishCreatingSession(session);
    await disposal;
    await forwarding;
    expect(session.close).toHaveBeenCalledOnce();
    expect(listenAndForward).not.toHaveBeenCalled();
    expect(ngrok.listeners).toEqual([]);
    expect(ngrok.session).toBeNull();
  });

  it("rejects forwarding setup completed during disposal", async () => {
    let finishCreatingListener!: (listener: Listener) => void;
    const listenerCreation = new Promise<Listener>((resolve) => {
      finishCreatingListener = resolve;
    });
    const listener = createListener("https://late.example");
    const { listenAndForward, session } = createSession(listener);
    listenAndForward.mockReset().mockReturnValue(listenerCreation);
    const ngrok = new NgrokSession(
      vi.fn<SessionFactory>().mockResolvedValue(session),
    );
    const forwarding = expect(
      ngrok.forward({ addr: "3000", authToken: "test-token" }),
    ).rejects.toThrow("ngrok session closed before forwarding started");
    await Promise.resolve();
    await Promise.resolve();
    expect(listenAndForward).toHaveBeenCalledOnce();
    let disposed = false;

    const disposal = ngrok.dispose().then(() => {
      disposed = true;
    });
    await Promise.resolve();

    expect(disposed).toBe(false);
    finishCreatingListener(listener);
    await Promise.all([forwarding, disposal]);
    expect(listener.close).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();
    expect(ngrok.listeners).toEqual([]);
    expect(ngrok.session).toBeNull();
  });

  it("rejects forwarding after disposal without creating a session", async () => {
    const listener = createListener("https://late.example");
    const { session } = createSession(listener);
    const factory = vi.fn<SessionFactory>().mockResolvedValue(session);
    const ngrok = new NgrokSession(factory);
    await ngrok.dispose();

    const forwarding = ngrok.forward({
      addr: "3000",
      authToken: "test-token",
    });
    await expect(forwarding).rejects.toBeInstanceOf(NgrokSessionDisposedError);
    await expect(forwarding).rejects.toThrow("ngrok session has been disposed");

    expect(factory).not.toHaveBeenCalled();
    expect(session.close).not.toHaveBeenCalled();
    expect(ngrok.listeners).toEqual([]);
    expect(ngrok.session).toBeNull();
  });
});
