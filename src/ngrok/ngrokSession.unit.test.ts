import { describe, expect, it, vi } from "vitest";
import {
  NgrokSession,
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
  listeners.forEach((listener) => listen.mockResolvedValueOnce(listener));

  const session: Session = {
    close: vi.fn(),
    httpEndpoint: vi.fn().mockReturnValue({ listen }),
  };

  return { listen, session };
};

describe("NgrokSession", () => {
  it("creates its session lazily and reuses it across listeners", async () => {
    const firstListener = createListener("https://first.example");
    const secondListener = createListener("https://second.example");
    const { listen, session } = createSession(firstListener, secondListener);
    const factory = vi.fn<SessionFactory>().mockResolvedValue(session);
    const ngrok = new NgrokSession(factory);

    expect(factory).not.toHaveBeenCalled();

    await ngrok.forward({ addr: "3000", authToken: "test-token" });
    await ngrok.forward({ addr: "4000", authToken: "test-token" });

    expect(factory).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledWith("test-token");
    expect(listen).toHaveBeenCalledTimes(2);
    expect(firstListener.forward).toHaveBeenCalledWith("localhost:3000");
    expect(secondListener.forward).toHaveBeenCalledWith("localhost:4000");
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
});
