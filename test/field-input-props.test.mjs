// What a descriptor alone decides about an input, settled before any element
// exists.
//
// `inputTypeFor` and `buildInputProps` are pure functions of a descriptor, and
// that is the library's first claim in its checkable form: a renderer is told
// what a field accepts without asking the validator and without a page. So
// this file installs no document, and the absence is the assertion rather than
// an economy. `@maroonedog/waypoint/react` imports and answers here with
// `globalThis.document` undefined; the day a prop builder starts reaching for
// a node, this file fails instead of quietly beginning to test something else.
//
// The cases that most need the bag read directly are the ones no element can
// be asked about. The number transients are pinned by calling the emitted
// `onChange` rather than by typing into a node: jsdom sanitises an
// `<input type=number>` the way a browser does, so "1." and "-" never reach
// the handler through it — and it is the handler, not the node, that decides
// what the cell holds. A field with no widget — an array, an object, a
// descriptor that is `undefined` — has no node to interrogate at all, so
// `inputTypeFor` answering `undefined` for it is a fact with nowhere else to
// be observed.
//
// The other half is field-input-props-react.test.mjs, which asks the opposite
// question: whether a bag holding the right keys survives being spread.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildInputProps,
  fieldElementIds,
  inputTypeFor,
} from "@maroonedog/waypoint/react";

// ---------------------------------------------------------------------------
// The type a descriptor implies.
// ---------------------------------------------------------------------------

const descriptorOf = (kind, extra = {}) => ({
  path: "a",
  kind,
  isRequired: false,
  constraints: {},
  ...extra,
});

const IDS = fieldElementIds("<scope>", "a");

function propsFor(descriptor, options = {}) {
  const written = options.written ?? [];
  return buildInputProps({
    path: descriptor.path,
    descriptor,
    value: options.value,
    issues: options.issues ?? [],
    ids: IDS,
    writeValue: (next) => written.push(next),
    onBlur: options.onBlur ?? (() => {}),
  });
}

test("the input type comes from the kind and the declared format", () => {
  const cases = [
    [descriptorOf("string"), "text"],
    [descriptorOf("string", { constraints: { format: "email" } }), "email"],
    [descriptorOf("string", { constraints: { format: "uri" } }), "url"],
    [descriptorOf("string", { constraints: { format: "url" } }), "url"],
    [descriptorOf("string", { constraints: { format: "kanji" } }), "text"],
    [descriptorOf("number"), "number"],
    [descriptorOf("boolean"), "checkbox"],
    [descriptorOf("date"), "date"],
    [
      descriptorOf("date", { constraints: { format: "date-time" } }),
      "datetime-local",
    ],
    [descriptorOf("date", { constraints: { format: "time" } }), "time"],
  ];
  for (const [descriptor, expected] of cases) {
    assert.equal(
      inputTypeFor(descriptor),
      expected,
      `${descriptor.kind}/${descriptor.constraints.format ?? "-"}`
    );
  }
});

test("a field nothing can name a widget for gets no type at all", () => {
  for (const kind of ["array", "object", "unknown"]) {
    assert.equal(inputTypeFor(descriptorOf(kind)), undefined, kind);
  }
  assert.equal(inputTypeFor(undefined), undefined);
});

test("a closed field gets no type, because its element is a select", () => {
  const closed = descriptorOf("string", {
    choices: [{ value: "a", label: "A" }],
    constraints: { maxLength: 4 },
  });
  assert.equal(inputTypeFor(closed), undefined);
  // And none of the attributes a select cannot carry either.
  const props = propsFor(closed, { value: "a" });
  assert.equal("type" in props, false);
  assert.equal("maxLength" in props, false);
});

// ---------------------------------------------------------------------------
// The bag, built directly, so what it holds is read rather than inferred.
// ---------------------------------------------------------------------------

