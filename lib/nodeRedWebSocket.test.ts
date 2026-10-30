import assert from "node:assert/strict";
import { afterEach, before, describe, mock, test } from "node:test";

// Minimal browser surface the socket layer touches. Time is mocked, nothing touches the network.
class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static all: FakeWebSocket[] = [];
  readyState = FakeWebSocket.CONNECTING;
  sent: unknown[] = [];
  failSend = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  onclose: ((event?: unknown) => void) | null = null;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.all.push(this);
  }
  send(data: string) {
    if (this.failSend) throw new Error("send failed");
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
  serverOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
  serverDrop() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}

const win = new EventTarget();
const doc = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
Object.assign(globalThis, { window: win, document: doc, WebSocket: FakeWebSocket });

let api: typeof import("./nodeRedWebSocket.ts");
let n = 0;
const used: string[] = [];
const uniquePath = () => {
  const path = `/ws/test/${++n}`;
  used.push(path);
  return path;
};
const socketsFor = (path: string) => FakeWebSocket.all.filter((s) => s.url.endsWith(path));
const latest = (path: string) => socketsFor(path).at(-1)!;
const tick = (ms: number) => mock.timers.tick(ms);
// Let any earlier test's connect slots expire so tests don't see each other's stagger.
const settle = () => tick(5_000);

before(async () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000_000 });
  api = await import("./nodeRedWebSocket.ts");
});

// Always tear down, even when an assertion failed, so timers never leak into the next test.
afterEach(() => {
  for (const path of used.splice(0)) api.closeNodeRedSocket(path);
  doc.visibilityState = "visible";
});

describe("connect", () => {
  test("builds the wss URL for the path", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    assert.equal(latest(path).url, `wss://node-dev.iotaiml.dpdns.org${path}`);
    api.closeNodeRedSocket(path);
  });

  test("runs one handshake at a time; the next starts as soon as the previous opens or fails", () => {
    settle();
    const paths = [uniquePath(), uniquePath(), uniquePath()];
    for (const path of paths) api.getNodeRedSocket(path);
    assert.deepEqual(paths.map((p) => socketsFor(p).length), [1, 0, 0]);
    latest(paths[0]).serverOpen();
    assert.deepEqual(paths.map((p) => socketsFor(p).length), [1, 1, 0], "no fixed delay: next starts on open");
    latest(paths[1]).serverDrop();
    assert.deepEqual(paths.map((p) => socketsFor(p).length), [1, 1, 1], "and on failure");
  });

  test("slow failing paths (502, no listener) can't time out a healthy path waiting behind them", () => {
    settle();
    const dead = [uniquePath(), uniquePath(), uniquePath()];
    const live = uniquePath();
    let opened = false;
    for (const path of dead) api.getNodeRedSocket(path);
    api.getNodeRedSocket(live, { onopen: () => (opened = true) });
    for (const path of dead) {
      tick(1_700); // a 502 handshake takes ~1.7s
      latest(path).serverDrop();
    }
    assert.equal(socketsFor(live).length, 1, "live path got its turn after 5.1s of waiting");
    tick(7_000);
    latest(live).serverOpen();
    assert.equal(opened, true, "its 8s timeout only counted its own handshake");
  });

  test("paths that already failed go behind fresh ones", () => {
    settle();
    const [busy, failing, fresh] = [uniquePath(), uniquePath(), uniquePath()];
    api.getNodeRedSocket(failing);
    latest(failing).serverDrop();
    api.getNodeRedSocket(busy); // holds the handshake slot
    tick(1_000); // failing path's retry is queued behind busy
    api.getNodeRedSocket(fresh);
    latest(busy).serverOpen();
    assert.equal(socketsFor(fresh).length, 1, "fresh path went first");
    assert.equal(socketsFor(failing).length, 1, "failing path still waiting");
    latest(fresh).serverOpen();
    assert.equal(socketsFor(failing).length, 2);
  });

  test("calling getNodeRedSocket twice reuses one connection and merges handlers", () => {
    settle();
    const path = uniquePath();
    const opened: string[] = [];
    api.getNodeRedSocket(path, { onopen: () => opened.push("open") });
    api.getNodeRedSocket(path, { onmessage: () => opened.push("msg") });
    assert.equal(socketsFor(path).length, 1);
    latest(path).serverOpen();
    latest(path).onmessage?.({ data: "{}" });
    assert.deepEqual(opened, ["open", "msg"]);
    api.closeNodeRedSocket(path);
  });

  test("gives up on a hung connect after 8s and retries", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    const first = latest(path);
    tick(8_000);
    assert.equal(first.onopen, null, "hung socket is detached");
    tick(1_000);
    assert.equal(socketsFor(path).length, 2, "retried after the first backoff step");
    api.closeNodeRedSocket(path);
  });
});

