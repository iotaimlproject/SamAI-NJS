import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { applyPerfMessages, commandTopic, decodeFrame, mergePatch, parseTopic, toPanelPatch, type MachineStore } from "./perfTelemetry.ts";
import { EMPTY_DASHBOARD } from "./perfTypes.ts";

describe("toPanelPatch: envelopes", () => {
  test("reads {device, value}", () => assert.deepEqual(toPanelPatch({ device: "oee", value: { availability: 92 } }), { availability: 92 }));
  test("reads {type, payload}", () => assert.deepEqual(toPanelPatch({ type: "x", payload: { plc: "S7" } }), { plc: "S7" }));
  test("reads a top-level object", () => assert.deepEqual(toPanelPatch({ plc: "S7" }), { plc: "S7" }));
  test("parses a JSON string message", () => assert.deepEqual(toPanelPatch(JSON.stringify({ value: { batchId: "B1" } })), { batchId: "B1" }));
  test("parses a JSON string payload", () => assert.deepEqual(toPanelPatch({ payload: JSON.stringify({ plc: "S7" }) }), { plc: "S7" }));
  test("keeps optional fields", () => assert.deepEqual(toPanelPatch({ value: { customerId: "C9", operatorId: "O1" } }), { customerId: "C9", operatorId: "O1" }));
  test("maps telemetry aliases", () =>
    assert.deepEqual(toPanelPatch({ device: "telemetry", value: { qtyReq: "7", produced: 5, rmQty: 2, badParts: 1, perPart: 2500 } }), {
      productionQuantity: 7,
      partsProduced: 5,
      rawMaterials: 2,
      rejectedParts: 1,
      cycleTime: 2500,
    }));
});

describe("toPanelPatch: bad input never throws, returns null when nothing usable", () => {
  for (const [name, input] of [
    ["invalid JSON", "{not json"],
    ["plain text", "hello"],
    ["empty string", ""],
    ["number", 42],
    ["null", null],
    ["undefined", undefined],
    ["array message", [1, 2]],
    ["array value", { value: [1, 2] }],
    ["unknown keys only", { value: { junk: 1, other: "x" } }],
    ["null field", { value: { oee: null } }],
    ["binary-like object", new Uint8Array([1, 2, 3])],
  ] as const) {
    test(name, () => assert.equal(toPanelPatch(input), null));
  }
  test("ignores __proto__ / constructor keys", () => {
    const patch = toPanelPatch('{"value":{"__proto__":{"polluted":1},"constructor":"x","plc":"S7"}}');
    assert.deepEqual(patch, { plc: "S7" });
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
  });
});

describe("toPanelPatch: coerces to the field's default type", () => {
  test("numeric strings become numbers", () => assert.deepEqual(toPanelPatch({ value: { availability: "92.5", confidence: " 88 " } }), { availability: 92.5, confidence: 88 }));
  test("non-numeric / non-finite numbers are dropped", () => assert.equal(toPanelPatch({ value: { availability: "abc", oee: Infinity, quality: NaN, performance: "" } }), null));
  test("numbers become strings for string fields", () => assert.deepEqual(toPanelPatch({ value: { batchId: 42, plc: true } }), { batchId: "42" }));
  test("booleans only accept booleans", () => assert.deepEqual(toPanelPatch({ value: { power: "true", led: 1, production: true } }), { production: true }));
  test("arrays reject non-arrays", () => assert.equal(toPanelPatch({ value: { alerts: { level: "x" }, energy: "x", batches: 3 } }), null));
  test("object arrays drop non-object items", () =>
    assert.deepEqual(toPanelPatch({ value: { alerts: [null, "x", 3, [1], { level: "warn", text: "ok" }] } }), { alerts: [{ level: "warn", text: "ok" }] }));
  test("machine status booleans", () => assert.deepEqual(toPanelPatch({ power: true, led: false, production: "yes", stop: 1 }), { power: true, led: false }));
  test("empty arrays are kept (clears a panel)", () => assert.deepEqual(toPanelPatch({ value: { alerts: [] } }), { alerts: [] }));
});

