// The second resolver, which is the point: the contract claimed to be
// validator-neutral and had exactly one implementation, so the claim was a
// design intention rather than a demonstrated one.
//
// luq reaches the contract by a different road from zod's. zod is walked
// directly; luq is asked for a JSON Schema and the schema is walked, so this
// file is also a check that the contract's two members are wide enough for a
// vendor that describes itself in somebody else's format.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Builder } from "@maroonedog/luq";
import { requiredPlugin } from "@maroonedog/luq/plugins/required";
import { optionalPlugin } from "@maroonedog/luq/plugins/optional";
import { objectPlugin } from "@maroonedog/luq/plugins/object";
import { stringMinPlugin } from "@maroonedog/luq/plugins/stringMin";
import { stringMaxPlugin } from "@maroonedog/luq/plugins/stringMax";
import { numberMinPlugin } from "@maroonedog/luq/plugins/numberMin";
import { numberMaxPlugin } from "@maroonedog/luq/plugins/numberMax";
import { toStandardJsonSchema } from "@maroonedog/luq/standard-schema";
import { luqFormResolver } from "form-contract-resolver-luq";
import { createForm, errorCountCell } from "form-core";

const build = () =>
  Builder()
    .use(requiredPlugin)
    .use(optionalPlugin)
    .use(objectPlugin)
    .use(stringMinPlugin)
    .use(stringMaxPlugin)
    .use(numberMinPlugin)
    .use(numberMaxPlugin)
    .for()
    .v("owner", (one) => one.object.required())
    .v("owner.name", (one) => one.string.required().min(3).max(20))
    .v("owner.nickname", (one) => one.string.optional())
    .v("quantity", (one) => one.number.required().min(1).max(99))
    .build();

const adapterOf = () => {
  const validator = build();
  return luqFormResolver(validator, toStandardJsonSchema(validator));
};

const GOOD = { owner: { name: "Ada Lovelace", nickname: "" }, quantity: 2 };

const descriptorAt = (adapter, path) =>
  adapter.fields.find((field) => field.path === path);

test("a leaf is described before any value exists", () => {
  const name = descriptorAt(adapterOf(), "owner.name");
  assert.deepEqual(name, {
    path: "owner.name",
    kind: "string",
    isRequired: true,
    constraints: { minLength: 3, maxLength: 20 },
  });
});

test("presence comes from the schema's required list, not from the value", () => {
  const adapter = adapterOf();
  assert.equal(descriptorAt(adapter, "owner.name").isRequired, true);
  assert.equal(descriptorAt(adapter, "owner.nickname").isRequired, false);
});

test("a numeric bound arrives as a bound and not as a string", () => {
  const quantity = descriptorAt(adapterOf(), "quantity");
  assert.equal(quantity.kind, "number");
  assert.deepEqual(quantity.constraints, { minimum: 1, maximum: 99 });
});

test("a container contributes no descriptor of its own", () => {
  const paths = adapterOf().fields.map((field) => field.path);
  assert.deepEqual(paths.sort(), ["owner.name", "owner.nickname", "quantity"]);
});

test("an acceptable root produces no issues", () => {
  assert.deepEqual(adapterOf().validate(GOOD), []);
});

test("every issue is reported, not just the first", () => {
  // The contract's whole-root pass scatters the verdict onto every path it
  // names. A resolver that stopped at the first failure would report one
  // field and silently clear the others.
  const issues = adapterOf().validate({ owner: { name: "a" }, quantity: 0 });
  assert.deepEqual(
    issues.map((issue) => issue.path).sort(),
    ["owner.name", "quantity"]
  );
});

test("an issue is addressed at the path it belongs to, with its code", () => {
  const issues = adapterOf().validate({ ...GOOD, owner: { name: "a" } });
  const [first] = issues;
  assert.equal(first.path, "owner.name");
  assert.equal(first.code, "stringMin");
  assert.match(first.message, /3/);
});

test("the runtime drives a luq adapter exactly as it drives a zod one", async () => {
  const form = createForm({
    adapter: adapterOf(),
    defaultValues: structuredClone(GOOD),
  });
  await form.validate();
  assert.equal(form.store.read(errorCountCell), 0);

  form.field("owner.name").setValue("a");
  await form.validate();
  assert.equal(form.store.read(errorCountCell), 1);
  assert.equal(
    form.field("owner.name").sources.issues.read()[0].code,
    "stringMin"
  );

  // And the descriptor reached the field handle, which is what a renderer
  // draws from before anybody types.
  assert.equal(form.field("owner.name").descriptor.constraints.minLength, 3);
});
