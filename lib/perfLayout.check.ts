import assert from "node:assert/strict";
import { DashboardLayout } from "./perfLayout.ts";

const layouts = { "group-root": { "panel-dashboard": 70, "panel-data": 30 } };

assert.deepEqual(DashboardLayout.parse(encodeURIComponent(JSON.stringify(layouts))), layouts);
assert.deepEqual(DashboardLayout.parse(JSON.stringify({ ok: { a: 50 }, bad: { a: "50" }, worse: 3 })), { ok: { a: 50 } });
assert.deepEqual(DashboardLayout.parse("%7Bnot-json"), {});
assert.deepEqual(DashboardLayout.parse(undefined), {});

console.log("layout checks passed");
