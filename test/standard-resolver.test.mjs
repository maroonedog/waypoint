// The resolver that makes "validator-neutral" structural rather than
// demonstrated.
//
// Before this file there were two resolvers and the neutrality claim rested on
// the fact that a second one could be written. Here both members come from
// specs this package does not own — `fields` from `~standard.jsonSchema`,
// `validate` from `~standard.validate` — so a vendor that implements them is
// supported without a file being added.
//
// This file holds the claim itself and nothing else: give the resolver a vendor
// with both members and a form contract comes out; give it one and the half
// that keeps a form honest is still there; give it one and a caller who knows
// the fields, and the other half is there too. Three inputs, one question —
// what is the adapter MADE OF — and it is the question the rest of the family
// presupposes, which is why it kept the name.
//
// The other four ask their own. What a developer is TOLD when a form comes back
// with no fields is standard-schema-warnings.test.mjs: three different causes
// share one symptom there, so the assertions are on sentences and they break
// when a message is reworded, which is correct and would be noise here. How a
// converter this package does not own gets CALLED is
// standard-converter-options.test.mjs. What an issue is permitted to arrive AS
// — the spec's one real vendor choice — is standard-issue-shapes.test.mjs. And
// whether a promise survives every hop to a settled form is
// standard-async-verdict.test.mjs, the only one that builds a running form.
//
// The hand-written validators they all share are in
// test/support/standard-schema-doubles.mjs, with the argument for why they are
// hand-written.
import { test } from "node:test";
import assert from "node:assert/strict";
import { standardFormResolver } from "@maroonedog/waypoint/resolver-standard";
import {
  bothHalves,
  validateOnly,
} from "./support/standard-schema-doubles.mjs";
import { withoutWarnings } from "./support/console-warnings.mjs";
import { pathsOf } from "./support/descriptor-lookup.mjs";

test("a validator with both halves gets descriptors and issues from the specs", () => {
  const adapter = standardFormResolver(
    bothHalves([{ message: "too short", path: ["owner", "name"] }])
  );
  assert.deepEqual(pathsOf(adapter), [
    "owner.name",
    "owner.nickname",
    "items[*].sku",
  ]);
  assert.deepEqual(adapter.fields[0], {
    path: "owner.name",
    kind: "string",
    isRequired: true,
    label: "Full name",
    constraints: { minLength: 3 },
  });
  assert.deepEqual(adapter.validate({}), [
    { path: "owner.name", message: "too short" },
  ]);
});

test("an acceptable root produces no issues", () => {
  assert.deepEqual(standardFormResolver(bothHalves()).validate({}), []);
});

test("a validator with only `~standard` still judges, and declares no fields", () => {
  // The compiler stops this call — the unary overload wants `jsonSchema` and
  // this vendor has none — so reaching it at all means JavaScript, or a cast.
  // What it must NOT do is fail: the verdict is the half that keeps a form
  // honest, and it is intact.
  const adapter = withoutWarnings(() =>
    standardFormResolver(
      validateOnly([{ message: "nope", path: ["owner", "name"] }])
    )
  );
  assert.deepEqual(adapter.fields, []);
  assert.deepEqual(adapter.validate({}), [
    { path: "owner.name", message: "nope" },
  ]);
});

test("a caller may supply the fields a validator could not describe", () => {
  const declared = [
    { path: "owner.name", kind: "string", isRequired: true, constraints: {} },
  ];
  const adapter = standardFormResolver(validateOnly(), { fields: declared });
  assert.deepEqual(adapter.fields, declared);
});