describe("mergePatch", () => {
  test("first patch fills over EMPTY_DASHBOARD", () => {
    const next = mergePatch(null, { oee: 50 });
    assert.equal(next.oee, 50);
    assert.equal(next.availability, 0);
    assert.deepEqual(next.alerts, []);
  });
  test("returns the same object when nothing changed (no re-render)", () => {
    const first = mergePatch(null, { oee: 50, plc: "S7" });
    assert.equal(mergePatch(first, { oee: 50, plc: "S7" }), first);
    assert.equal(mergePatch(first, {}), first);
  });
  test("returns a new object when a value changed", () => {
    const first = mergePatch(null, { oee: 50 });
    const second = mergePatch(first, { oee: 51 });
    assert.notEqual(second, first);
    assert.equal(second.oee, 51);
    assert.equal(first.oee, 50, "previous state is not mutated");
  });
  test("keeps other panels' fields", () => {
    const first = mergePatch(null, { plc: "S7", batchId: "B1" });
    assert.deepEqual([mergePatch(first, { oee: 9 }).plc, mergePatch(first, { oee: 9 }).batchId], ["S7", "B1"]);
  });
  test("does not mutate EMPTY_DASHBOARD", () => {
    mergePatch(null, { oee: 99, alerts: [{ level: "x", text: "y" }] });
    assert.equal(EMPTY_DASHBOARD.oee, 0);
    assert.deepEqual(EMPTY_DASHBOARD.alerts, []);
  });
});

describe("topics", () => {
  test("parseTopic reads perf/<machine>/<panel>", () => assert.deepEqual(parseTopic("perf/CNC-02/oee"), { machine: "CNC-02", panel: "oee" }));
  test("parseTopic reads perf/<machine>/<panel>/<field>", () =>
    assert.deepEqual(parseTopic("perf/CNC-02/oee/availability"), { machine: "CNC-02", panel: "oee", field: "availability" }));
  for (const bad of ["perf/CNC-01", "perf/CNC-01/oee/a/b", "other/CNC-01/oee", "perf//oee", "perf/CNC-01/", "perf/CNC-01/oee/", ""]) {
    test(`parseTopic rejects "${bad}"`, () => assert.equal(parseTopic(bad), null));
  }
  test("commandTopic", () => assert.equal(commandTopic("CNC-01"), "perf/CNC-01/cmd"));
});

describe("decodeFrame", () => {
  test("single publish", () =>
    assert.deepEqual(decodeFrame('{"topic":"perf/CNC-01/oee","payload":{"oee":70}}'), [{ topic: "perf/CNC-01/oee", payload: { oee: 70 } }]));
  test("snapshot keeps valid entries only", () =>
    assert.deepEqual(
      decodeFrame({ type: "snapshot", messages: [{ topic: "perf/A/oee", payload: { oee: 1 } }, null, { payload: {} }, "x", { topic: 5 }] }),
      [{ topic: "perf/A/oee", payload: { oee: 1 } }],
    ));
  for (const [name, input] of [["invalid JSON", "{x"], ["no topic", { payload: {} }], ["snapshot without list", { type: "snapshot" }], ["number", 3], ["null", null]] as const) {
    test(`returns [] for ${name}`, () => assert.deepEqual(decodeFrame(input), []));
  }
});