test("the declared bounds still come out as attributes", () => {
  const props = propsFor(
    descriptorOf("string", {
      constraints: { minLength: 3, maxLength: 40, pattern: /^[a-z]+$/ },
    })
  );
  assert.equal(props.minLength, 3);
  assert.equal(props.maxLength, 40);
  assert.equal(props.pattern, "^[a-z]+$");
  assert.equal(props.id, IDS.inputId);
  assert.equal(props.name, "a");
});

test("aria-invalid is absent until the field carries an issue", () => {
  const clean = propsFor(descriptorOf("string"));
  assert.equal("aria-invalid" in clean, false);

  const wrong = propsFor(descriptorOf("string"), {
    issues: [{ path: "a", message: "too short" }],
  });
  assert.equal(wrong["aria-invalid"], true);
});

test("aria-describedby names the description, the error, or both", () => {
  const described = descriptorOf("string", { description: "help" });
  const issues = [{ path: "a", message: "too short" }];

  assert.equal("aria-describedby" in propsFor(descriptorOf("string")), false);
  assert.equal(propsFor(described)["aria-describedby"], IDS.descriptionId);
  assert.equal(
    propsFor(descriptorOf("string"), { issues })["aria-describedby"],
    IDS.errorId
  );
  assert.equal(
    propsFor(described, { issues })["aria-describedby"],
    `${IDS.descriptionId} ${IDS.errorId}`
  );
});

test("aria-required is never emitted, because required already is", () => {
  const props = propsFor(descriptorOf("string", { isRequired: true }));
  assert.equal(props.required, true);
  assert.equal("aria-required" in props, false);
});

// ---------------------------------------------------------------------------
// A checkbox and a number input, which are the two the old bag could not draw.
// ---------------------------------------------------------------------------

test("a boolean field is a checkbox, and carries checked rather than value", () => {
  const props = propsFor(descriptorOf("boolean"), { value: true });
  assert.equal(props.type, "checkbox");
  assert.equal(props.checked, true);
  assert.equal("value" in props, false);
});

test("a checkbox writes the boolean the box is in, not the string on it", () => {
  const written = [];
  const props = propsFor(descriptorOf("boolean"), { value: false, written });
  props.onChange({ target: { checked: true, value: "on" } });
  props.onChange({ target: { checked: false, value: "on" } });
  assert.deepEqual(written, [true, false]);
});

test("what a number field's cell holds for each thing a person types", () => {
  const written = [];
  const props = propsFor(descriptorOf("number"), { value: undefined, written });
  for (const raw of ["", "-", "1.", "1.5", "-0.5", "1e3"]) {
    props.onChange({ target: { value: raw } });
  }
  assert.deepEqual(written, [
    undefined, // an empty box is no value, not zero
    "-", // not a number yet; snapping it away would swallow the sign
    "1.", // Number("1.") is 1, and writing 1 would delete the dot
    1.5, // spells itself back exactly, so it is written as a number
    -0.5,
    "1e3", // a number JavaScript spells "1000"; it settles on blur
  ]);
});

test("a number typed in a spelling of its own settles when the field is left", () => {
  const written = [];
  let touched = 0;
  const settling = propsFor(descriptorOf("number"), {
    value: "1e3",
    written,
    onBlur: () => {
      touched += 1;
    },
  });
  settling.onBlur();
  assert.deepEqual(written, [1000]);
  assert.equal(touched, 1, "leaving the field still marks it touched");

  const standing = [];
  const stands = propsFor(descriptorOf("number"), {
    value: "-",
    written: standing,
  });
  stands.onBlur();
  assert.deepEqual(standing, [], "a lone minus is not a number and is left alone");
});

test("a closed field hands back the value the schema declared, not the string", () => {
  const written = [];
  const closed = descriptorOf("number", {
    choices: [
      { value: 1, label: "one" },
      { value: 2, label: "two" },
    ],
  });
  const props = propsFor(closed, { value: 1, written });
  props.onChange({ target: { value: "2" } });
  // The placeholder option no schema declares stays the string it is.
  props.onChange({ target: { value: "" } });
  assert.deepEqual(written, [2, ""]);
});
