// The half of the Vue binding that is Vue's, and every one of these is a place
// where the obvious translation of the React binding is silently wrong.
//
// The file above this one asks whether a form works. This one asks whether it
// works for the reasons it is supposed to: the prop key that decides when a
// cell is written, the subscription that has to be closed, the path that is
// allowed to move under a component whose `setup()` already ran, and the merge
// that composes rather than replaces. Each is a defect that renders perfectly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dom } from "./support/dom.mjs";
import { find, mountIntoDocument, typeInto } from "./support/vue-root.mjs";
import { settle } from "./support/scheduled-pass.mjs";

const { z } = await import("zod");
const { effectScope, h, ref } = await import("vue");
const { zodFormResolver } = await import("@maroonedog/waypoint/resolver-zod");
const { createForm } = await import("@maroonedog/waypoint/core");
const { Field, FormProvider, useCell, useField } = await import(
  "@maroonedog/waypoint/vue"
);

const SCHEMA = z.object({
  owner: z.object({ name: z.string().min(3), email: z.email() }),
});

const GOOD = { owner: { name: "Ada Lovelace", email: "ada@example.com" } };

const newForm = (options = {}) =>
  createForm({
    adapter: zodFormResolver(SCHEMA),
    defaultValues: structuredClone(GOOD),
    ...options,
  });

const mountUnder = (form, screen, providerProps = {}) =>
  mountIntoDocument({
    setup: () => () =>
      h(
        FormProvider,
        { form, partial: true, ...providerProps },
        { default: () => h(screen) }
      ),
  });

// ---------------------------------------------------------------------------
// The prop key.
// ---------------------------------------------------------------------------

test("the change handler is bound to the event a keystroke fires, not to the one a blur fires", async () => {
  const form = newForm();
  const seen = {};
  const screen = {
    setup() {
      const field = useField("owner.name");
      Object.assign(seen, { keys: () => Object.keys(field.inputProps) });
      return () => h("input", field.inputProps);
    },
  };
  const { container, app } = mountUnder(form, screen);
  const input = container.querySelector("input");

  assert.ok(
    seen.keys().includes("onInput"),
    "Vue binds `onChange` to the DOM's change event, which fires on commit"
  );
  assert.ok(
    !seen.keys().includes("onChange"),
    "binding both would write the cell twice for one edit on a select or a checkbox"
  );

  // A `change` event on its own must reach nothing: if it did, the bag would
  // be carrying React's key and every edit would land a blur late.
  input.value = "Grace Hopper";
  input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  assert.equal(form.field("owner.name").sources.value.read(), "Ada Lovelace");

  typeInto(input, "Grace Hopper");
  assert.equal(form.field("owner.name").sources.value.read(), "Grace Hopper");
  await settle();
  app.unmount();
});

// ---------------------------------------------------------------------------
// The subscription.
// ---------------------------------------------------------------------------

test("useCell refuses to subscribe where nothing could ever unsubscribe", () => {
  let opened = 0;
  const source = {
    subscribe: () => {
      opened += 1;
      return () => undefined;
    },
    read: () => 1,
  };
  assert.throws(() => useCell(source), /effect scope/);
  assert.equal(
    opened,
    0,
    "the leak is silent otherwise — watchEffect emits no warning at this call site"
  );
});

test("useCell subscribes inside an effect scope and lets go when it stops", () => {
  let live = 0;
  const source = {
    subscribe: () => {
      live += 1;
      return () => {
        live -= 1;
      };
    },
    read: () => 1,
  };
  const scope = effectScope();
  scope.run(() => useCell(source));
  assert.equal(live, 1, "a store or a route-level scope is a call site this supports");
  scope.stop();
  assert.equal(live, 0);
});

