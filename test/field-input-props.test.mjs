// What a renderer is told about a field before anyone types in it.
//
// The library's first claim is that a renderer knows what a field accepts
// without asking the validator, and `inputProps` is the one place that claim
// is externally checkable: it either comes out of the binding as attributes on
// an element, or it does not. So these tests read the bag rather than the
// source — the id three elements address each other by, the `type` the
// descriptor implies, what a screen reader is handed, and the two kinds of
// field a text-input-shaped bag used to get wrong.
//
// The number transients are pinned by calling the emitted `onChange` directly
// rather than by typing into a node. jsdom sanitises an `<input type=number>`
// the way a browser does, so "1." and "-" never reach the handler through it —
// and it is the handler, not the node, that decides what the cell holds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.Node = dom.window.Node;
try {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  // A navigator already provided by the host is fine.
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { z } = await import("zod");
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { zodFormResolver } = await import("@maroonedog/form-contract/resolver-zod");
const { createForm } = await import("@maroonedog/form-contract/core");
const {
  buildInputProps,
  fieldElementIds,
  inputTypeFor,
  FormProvider,
  useField,
  useUncontrolledField,
} = await import("@maroonedog/form-contract/react");

const { act, createElement: h, Fragment } = React;

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

// ---------------------------------------------------------------------------
// The same bag, on the screen.
// ---------------------------------------------------------------------------

const SCHEMA = z.object({
  owner: z.object({
    name: z
      .string()
      .min(3, "too short")
      .meta({ description: "As it appears on the card" }),
    email: z.email(),
  }),
  quantity: z.number().min(1),
  agreed: z.boolean(),
  payment: z.enum(["invoice", "card"]),
});

const DEFAULTS = {
  owner: { name: "Ada Lovelace", email: "ada@example.com" },
  quantity: 1,
  agreed: false,
  payment: "invoice",
};

const buildForm = () =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(DEFAULTS),
  });

async function render(element) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return { container, root };
}

/** A field drawn the way the library now says to draw one: four spreads. */
const WiredRow = ({ path }) => {
  const field = useField(path);
  return h(
    Fragment,
    null,
    h("label", { ...field.labelProps }, path),
    h("input", { ...field.inputProps }),
    field.descriptionProps === undefined
      ? null
      : h("p", { ...field.descriptionProps }, field.descriptor?.description),
    h(
      "p",
      { ...field.errorProps },
      field.issues.map((issue) => issue.message).join(" ")
    )
  );
};

test("the label, the description and the error all address the input", async () => {
  const form = buildForm();
  const { container, root } = await render(
    h(FormProvider, { form }, h(WiredRow, { path: "owner.name" }))
  );

  const input = container.querySelector("input");
  const label = container.querySelector("label");
  const paragraphs = container.querySelectorAll("p");

  assert.notEqual(input.id, "");
  assert.equal(label.htmlFor, input.id);
  assert.equal(paragraphs[0].id, `${input.id}-description`);
  assert.equal(paragraphs[1].id, `${input.id}-error`);
  assert.equal(paragraphs[1].getAttribute("role"), "alert");
  assert.equal(
    input.getAttribute("aria-describedby"),
    paragraphs[0].id,
    "a clean field points only at its description"
  );
  assert.equal(input.getAttribute("aria-invalid"), null);
  assert.equal(input.getAttribute("type"), "text");
  assert.equal(input.getAttribute("minlength"), "3");
  root.unmount();
});

test("an issue adds the error id to what the input points at", async () => {
  const form = buildForm();
  const { container, root } = await render(
    h(FormProvider, { form }, h(WiredRow, { path: "owner.name" }))
  );
  const input = container.querySelector("input");

  await act(async () => form.field("owner.name").setValue("ab"));

  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(
    input.getAttribute("aria-describedby"),
    `${input.id}-description ${input.id}-error`
  );
  root.unmount();
});

test("two forms on one page do not give two inputs the same id", async () => {
  const first = buildForm();
  const second = buildForm();
  const { container, root } = await render(
    h(
      Fragment,
      null,
      h(FormProvider, { form: first }, h(WiredRow, { path: "owner.name" })),
      h(FormProvider, { form: second }, h(WiredRow, { path: "owner.name" }))
    )
  );

  const inputs = container.querySelectorAll("input");
  const labels = container.querySelectorAll("label");
  assert.notEqual(inputs[0].id, inputs[1].id);
  assert.equal(labels[0].htmlFor, inputs[0].id);
  assert.equal(labels[1].htmlFor, inputs[1].id);
  root.unmount();
});

