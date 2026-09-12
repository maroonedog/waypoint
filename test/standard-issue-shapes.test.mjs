// The one place the spec leaves vendors a real choice, so the one place where
// "it works with the validator I installed" is not evidence.
//
// Everywhere else a conforming vendor has one way to say a thing, and a single
// real library exercising it is a fair sample. An issue is different: its path
// may be an array of PropertyKeys, or of `{ key }` objects, and nothing forbids
// a mix; a symbol is a legal PropertyKey and no form can address one; the path
// may be absent entirely, because a rule comparing two fields belongs to
// neither; a message is not guaranteed; and `code`, which every real validator
// has, is not in the spec at all.
//
// A vendor picks one point in that space on the day it is written and never
// reports the others. So the resolver is the wrong layer to be tolerant at, and
// one formatter handles the lot — no vendor resolver has to know which spelling
// it was handed, and no bug here can hide behind "our validator doesn't do
// that". Every test below is that formatter over one permitted shape at a time,
// which is why a failure names the shape it was given. The first six are a pure
// function of one path with one string out, through `pathOf`.
//
// The last two are about members other than the path, so they read the whole
// issue back instead, and they belong with the rest for the same reason — what
// an issue is permitted to ARRIVE as. A missing
// message still has to leave a renderer something to draw, and an invented
// `code` would be this package adding a member to somebody else's spec.
import { test } from "node:test";
import assert from "node:assert/strict";
import { standardFormResolver } from "@maroonedog/waypoint/resolver-standard";
import { bothHalves } from "./support/standard-schema-doubles.mjs";

const pathOf = (path) =>
  standardFormResolver(bothHalves([{ message: "m", path }])).validate({})[0]
    .path;

test("an issue inside an array names the real index, not the wildcard", () => {
  assert.equal(pathOf(["items", 2, "sku"]), "items[2].sku");
});

test("a nested issue is addressed with dots", () => {
  assert.equal(pathOf(["owner", "name"]), "owner.name");
});

test("the object spelling of a path segment is unwrapped", () => {
  // The spec permits `{ key }` objects as well as bare keys, and vendors
  // differ. One formatter handles both, so no resolver has to know which it
  // was handed.
  assert.equal(
    pathOf([{ key: "items" }, { key: 2 }, { key: "sku" }]),
    "items[2].sku"
  );
  assert.equal(pathOf([{ key: "owner" }, { key: "name" }]), "owner.name");
});

test("the two spellings may be mixed in one path", () => {
  assert.equal(pathOf(["items", { key: 0 }, "sku"]), "items[0].sku");
});

test("an issue with no path lands on the root rather than throwing", () => {
  // A rule comparing two fields can report against neither.
  assert.equal(pathOf(undefined), "");
});

test("a symbol segment is dropped rather than stringified", () => {
  // It cannot be spelled in a path a form addresses, and `Symbol(x)` in one
  // would name a field that does not exist.
  assert.equal(pathOf(["owner", Symbol("hidden"), "name"]), "owner.name");
});

test("an issue with no message still says something a renderer can draw", () => {
  const [issue] = standardFormResolver(
    bothHalves([{ path: ["owner", "name"] }])
  ).validate({});
  assert.equal(issue.path, "owner.name");
  assert.equal(typeof issue.message, "string");
  assert.notEqual(issue.message, "");
});

test("no code is invented, because the spec has no member for one", () => {
  const [issue] = standardFormResolver(
    bothHalves([{ message: "m", path: ["owner", "name"], code: "too_small" }])
  ).validate({});
  assert.equal("code" in issue, false);
  assert.deepEqual(Object.keys(issue).sort(), ["message", "path"]);
});
