// `kind: "file"` — the one input React cannot control.
//
// Two claims, and they are separate. The first is about the DESCRIPTION: a
// binary string in a JSON Schema document is a file, which is a fact about the
// format and not about zod, so it reaches every vendor that answers
// `~standard.jsonSchema` through one walk. The second is about the WIDGET: a
// file input carries neither `value` nor `checked`, and a descriptor that said
// `kind: "string"` would have been drawn by the branch that writes
// `String(value)` — `"[object File]"` — onto the element.
//
// The byte bounds are pinned too, because dropping them is the other half of
// why this is a kind. `z.file().min(100)` emits `minLength: 100` and those are
// BYTES, where this contract's `minLength` is characters or elements.
//
// It does NOT import support/dom.mjs, and the reason is worth a line because
// the import would work. Nothing here renders: these tests read descriptors
// and prop bags, and the jsdom below exists to borrow one constructor, `File`,
// which the assertions need a real instance of. Installing a document, a
// window and an act environment on top of that would dress a description test
// up as a DOM test, and the next reader would go looking for the render.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
globalThis.File = dom.window.File;

const { z } = await import("zod");
const { zodFormResolver } = await import(
  "@maroonedog/waypoint/resolver-zod"
);
const { standardFormResolver } = await import(
  "@maroonedog/waypoint/resolver-standard"
);
const { buildInputProps, inputTypeFor } = await import(
  "@maroonedog/waypoint/react"
);

const SCHEMA = z.object({
  avatar: z.file(),
  bounded: z.file().min(100).max(5000),
  note: z.string().min(3),
});

const fieldsOf = (schema) =>
  Object.fromEntries(
    zodFormResolver(schema).fields.map((field) => [field.path, field])
  );

const IDS = {
  inputId: "i",
  labelId: "l",
  descriptionId: "d",
  errorId: "e",
};

test("a zod file field is described as a file, not as a text box", () => {
  const fields = fieldsOf(SCHEMA);
  assert.equal(fields["avatar"].kind, "file");
  assert.equal(fields["note"].kind, "string", "nothing else moved");
});

test("the byte bounds do not survive into the descriptor", () => {
  const { bounded } = fieldsOf(SCHEMA);
  assert.equal(bounded.kind, "file");
  assert.equal(
    "minLength" in bounded.constraints,
    false,
    "minLength here means characters or elements, and zod wrote bytes"
  );
  assert.equal("maxLength" in bounded.constraints, false);
});

test("a plain string keeps its length bounds, so the drop is not a blanket one", () => {
  const fields = fieldsOf(z.object({ note: z.string().min(3).max(9) }));
  assert.equal(fields["note"].constraints.minLength, 3);
  assert.equal(fields["note"].constraints.maxLength, 9);
});

test("it is read off the FORMAT, so a hand-written document gets it too", () => {
  // No vendor anywhere in this: the two spellings a document may carry, read
  // one at a time to prove neither is load-bearing on the other.
  const describe = (property) =>
    standardFormResolver({
      "~standard": {
        version: 1,
        vendor: "no-vendor-at-all",
        validate: () => ({ value: {} }),
        jsonSchema: {
          input: () => ({
            type: "object",
            properties: { upload: property },
            required: ["upload"],
          }),
        },
      },
    }).fields[0];

  assert.equal(
    describe({ type: "string", format: "binary" }).kind,
    "file",
    "OpenAPI's spelling"
  );
  assert.equal(
    describe({ type: "string", contentEncoding: "binary" }).kind,
    "file",
    "2020-12's spelling"
  );
  assert.equal(
    describe({ type: "string", format: "email" }).kind,
    "string",
    "another format is still a string"
  );
});

test("its inputProps carry type=file and neither value nor checked", () => {
  const { avatar } = fieldsOf(SCHEMA);
  assert.equal(inputTypeFor(avatar), "file");

  const props = buildInputProps({
    path: "avatar",
    descriptor: avatar,
    value: undefined,
    issues: [],
    ids: IDS,
    writeValue: () => {},
    onBlur: () => {},
  });
  assert.equal(props.type, "file");
  assert.equal("value" in props, false, "a file input cannot be controlled");
  assert.equal("checked" in props, false);
  assert.equal(props.required, true);
});

test("a File in the cell is never coerced onto the element", () => {
  const { avatar } = fieldsOf(SCHEMA);
  const props = buildInputProps({
    path: "avatar",
    descriptor: avatar,
    value: new globalThis.File(["hello"], "photo.png"),
    issues: [],
    ids: IDS,
    writeValue: () => {},
    onBlur: () => {},
  });
  // The defect this branch exists to prevent, stated as the thing not present.
  assert.equal("value" in props, false);
  assert.equal(JSON.stringify(props).includes("[object File]"), false);
});

test("its onChange writes the picked File, and an empty pick clears the cell", () => {
  const { avatar } = fieldsOf(SCHEMA);
  const written = [];
  const props = buildInputProps({
    path: "avatar",
    descriptor: avatar,
    value: undefined,
    issues: [],
    ids: IDS,
    writeValue: (next) => written.push(next),
    onBlur: () => {},
  });

  const picked = new globalThis.File(["hello"], "photo.png");
  props.onChange({ target: { value: "C:\\fakepath\\photo.png", files: [picked] } });
  assert.equal(written[0], picked, "the File itself, not the fake path");

  props.onChange({ target: { value: "", files: [] } });
  assert.equal(written[1], undefined, "clearing the chooser clears the cell");
});
