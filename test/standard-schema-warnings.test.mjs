// Three different bugs wearing the same symptom, separated by the only thing
// that can separate them.
//
// A form that draws nothing has one appearance and several causes: the vendor
// declares no JSON Schema at all, or it declares one and produces an empty
// document, or its converter threw on the way. Each has a different fix — cast
// and supply the fields, look at the schema, pass the vendor option that gets
// past the unrepresentable type — and a test asserting `fields.length === 0`
// passes for all three while telling a developer which one it was: nothing.
//
// So the assertions here are on SENTENCES. That makes this the one file in the
// family that breaks when a message is reworded, and that is not brittleness to
// be engineered away — the sentence IS the output of this code path. There is
// no value to inspect, no document to diff, nothing on screen. It is also the
// only part of this package a developer reads with no form rendered in front of
// them, which is the moment it has to name the member that is missing rather
// than describe a mood.
//
// One fact the tests below lean on lives elsewhere, deliberately: that the
// signal is said once per vendor and state makes the whole file order-dependent
// unless every capture clears the memo first, and the capture in
// test/support/console-warnings.mjs does, and argues why.
//
// A second one used to. "identical reasons from both targets are said once" has
// two targets to deduplicate only because a refused draft-2020-12 is retried as
// draft-07, and that was established in standard-converter-options.test.mjs and
// nowhere here, which left the test unreadable on its own. It now asserts the
// two asks itself, from the double that records them. The retry is still that
// other file's subject — what it costs, and why it is draft-07 — and this one
// only needs to know it happened.
import { test } from "node:test";
import assert from "node:assert/strict";
import { standardFormResolver } from "@maroonedog/waypoint/resolver-standard";
import {
  bothHalves,
  validateOnly,
} from "./support/standard-schema-doubles.mjs";
import { capturedWarnings } from "./support/console-warnings.mjs";

test("declaring no JSON Schema is distinguishable from declaring an empty one", () => {
  // This is the distinction the change exists to make. Both end with no
  // fields; they are different bugs with different fixes, so they get
  // different sentences.
  const [undeclared] = capturedWarnings(() =>
    standardFormResolver(validateOnly())
  );
  const [empty] = capturedWarnings(() =>
    standardFormResolver({
      "~standard": {
        version: 1,
        vendor: "empty-vendor",
        validate: () => ({ value: {} }),
        jsonSchema: { input: () => ({ type: "object", properties: {} }) },
      },
    })
  );

  assert.match(undeclared, /declares no JSON Schema/);
  assert.match(empty, /produced a JSON Schema with no fields in it/);
  assert.notEqual(undeclared, empty);
  for (const line of [undeclared, empty]) {
    assert.match(line, /validate correctly and draw nothing/);
  }
});

test("a converter that throws is reported with the reason it gave", () => {
  const [line] = capturedWarnings(() =>
    standardFormResolver(bothHalves([], { throws: "Date cannot be represented" }))
  );
  assert.match(line, /"example"/);
  assert.match(line, /could not produce one: Date cannot be represented/);
  // The escape hatch is named, because the option is vendor-specific and a
  // reader who does not know it exists cannot go looking for it.
  assert.match(line, /libraryOptions/);
});

test("identical reasons from both targets are said once", () => {
  const schema = bothHalves([], { throws: "the same problem" });
  const [line] = capturedWarnings(() => standardFormResolver(schema));

  // The premise is asserted beside the conclusion that rests on it: there is
  // something to deduplicate only because the converter was asked twice, and a
  // reader of this test cannot take that on trust from another file. WHY the
  // second ask happens, and why draft-07, is standard-converter-options.test.mjs.
  assert.deepEqual(schema.asked, ["draft-2020-12", "draft-07"]);
  assert.equal(line.match(/the same problem/g).length, 1);
});

test("the signal does not fire when a document was produced", () => {
  assert.deepEqual(
    capturedWarnings(() => standardFormResolver(bothHalves())),
    []
  );
});

test("the signal does not fire when the caller supplied the fields", () => {
  // A caller who states the fields has answered the question the warning asks.
  assert.deepEqual(
    capturedWarnings(() =>
      standardFormResolver(validateOnly(), {
        fields: [
          { path: "name", kind: "string", isRequired: true, constraints: {} },
        ],
      })
    ),
    []
  );
});

test("the signal is said once per vendor and state, not once per form", () => {
  const lines = capturedWarnings(() => {
    standardFormResolver(validateOnly());
    standardFormResolver(validateOnly());
    standardFormResolver(validateOnly());
  });
  assert.equal(lines.length, 1);
});