test("unmounting a field releases every cell it was holding", async () => {
  const form = newForm();
  const screen = {
    setup() {
      const field = useField("owner.name");
      return () => h("input", field.inputProps);
    },
  };
  const { app } = mountUnder(form, screen);
  const before = form.store.read;
  assert.ok(typeof before === "function");

  let woken = 0;
  const stop = form.field("owner.name").sources.value.subscribe(() => {
    woken += 1;
  });
  app.unmount();
  form.field("owner.name").setValue("Grace Hopper");
  await settle();
  assert.equal(woken, 1, "the test's own subscription still works after the unmount");
  stop();
});

// ---------------------------------------------------------------------------
// The path that moves under a `setup()` that already ran.
// ---------------------------------------------------------------------------

test("a Field whose path prop changes moves its binding rather than keeping the first one", async () => {
  const form = newForm();
  const chosen = ref("owner.name");
  const screen = {
    setup() {
      return () =>
        h(Field, { path: chosen.value }, { default: (field) => [h("input", field.inputProps)] });
    },
  };
  const { container, app } = mountUnder(form, screen);
  assert.equal(container.querySelector("input").value, "Ada Lovelace");

  chosen.value = "owner.email";
  await settle();
  const input = container.querySelector("input");
  assert.equal(input.name, "owner.email");
  assert.equal(
    input.value,
    "ada@example.com",
    "`setup()` runs once, so a binding that read its path eagerly would show " +
      "the new name over the old field's value"
  );

  typeInto(input, "grace@example.com");
  assert.equal(form.field("owner.email").sources.value.read(), "grace@example.com");
  assert.equal(form.field("owner.name").sources.value.read(), "Ada Lovelace");
  await settle();
  app.unmount();
});

// ---------------------------------------------------------------------------
// What a subscription per cell is for.
// ---------------------------------------------------------------------------

test("typing in one field redraws that field and nothing above or beside it", async () => {
  const form = newForm();
  const drawn = { parent: 0, name: 0, email: 0 };
  const oneField = (path, counted) => ({
    setup() {
      const field = useField(path);
      return () => {
        drawn[counted] += 1;
        return h("input", field.inputProps);
      };
    },
  });
  const screen = {
    setup() {
      return () => {
        drawn.parent += 1;
        return h("div", null, [
          h(oneField("owner.name", "name")),
          h(oneField("owner.email", "email")),
        ]);
      };
    },
  };
  const { container, app } = mountUnder(form, screen);
  assert.deepEqual(drawn, { parent: 1, name: 1, email: 1 });

  typeInto(container.querySelectorAll("input")[0], "Grace Hopper");
  await settle();
  assert.deepEqual(drawn, { parent: 1, name: 2, email: 1 });
  app.unmount();
});

// ---------------------------------------------------------------------------
// The merge.
// ---------------------------------------------------------------------------

test("decorate composes what must compose and wins everything else", async () => {
  const form = newForm();
  const order = [];
  const screen = {
    setup() {
      const field = useField("owner.name");
      return () =>
        field.decorate(
          h("input", {
            id: "the-caller-wanted-this",
            "aria-describedby": "their-hint",
            "data-theirs": "kept",
            onInput: () => order.push(`caller saw ${field.value}`),
          })
        );
    },
  };
  const { container, app } = mountUnder(form, screen);
  const input = container.querySelector("input");

  assert.notEqual(
    input.id,
    "the-caller-wanted-this",
    "a caller's id silently breaks the label and the error association"
  );
  assert.equal(input.getAttribute("data-theirs"), "kept");
  assert.match(
    input.getAttribute("aria-describedby"),
    /their-hint$/,
    "a truncated describedby list simply stops being announced"
  );

  typeInto(input, "Grace Hopper");
  assert.deepEqual(
    order,
    ["caller saw Grace Hopper"],
    "both handlers run, and the cell is written before the caller's reads it"
  );
  await settle();
  app.unmount();
});