describe("reconnect", () => {
  test("backs off 1s × 1.5ⁿ, capped at 30s, and resets after a successful open", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    const delays: number[] = [];
    for (let i = 0; i < 12; i++) {
      latest(path).serverDrop();
      const before = socketsFor(path).length;
      let waited = 0;
      while (socketsFor(path).length === before) {
        assert.ok(waited <= 31_000, `no reconnect after ${waited}ms`);
        tick(50);
        waited += 50;
      }
      delays.push(waited);
    }
    assert.deepEqual(delays.slice(0, 4), [1000, 1500, 2250, 3400]);
    assert.ok(delays.every((d) => d <= 30_050), `capped: ${delays}`);
    latest(path).serverOpen();
    latest(path).serverDrop();
    tick(1_000);
    assert.equal(latest(path).readyState, FakeWebSocket.CONNECTING, "back to the 1s step after an open");
    api.closeNodeRedSocket(path);
  });

  test("'online' reconnects immediately instead of waiting out the backoff", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    latest(path).serverDrop();
    const count = socketsFor(path).length;
    win.dispatchEvent(new Event("online"));
    tick(50);
    assert.equal(socketsFor(path).length, count + 1, "reconnected within one connect slot, not after the 1s backoff");
    api.closeNodeRedSocket(path);
  });

  test("a hidden tab waits; becoming visible reconnects", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    latest(path).serverDrop();
    const count = socketsFor(path).length;
    doc.visibilityState = "hidden";
    win.dispatchEvent(new Event("online"));
    tick(50);
    assert.equal(socketsFor(path).length, count, "no reconnect while hidden");
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    tick(50);
    assert.equal(socketsFor(path).length, count + 1);
    api.closeNodeRedSocket(path);
  });

  test("wake events leave open sockets alone", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    latest(path).serverOpen();
    win.dispatchEvent(new Event("online"));
    tick(0);
    assert.equal(socketsFor(path).length, 1);
    api.closeNodeRedSocket(path);
  });
});

