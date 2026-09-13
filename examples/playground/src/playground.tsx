import { useState, type ReactElement } from "react";
import { z } from "zod";
import { createStore } from "zustand/vanilla";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";
import { createCellStore, type FormCellStore } from "@maroonedog/waypoint/core";
import { FormProvider, useField, useCreateForm } from "@maroonedog/waypoint/react";
import type { FormPathTo } from "@maroonedog/waypoint/react";
import { createZustandCellStore } from "@maroonedog/waypoint/store-zustand";
import { useRenderCount } from "./render-count.js";

const SCHEMA = z
  .object({
    owner: z.object({ name: z.string().min(3).max(40) }),
    billing: z.object({ postcode: z.string().min(1) }),
    shipping: z.object({ postcode: z.string().min(1) }),
    quantity: z.number().min(1).max(99),
  })
  .superRefine((value, ctx) => {
    if (value.billing.postcode !== value.shipping.postcode) {
      ctx.addIssue({
        code: "custom",
        message: "must match the shipping postcode",
        path: ["billing", "postcode"],
      });
    }
  });

// The form starts acceptable. Starting it invalid would put an error on every
// field at the first keystroke, and a counter that moves because an error
// appeared says nothing about whether one field can be edited alone.
const ADAPTER = zodFormResolver(SCHEMA);

// The one declaration that types every path below. Nothing imports it.
declare module "@maroonedog/waypoint/react" {
  interface WaypointForms {
    form: typeof ADAPTER;
  }
}

const DEFAULTS = {
  owner: { name: "Ada Lovelace" },
  billing: { postcode: "100-0001" },
  shipping: { postcode: "100-0001" },
  quantity: 1,
};

type StoreChoice = "shipped" | "zustand";

const buildStore = (choice: StoreChoice): FormCellStore =>
  choice === "shipped"
    ? createCellStore()
    : createZustandCellStore(createStore(() => ({})));

function Counter({ renders }: { renders: number }): ReactElement {
  return <span className="counter">renders {renders}</span>;
}

function Issues({ messages }: { messages: readonly string[] }): ReactElement {
  return (
    <span className="issues">{messages.length === 0 ? " " : messages.join(" · ")}</span>
  );
}

/** Layer 3: an ordinary text input, spelled by the caller. The path type says
 *  which fields this widget can draw, so a number field handed to it is a
 *  compile error rather than a coercion. */
function TextField({
  path,
  label,
}: {
  path: FormPathTo<string>;
  label: string;
}): ReactElement {
  const field = useField(path);
  const renders = useRenderCount();
  return (
    <label className="row">
      <span className="label">
        {label}
        <Counter renders={renders} />
      </span>
      <input {...field.inputProps} />
      <Issues messages={field.issues.map((issue) => issue.message)} />
    </label>
  );
}

/** Layer 3 again: nothing about this widget came from the library. */
function Stepper({
  path,
  label,
}: {
  path: FormPathTo<number>;
  label: string;
}): ReactElement {
  const field = useField(path);
  const renders = useRenderCount();
  const held = typeof field.value === "number" ? field.value : 0;
  return (
    <div className="row">
      <span className="label">
        {label}
        <Counter renders={renders} />
      </span>
      <div className="stepper">
        <button type="button" onClick={() => field.setValue(held - 1)}>
          −
        </button>
        <output>{held}</output>
        <button type="button" onClick={() => field.setValue(held + 1)}>
          +
        </button>
        <span className="hint">
          declared {String(field.descriptor?.constraints.minimum)}–
          {String(field.descriptor?.constraints.maximum)}
        </span>
      </div>
      <Issues messages={field.issues.map((issue) => issue.message)} />
    </div>
  );
}

function Sheet({ store }: { store: FormCellStore }): ReactElement {
  const form = useCreateForm(() => ({
    adapter: ADAPTER,
    defaultValues: structuredClone(DEFAULTS),
    store,
  }));
  const renders = useRenderCount();
  const [showShipping, setShowShipping] = useState(true);
  const [root, setRoot] = useState<unknown>(undefined);

  return (
    <FormProvider form={form}>
      <div className="sheet">
        <h2>
          The form
          <Counter renders={renders} />
        </h2>

        <TextField path="form:owner.name" label="Name" />
        <TextField path="form:billing.postcode" label="Billing postcode" />
        {showShipping ? (
          <TextField path="form:shipping.postcode" label="Shipping postcode" />
        ) : (
          <p className="absent">
            Shipping postcode is unmounted. The rule on billing still reads it.
          </p>
        )}
        <Stepper path="form:quantity" label="Quantity" />

        <div className="controls">
          <button type="button" onClick={() => setShowShipping((on) => !on)}>
            {showShipping ? "Unmount" : "Mount"} shipping
          </button>
          <button
            type="button"
            onClick={() => {
              form.field("shipping.postcode").setValue("999-9999");
            }}
          >
            Set shipping to 999-9999 from outside
          </button>
          <button type="button" onClick={() => setRoot(form.readRoot())}>
            Read the root
          </button>
        </div>

        {root === undefined ? null : (
          <pre className="root">{JSON.stringify(root, null, 2)}</pre>
        )}
      </div>
    </FormProvider>
  );
}

export function Playground(): ReactElement {
  const [choice, setChoice] = useState<StoreChoice>("shipped");
  const [store, setStore] = useState<FormCellStore>(() => buildStore("shipped"));

  const swap = (next: StoreChoice): void => {
    setChoice(next);
    setStore(buildStore(next));
  };

  return (
    <main>
      <header>
        <h1>waypoint</h1>
        <p>
          Type in one field and watch the other counters stay still. Unmount
          shipping and the rule on billing still judges it.
        </p>
        <div className="stores">
          {(["shipped", "zustand"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={option === choice ? "on" : ""}
              onClick={() => swap(option)}
            >
              {option === "shipped" ? "shipped store" : "zustand store"}
            </button>
          ))}
        </div>
      </header>
      <Sheet key={choice} store={store} />
    </main>
  );
}
