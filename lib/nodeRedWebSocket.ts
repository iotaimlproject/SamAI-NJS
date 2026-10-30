export const NODE_RED_HOSTS = {
  production: { protocol: "wss", host: "node-dev.iotaiml.dpdns.org" },
} as const;

type Host = (typeof NODE_RED_HOSTS)[keyof typeof NODE_RED_HOSTS];

const socketCache = new Map<string, SocketConnection>();
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const timeoutIds = new Map<string, ReturnType<typeof setTimeout>>();
const pendingMessages = new Map<string, { payload: unknown; at: number }[]>();

export const RECONNECT = {
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 1.5,
  timeout: 8000,
} as const;

const MAX_PENDING_QUEUE = 50;
// Commands queued while offline are dropped after this, so a stale "set-speed" never fires minutes later.
export const MAX_QUEUE_AGE_MS = 10_000;

const buildUrl = (path: string, host: Host = NODE_RED_HOSTS.production) =>
  `${host.protocol}://${host.host}${path.startsWith("/") ? path : `/${path}`}`;

// One live socket carries every machine's data as MQTT-style topics (see lib/perfTelemetry.ts);
// voice keeps its own pair. Swapping the live socket for an MQTT broker keeps the same topics.
export const NODE_RED_WS_PATHS = {
  live: "/ws/perf/live",
  speak: "/ws/perf/speak",
  voice: "/ws/perf/voice",
} as const;

export type NodeRedPath = (typeof NODE_RED_WS_PATHS)[keyof typeof NODE_RED_WS_PATHS];


export type SocketHandlers = {
  onopen?: () => void;
  onmessage?: (_event: MessageEvent) => void;
  onerror?: (_event?: Event) => void;
  onclose?: (_event?: CloseEvent) => void;
};

// Browsers run one WebSocket handshake per host at a time (Chromium's endpoint lock), so we queue our own:
// the connect timeout then measures a socket's own handshake, not its wait behind others, and paths that
// already failed (e.g. no Node-RED listener yet, ~1.7s per 502) go to the back so they can't starve healthy ones.
const connectQueue: SocketConnection[] = [];
let handshaking: SocketConnection | null = null;

function pumpConnectQueue() {
  while (!handshaking && connectQueue.length > 0) {
    const next = connectQueue.shift()!;
    if (next.closedManually || !next.connecting) continue;
    handshaking = next;
    if (!next.openSocket()) handshaking = null;
  }
}

function releaseHandshake(connection: SocketConnection) {
  const queued = connectQueue.indexOf(connection);
  if (queued !== -1) connectQueue.splice(queued, 1);
  if (handshaking !== connection) return;
  handshaking = null;
  pumpConnectQueue();
}

function enqueueConnect(connection: SocketConnection) {
  const firstFailing = connection.attempts > 0 ? -1 : connectQueue.findIndex((queued) => queued.attempts > 0);
  if (firstFailing === -1) connectQueue.push(connection);
  else connectQueue.splice(firstFailing, 0, connection);
  pumpConnectQueue();
}

class SocketConnection {
  path: string;
  socket: WebSocket | null = null;
  handlers: SocketHandlers = {};
  attempts = 0;
  closedManually = false;
  connecting = false;
  currentHost: Host = NODE_RED_HOSTS.production;

  constructor(path: string) {
    this.path = path;
  }

  getUrl() {
    return buildUrl(this.path, this.currentHost);
  }

