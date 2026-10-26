import assert from "node:assert/strict";
import { SESSION_TTL_SECONDS, createSessionToken, readSessionToken } from "./session.ts";

const now = Date.now();
const token = await createSessionToken(now);

assert.equal((await readSessionToken(token, now))?.role, "viewer");
assert.equal(await readSessionToken(token, now + SESSION_TTL_SECONDS * 1000 + 1), null);
assert.equal(await readSessionToken(`${token.split(".")[0]}x.${token.split(".")[1]}`, now), null);
assert.equal(await readSessionToken(`${token}x`, now), null);
assert.equal(await readSessionToken("garbage", now), null);
assert.equal(await readSessionToken(undefined, now), null);

console.log("session checks passed");
