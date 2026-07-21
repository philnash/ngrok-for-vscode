export interface Listener {
  close(): Promise<void>;
  forward(addr: string): Promise<void>;
  url(): string | null;
}

export interface Session {
  close(): Promise<void>;
  httpEndpoint(): {
    listenAndForward(addr: string): Promise<Listener>;
  };
}

export type SessionFactory = (authToken: string) => Promise<Session>;

export class NgrokSessionDisposedError extends Error {
  constructor() {
    super("ngrok session has been disposed");
    this.name = "NgrokSessionDisposedError";
  }
}

export interface SessionService {
  listeners: Listener[];
  disconnect(url: string): Promise<void>;
  disconnectAll(): Promise<void>;
  dispose(): Promise<void>;
  forward(options: { addr: string; authToken: string }): Promise<Listener>;
}

export class NgrokSession implements SessionService {
  session: Session | null;
  listeners: Listener[];
  #disconnecting: Promise<void> | null;
  #disposed: boolean;
  #forwarding: Set<Promise<Listener>>;
  #sessionCreation: Promise<Session> | null;

  constructor(private readonly createSession: SessionFactory) {
    this.session = null;
    this.listeners = [];
    this.#disconnecting = null;
    this.#disposed = false;
    this.#forwarding = new Set();
    this.#sessionCreation = null;
  }

  forward(options: { addr: string; authToken: string }) {
    if (this.#disposed) {
      return Promise.reject(new NgrokSessionDisposedError());
    }
    const forwarding = this.#forward(options);
    this.#forwarding.add(forwarding);
    void forwarding.then(
      () => this.#forwarding.delete(forwarding),
      () => this.#forwarding.delete(forwarding),
    );
    return forwarding;
  }

  async #forward({ addr, authToken }: { addr: string; authToken: string }) {
    const session = await this.#getSession(authToken);
    if (this.#disconnecting || this.session !== session) {
      throw new Error("ngrok session closed before forwarding started");
    }
    const listener = await session
      .httpEndpoint()
      .listenAndForward(`localhost:${addr}`);
    this.listeners.push(listener);
    return listener;
  }

  async disconnect(url: string) {
    if (!this.session) {
      return;
    }
    const listener = this.listeners.find((listener) => listener.url() === url);
    if (!listener) {
      return;
    }
    try {
      await listener.close();
    } finally {
      this.listeners = this.listeners.filter(
        (listener) => listener.url() !== url,
      );
      if (this.listeners.length === 0) {
        await this.disconnectAll();
      }
    }
  }

  async disconnectAll() {
    if (this.#disconnecting) {
      return this.#disconnecting;
    }
    const session = this.session;
    const forwarding = [...this.#forwarding];
    if (!session && forwarding.length === 0) {
      this.listeners = [];
      return;
    }
    const disconnecting = (async () => {
      try {
        await Promise.allSettled(forwarding);
        await this.session?.close();
      } finally {
        this.listeners = [];
        this.session = null;
      }
    })();
    this.#disconnecting = disconnecting;
    try {
      await disconnecting;
    } finally {
      if (this.#disconnecting === disconnecting) {
        this.#disconnecting = null;
      }
    }
  }

  async dispose() {
    this.#disposed = true;
    await this.disconnectAll();
  }

  async #getSession(authToken: string) {
    if (this.session) {
      return this.session;
    }
    if (!this.#sessionCreation) {
      this.#sessionCreation = this.createSession(authToken);
    }
    try {
      this.session = await this.#sessionCreation;
      return this.session;
    } finally {
      this.#sessionCreation = null;
    }
  }
}