describe("applyPerfMessages", () => {
  const empty: MachineStore = {};
  test("routes each topic to its machine and keeps machines separate", () => {
    const store = applyPerfMessages(empty, [
      { topic: "perf/CNC-01/oee", payload: { oee: 70 } },
      { topic: "perf/CNC-02/oee", payload: { oee: 40 } },
      { topic: "perf/CNC-02/machine", payload: { power: true, led: true } },
    ]);
    assert.deepEqual(Object.keys(store).sort(), ["CNC-01", "CNC-02"]);
    assert.equal(store["CNC-01"].oee, 70);
    assert.equal(store["CNC-01"].power, false);
    assert.equal(store["CNC-02"].oee, 40);
    assert.equal(store["CNC-02"].power, true);
  });
  test("merges panels of one machine", () => {
    const store = applyPerfMessages(empty, [{ topic: "perf/A/oee", payload: { oee: 1 } }, { topic: "perf/A/header", payload: { plc: "S7" } }]);
    assert.deepEqual([store.A.oee, store.A.plc], [1, "S7"]);
  });
  test("later message wins within one batch", () => {
    const store = applyPerfMessages(empty, [{ topic: "perf/A/oee", payload: { oee: 1 } }, { topic: "perf/A/oee", payload: { oee: 2 } }]);
    assert.equal(store.A.oee, 2);
  });
  test("returns the same store when nothing changed (no re-render)", () => {
    const store = applyPerfMessages(empty, [{ topic: "perf/A/oee", payload: { oee: 1 } }]);
    assert.equal(applyPerfMessages(store, [{ topic: "perf/A/oee", payload: { oee: 1 } }]), store);
    assert.equal(applyPerfMessages(store, []), store);
  });
  test("an update to one machine leaves the other machine's object untouched", () => {
    const store = applyPerfMessages(empty, [{ topic: "perf/A/oee", payload: { oee: 1 } }, { topic: "perf/B/oee", payload: { oee: 2 } }]);
    const next = applyPerfMessages(store, [{ topic: "perf/A/oee", payload: { oee: 3 } }]);
    assert.notEqual(next, store);
    assert.equal(next.B, store.B);
    assert.equal(store.A.oee, 1, "previous store not mutated");
  });
  test("ignores commands, bad topics and unusable payloads", () => {
    const messages = [
      { topic: "perf/A/cmd", payload: { oee: 9 } },
      { topic: "perf/A", payload: { oee: 9 } },
      { topic: "perf/A/oee", payload: "junk" },
      { topic: "perf/A/oee", payload: { nothing: 1 } },
    ];
    assert.equal(applyPerfMessages(empty, messages), empty);
  });
  test("per-field topics set one field each (MQTT style)", () => {
    const store = applyPerfMessages(empty, [
      { topic: "perf/CNC-02/oee/availability", payload: 61 },
      { topic: "perf/CNC-02/header/plc", payload: "S7-1200" },
      { topic: "perf/CNC-02/alerts/alerts", payload: [{ level: "error", text: "hot" }] },
      { topic: "perf/CNC-02/machine/power", payload: true },
    ]);
    assert.deepEqual([store["CNC-02"].availability, store["CNC-02"].plc, store["CNC-02"].alerts.length, store["CNC-02"].power], [61, "S7-1200", 1, true]);
  });
  test("per-field payloads may be raw JSON strings (as from a broker)", () => {
    const store = applyPerfMessages(empty, [
      { topic: "perf/A/oee/oee", payload: "69.5" },
      { topic: "perf/A/header/plc", payload: '"S7"' },
      { topic: "perf/A/header/aiModel", payload: "SAM-v2" },
      { topic: "perf/A/machine/led", payload: "true" },
      { topic: "perf/A/ai/aiMaintenance", payload: '[{"label":"x","value":"y"}]' },
    ]);
    assert.deepEqual([store.A.oee, store.A.plc, store.A.aiModel, store.A.led, store.A.aiMaintenance], [69.5, "S7", "SAM-v2", true, [{ label: "x", value: "y" }]]);
  });
  test("unknown or badly typed per-field values are ignored", () => {
    assert.equal(applyPerfMessages(empty, [{ topic: "perf/A/oee/bogus", payload: 1 }, { topic: "perf/A/oee/availability", payload: "abc" }]), empty);
  });
  test("a retained snapshot replays into the same state as the live messages", () => {
    const live = applyPerfMessages(empty, [{ topic: "perf/A/oee", payload: { oee: 1 } }, { topic: "perf/A/oee", payload: { quality: 2 } }]);
    const snapshot = applyPerfMessages(empty, decodeFrame({ type: "snapshot", messages: [{ topic: "perf/A/oee", payload: { oee: 1, quality: 2 } }] }));
    assert.deepEqual(snapshot, live);
  });
});