  setHandlers(handlers: SocketHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  connect(): WebSocket | null {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") return null;
    if (this.socket?.readyState === WebSocket.OPEN) return this.socket;
    if (this.socket && (this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING)) {
      this.socket = null;
      this.connecting = false;
    }
    if (this.socket?.readyState === WebSocket.CONNECTING || this.connecting) return this.socket;

    this.closedManually = false;
    this.connecting = true;
    enqueueConnect(this);
    return this.socket;
  }

  openSocket(): WebSocket | null {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") return null;
    if (this.closedManually) {
      this.connecting = false;
      return null;
    }
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return this.socket;
    const url = this.getUrl();
    this.socket = new WebSocket(url);
    this.socket.onopen = () => this.onOpen();
    this.socket.onmessage = (event) => this.onMessage(event);
    this.socket.onerror = (event) => this.onError(event);
    this.socket.onclose = (event) => this.onClose(event);
    this.setConnectTimeout();
    return this.socket;
  }

  setConnectTimeout() {
    const key = `${this.path}-${this.currentHost.host}`;
    const existing = timeoutIds.get(key);
    if (existing) clearTimeout(existing);
    const id = setTimeout(() => {
      const s = this.socket;
      if (s?.readyState === WebSocket.CONNECTING) {
        s.onopen = null;
        s.onclose = null;
        s.onerror = null;
        s.onmessage = null;
        try {
          s.close();
        } catch {
          void 0;
        }
        this.socket = null;
        this.connecting = false;
        releaseHandshake(this);
        if (!this.closedManually) this.scheduleReconnect();
      }
    }, RECONNECT.timeout);
    timeoutIds.set(key, id);
  }

  clearConnectTimeout() {
    const key = `${this.path}-${this.currentHost.host}`;
    const id = timeoutIds.get(key);
    if (id) {
      clearTimeout(id);
      timeoutIds.delete(key);
    }
  }

  onOpen() {
    this.connecting = false;
    this.clearConnectTimeout();
    releaseHandshake(this);
    this.attempts = 0;
    this.flushPending();
    this.handlers.onopen?.();
  }

  onMessage(event: MessageEvent) {
    this.handlers.onmessage?.(event);
  }

  onError(event?: Event) {
    if (this.attempts <= 2) {
      console.debug(`WebSocket connection failed for ${this.getUrl()}`, event);
    }
    this.handlers.onerror?.(event);
  }

  onClose(event?: CloseEvent) {
    this.connecting = false;
    this.clearConnectTimeout();
    releaseHandshake(this);
    if (!this.closedManually) this.scheduleReconnect();
    this.handlers.onclose?.(event);
  }

  scheduleReconnect() {
    const hostKey = this.currentHost.host;
    const key = `${this.path}-${hostKey}`;
    const existing = reconnectTimers.get(key);
    if (existing) clearTimeout(existing);
    const delay = Math.min(RECONNECT.initialDelay * Math.pow(RECONNECT.multiplier, this.attempts), RECONNECT.maxDelay);
    const timerId = setTimeout(() => {
      this.attempts += 1;
      this.connect();
    }, delay);
    reconnectTimers.set(key, timerId);
  }

  flushPending() {
    const queue = pendingMessages.get(this.path);
    if (!queue || queue.length === 0) return;
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    const oldest = Date.now() - MAX_QUEUE_AGE_MS;
    while (queue.length > 0) {
      const item = queue[0];
      if (item.at >= oldest) {
        try {
          this.socket.send(JSON.stringify(item.payload));
        } catch {
          break;
        }
      }
      queue.shift();
    }
    if (queue.length === 0) pendingMessages.delete(this.path);
  }

  // Skip the backoff wait (network back / tab visible again).
  reconnectNow() {
    if (this.closedManually || this.connecting || this.socket?.readyState === WebSocket.OPEN) return;
    const key = `${this.path}-${this.currentHost.host}`;
    const timer = reconnectTimers.get(key);
    if (timer) clearTimeout(timer);
    reconnectTimers.delete(key);
    this.attempts = 0;
    this.connect();
  }

  send(payload: unknown): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(payload));
        return true;
      } catch {
        this.queue(payload);
        return false;
      }
    }
    this.queue(payload);
    if (!this.connecting && !this.closedManually) this.connect();
    return false;
  }

  queue(payload: unknown) {
    if (!pendingMessages.has(this.path)) pendingMessages.set(this.path, []);
    const queue = pendingMessages.get(this.path)!;
    if (queue.length >= MAX_PENDING_QUEUE) queue.shift();
    queue.push({ payload, at: Date.now() });
  }

  close() {
    this.closedManually = true;
    const key = `${this.path}-${this.currentHost.host}`;
    const timer = reconnectTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      reconnectTimers.delete(key);
    }
    this.clearConnectTimeout();
    pendingMessages.delete(this.path);
    const s = this.socket;
    if (s) {
      s.onopen = null;
      s.onclose = null;
      s.onerror = null;
      s.onmessage = null;
      // Also cancel an in-flight handshake: the browser holds its per-host handshake lock until it ends.
      if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) {
        try {
          s.close();
        } catch {
          void 0;
        }
      }
    }
    this.socket = null;
    this.connecting = false;
    this.attempts = 0;
    releaseHandshake(this);
  }
}

let wakeListenersAdded = false;

function reconnectAll() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  for (const connection of socketCache.values()) connection.reconnectNow();
}

function addWakeListeners() {
  if (wakeListenersAdded || typeof window === "undefined") return;
  wakeListenersAdded = true;
  window.addEventListener("online", reconnectAll);
  document.addEventListener("visibilitychange", reconnectAll);
}

export function getNodeRedSocket(path: string, handlers: SocketHandlers = {}): WebSocket | null {
  addWakeListeners();
  let connection = socketCache.get(path);
  if (!connection) {
    connection = new SocketConnection(path);
    socketCache.set(path, connection);
  }
  connection.setHandlers(handlers);
  return connection.connect();
}

export function sendNodeRedMessage(path: string, payload: unknown): boolean {
  const connection = socketCache.get(path);
  if (connection) return connection.send(payload);
  const tmp = new SocketConnection(path);
  socketCache.set(path, tmp);
  tmp.connect();
  return tmp.send(payload);
}

export function closeNodeRedSocket(path: string): void {
  const connection = socketCache.get(path);
  if (!connection) return;
  connection.close();
  socketCache.delete(path);
}