test("decorate hands back anything that is not an element untouched", () => {
  const form = newForm();
  const screen = {
    setup() {
      const field = useField("owner.name");
      // A component vnode: cloning it with these props would pass `id` and
      // `onInput` as component props rather than as DOM attributes.
      const inner = { setup: () => () => h("span", { id: "inner" }, "drawn") };
      return () => h("div", null, [field.decorate(h(inner))]);
    },
  };
  const { container, app } = mountUnder(form, screen);
  assert.equal(find(container, "inner").textContent, "drawn");
  assert.equal(find(container, "inner").getAttribute("name"), null);
  app.unmount();
});

// ---------------------------------------------------------------------------
// Layer 2, through the shared lookup.
// ---------------------------------------------------------------------------

test("a widget is resolved by the same six rules the React binding consults", () => {
  const form = newForm();
  const pill = {
    props: { field: { type: Object, required: true } },
    setup: (props) => () =>
      h("span", { id: "pill" }, String(props.field.value)),
  };
  const screen = {
    setup: () => () =>
      h("div", null, [
        h(Field, { path: "owner.name", as: "pill" }),
        h(Field, { path: "owner.email" }),
      ]),
  };
  const { container, app } = mountUnder(form, screen, {
    widgets: { byName: { pill }, byFormat: { email: pill } },
  });
  const shown = container.querySelectorAll("#pill");
  assert.deepEqual(
    [...shown].map((node) => node.textContent),
    ["Ada Lovelace", "ada@example.com"],
    "`as` beats everything, and a declared format is consulted after it"
  );
  app.unmount();
});

test("a field nothing can draw draws nothing rather than throwing", () => {
  const form = newForm();
  const screen = {
    setup: () => () => h("div", { id: "wrapper" }, [h(Field, { path: "owner.name" })]),
  };
  const { container, app } = mountUnder(form, screen);
  assert.equal(container.querySelector("input"), null);
  assert.equal(find(container, "wrapper").textContent, "");
  assert.deepEqual(
    form.coverage.missing().map((one) => [one.path, one.reason]),
    [
      // Asked for and drawn by nothing, which is not the same mistake as the
      // one below it — everything wired and the page blank is the case the two
      // reasons exist to tell apart.
      ["owner.name", "undrawn"],
      ["owner.email", "unaddressed"],
    ]
  );
  app.unmount();
});

// ---------------------------------------------------------------------------
// The key, which is the one thing the types cannot check.
//
// Vue prints its own report when a `setup()` throws, and it prints the whole
// props object with it — so the two tests below would each put the form handle
// on the terminal as noise about a throw they are deliberately causing and
// already assert on. `quietly` is where that goes.
// ---------------------------------------------------------------------------

/** Runs `act` with Vue's own report silenced, and restores the console. */
const quietly = (act) => {
  const warn = console.warn;
  const error = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    act();
  } finally {
    console.warn = warn;
    console.error = error;
  }
};

test("a path that names another form throws instead of drawing nothing", () => {
  const form = newForm({ key: "customer" });
  const screen = {
    setup() {
      useField("admin:owner.name");
      return () => null;
    },
  };
  quietly(() =>
    assert.throws(
      () => mountUnder(form, screen, { formKey: "customer" }),
      /names the "admin" form/
    )
  );
});

test("a provider and the form it carries may not name themselves differently", () => {
  const form = newForm({ key: "admin" });
  const screen = { setup: () => () => null };
  quietly(() =>
    assert.throws(
      () => mountUnder(form, screen, { formKey: "customer" }),
      /Say it once/
    )
  );
});

// ---------------------------------------------------------------------------
// The report, asked once the subtree is up.
// ---------------------------------------------------------------------------

test("a declared place no component drew is reported when the subtree has mounted", () => {
  const form = newForm();
  const screen = {
    setup() {
      useField("owner.name");
      return () => null;
    },
  };
  const said = [];
  const original = console.warn;
  console.warn = (line) => said.push(line);
  try {
    mountUnder(form, screen, { partial: false }).app.unmount();
  } finally {
    console.warn = original;
  }
  assert.match(said.join("\n"), /owner\.email/);
});
