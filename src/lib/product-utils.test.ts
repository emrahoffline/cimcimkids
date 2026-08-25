import assert from "node:assert/strict";
import { roundLira } from "./product-utils";

assert.equal(roundLira(415.2), 415);
assert.equal(roundLira(415.5), 416);
assert.equal(roundLira(519 * 0.8), 415);
assert.equal(roundLira("99.4"), 99);
assert.equal(roundLira(-3), 0);
assert.equal(roundLira("abc", 10), 10);

console.log("product-utils tests passed");