test("a declared format reaches the DOM as the type", async () => {
  const form = buildForm();
  const { container, root } = await render(
    h(FormProvider, { form }, h(WiredRow, { path: "owner.email" }))
  );
  assert.equal(container.querySelector("input").getAttribute("type"), "email");
  root.unmount();
});

test("a checkbox spread from the binding actually toggles the cell", async () => {
  const form = buildForm();
  const { container, root } = await render(
    h(FormProvider, { form }, h(WiredRow, { path: "agreed" }))
  );
  const input = container.querySelector("input");
  assert.equal(input.getAttribute("type"), "checkbox");
  assert.equal(input.checked, false);

  await act(async () => input.click());
  assert.equal(form.field("agreed").sources.value.read(), true);

  await act(async () => input.click());
  assert.equal(form.field("agreed").sources.value.read(), false);
  root.unmount();
});

test("a number spread from the binding writes a number, not a string", async () => {
  const form = buildForm();
  let bag;
  const Row = () => {
    bag = useField("quantity").inputProps;
    return h("input", { ...bag });
  };
  const { container, root } = await render(h(FormProvider, { form }, h(Row)));
  assert.equal(container.querySelector("input").getAttribute("type"), "number");

  await act(async () => bag.onChange({ target: { value: "12" } }));

  assert.equal(form.field("quantity").sources.value.read(), 12);
  assert.deepEqual(form.field("quantity").sources.issues.read(), []);
  root.unmount();
});

test("a select spread from the binding writes the declared choice", async () => {
  const form = buildForm();
  const Row = () => {
    const field = useField("payment");
    return h(
      "select",
      { ...field.inputProps },
      (field.descriptor?.choices ?? []).map((choice) =>
        h(
          "option",
          { key: String(choice.value), value: String(choice.value) },
          choice.label
        )
      )
    );
  };
  const { container, root } = await render(h(FormProvider, { form }, h(Row)));

  const select = container.querySelector("select");
  assert.equal(select.hasAttribute("type"), false);
  assert.equal(select.options.length, 2);

  await act(async () => {
    select.value = "card";
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  assert.equal(form.field("payment").sources.value.read(), "card");
  root.unmount();
});

// ---------------------------------------------------------------------------
// The uncontrolled binding, which used to return no props at all.
// ---------------------------------------------------------------------------

test("the uncontrolled bag carries the descriptor, and is spreadable", async () => {
  const form = buildForm();
  const Row = () => {
    const field = useUncontrolledField("owner.name");
    return h(
      Fragment,
      null,
      h("label", { ...field.labelProps }, "name"),
      h("input", { ...field.inputProps })
    );
  };
  const { container, root } = await render(h(FormProvider, { form }, h(Row)));

  const input = container.querySelector("input");
  assert.equal(input.value, "Ada Lovelace", "the node still starts from the cell");
  assert.equal(input.getAttribute("type"), "text");
  assert.equal(input.getAttribute("minlength"), "3");
  assert.equal(input.getAttribute("name"), "owner.name");
  assert.equal(container.querySelector("label").htmlFor, input.id);
  assert.equal(
    input.getAttribute("aria-describedby"),
    `${input.id}-description`
  );

  await act(async () => form.field("owner.name").setValue("ab"));
  assert.equal(input.getAttribute("aria-invalid"), "true");
  root.unmount();
});

test("an uncontrolled checkbox is checked rather than defaulted to a string", async () => {
  const form = buildForm();
  const Row = () => {
    const field = useUncontrolledField("agreed");
    return h("input", { ...field.inputProps });
  };
  const { container, root } = await render(h(FormProvider, { form }, h(Row)));

  const input = container.querySelector("input");
  assert.equal(input.getAttribute("type"), "checkbox");
  assert.equal(input.checked, false);

  await act(async () => input.click());
  assert.equal(form.field("agreed").sources.value.read(), true);

  // And a write from outside still reaches the node without a render.
  await act(async () => form.field("agreed").setValue(false));
  assert.equal(input.checked, false);
  root.unmount();
});