describe("send queue", () => {
  test("sends straight away when open", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    latest(path).serverOpen();
    assert.equal(api.sendNodeRedMessage(path, { a: 1 }), true);
    assert.deepEqual(latest(path).sent, [{ a: 1 }]);
    api.closeNodeRedSocket(path);
  });

  test("queues while connecting and flushes in order on open, before onopen runs", () => {
    settle();
    const path = uniquePath();
    const seenAtOpen: unknown[][] = [];
    api.getNodeRedSocket(path, { onopen: () => seenAtOpen.push([...latest(path).sent]) });
    assert.equal(api.sendNodeRedMessage(path, { n: 1 }), false);
    api.sendNodeRedMessage(path, { n: 2 });
    latest(path).serverOpen();
    assert.deepEqual(latest(path).sent, [{ n: 1 }, { n: 2 }]);
    assert.deepEqual(seenAtOpen, [[{ n: 1 }, { n: 2 }]]);
    api.closeNodeRedSocket(path);
  });

  test("drops queued messages older than MAX_QUEUE_AGE_MS (no stale commands)", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    api.sendNodeRedMessage(path, { command: "stale" });
    tick(api.MAX_QUEUE_AGE_MS - 1_000);
    latest(path).serverDrop();
    api.sendNodeRedMessage(path, { command: "fresh" });
    tick(2_000);
    latest(path).serverOpen();
    assert.deepEqual(latest(path).sent, [{ command: "fresh" }]);
    api.closeNodeRedSocket(path);
  });

  test("caps the queue at 50, keeping the newest", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    for (let i = 0; i < 60; i++) api.sendNodeRedMessage(path, { i });
    latest(path).serverOpen();
    const sent = latest(path).sent as { i: number }[];
    assert.equal(sent.length, 50);
    assert.equal(sent[0].i, 10);
    assert.equal(sent.at(-1)!.i, 59);
    api.closeNodeRedSocket(path);
  });

  test("a failed send is queued and retried on the next open", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    latest(path).serverOpen();
    latest(path).failSend = true;
    assert.equal(api.sendNodeRedMessage(path, { retry: true }), false);
    latest(path).serverDrop();
    tick(1_000);
    latest(path).serverOpen();
    assert.deepEqual(latest(path).sent, [{ retry: true }]);
    api.closeNodeRedSocket(path);
  });

  test("sending on an unknown path opens it and delivers once connected", () => {
    settle();
    const path = uniquePath();
    api.sendNodeRedMessage(path, { hello: 1 });
    latest(path).serverOpen();
    assert.deepEqual(latest(path).sent, [{ hello: 1 }]);
    api.closeNodeRedSocket(path);
  });
});

describe("close", () => {
  test("closes an open socket, stops reconnecting and never calls handlers again", () => {
    settle();
    const path = uniquePath();
    const calls: string[] = [];
    api.getNodeRedSocket(path, { onclose: () => calls.push("close"), onmessage: () => calls.push("msg") });
    const socket = latest(path);
    socket.serverOpen();
    api.closeNodeRedSocket(path);
    assert.equal(socket.readyState, FakeWebSocket.CLOSED);
    socket.onmessage?.({ data: "{}" });
    tick(60_000);
    assert.deepEqual(calls, []);
    assert.equal(socketsFor(path).length, 1, "no reconnect after a manual close");
  });

  test("closing while queued never opens a socket", () => {
    settle();
    const [first, second] = [uniquePath(), uniquePath()];
    api.getNodeRedSocket(first);
    api.getNodeRedSocket(second);
    api.closeNodeRedSocket(second);
    latest(first).serverOpen();
    tick(1_000);
    assert.equal(socketsFor(second).length, 0);
  });

  test("closing mid-handshake cancels it and frees the slot for the next path", () => {
    settle();
    const [first, second] = [uniquePath(), uniquePath()];
    api.getNodeRedSocket(first);
    api.getNodeRedSocket(second);
    const handshake = latest(first);
    api.closeNodeRedSocket(first);
    assert.equal(handshake.readyState, FakeWebSocket.CLOSED, "in-flight handshake cancelled");
    assert.equal(socketsFor(second).length, 1, "next path started immediately");
  });

  test("closing during backoff cancels the pending reconnect", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    latest(path).serverDrop();
    api.closeNodeRedSocket(path);
    tick(60_000);
    assert.equal(socketsFor(path).length, 1);
  });

  test("close then re-open (React StrictMode remount) gives a fresh working socket", () => {
    settle();
    const path = uniquePath();
    api.getNodeRedSocket(path);
    api.closeNodeRedSocket(path);
    api.getNodeRedSocket(path);
    tick(100);
    const socket = latest(path);
    socket.serverOpen();
    assert.equal(api.sendNodeRedMessage(path, { ok: 1 }), true);
    assert.deepEqual(socket.sent, [{ ok: 1 }]);
    api.closeNodeRedSocket(path);
  });

  test("closing an unknown path is a no-op", () => assert.doesNotThrow(() => api.closeNodeRedSocket("/ws/never")));
});
