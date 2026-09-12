// ===========================================================================
// LiveForm.tsx — the library, running, on the page that describes it.
//
// The number beside each row is how many times THAT component has rendered.
// It is the whole argument made operable: type in one field and only its own
// counter moves, because a component subscribes to the cells it reads and to
// nothing else. Change billing and the error appears on shipping, which is a
// field nobody touched.
//
// The counters would be worthless if the panel above them re-rendered the
// rows, so nothing in this file lifts state over the fields: the toolbar reads
// the pass counter and the error count through their own subscriptions, and it
// is a sibling of the rows rather than an ancestor.
//
// Both rows used to spell `id={at}`, `htmlFor={at}` and `aria-invalid` by
// hand, and the id they spelled was the path — which collides the moment a
// second form appears on the page, as one does the moment a reader opens the
// dialog on another section. They now spread what the binding emits, which is
// the point the page is making about the descriptor, applied to itself.
// ===========================================================================
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  FormProvider,
  useCreateForm,
  useField,
  useFieldIssues,
  useForm,
  useFormStatus,
  useRows,
  useUncontrolledField,
  type FieldErrorProps,
  type FormPathTo,
} from "@maroonedog/waypoint/react";
import { blankLine, orderAdapter, orderDefaults } from "./order-form.js";
import { createPassCounter, type PassCounter } from "./pass-counter.js";
import { createRecordingStore, type Entry, type Tape } from "./recording-store.js";
import { useRenderCount } from "./use-render-count.js";

type Mode = "controlled" | "uncontrolled";

// The middle track is capped rather than fluid: in a wide column a fluid one
// gives a postcode an input three quarters of a metre long, which is not what
// a form looks like and makes the render badge beside it hard to associate.
const ROW =
  "grid grid-cols-[6rem_minmax(0,22rem)_auto] items-center gap-3 py-1.5";
const INPUT =
  "w-full rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-sm " +
  "outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const LABEL = "text-xs font-medium text-on-surface-variant";
const MESSAGE = "col-start-2 text-xs text-error";

function Renders({ count }: { readonly count: number }): React.ReactElement {
  return (
    <span
      className="rounded-full bg-surface-high px-2 py-0.5 font-mono text-[0.65rem] tabular-nums text-on-surface-variant"
      title="How many times this row has rendered"
    >
      {count}
    </span>
  );
}

/**
 * The message line. It is dropped rather than left empty, which keeps the rows
 * tight but is the weaker half of `role="alert"`: a live region inserted along
 * with its first message is the case several screen readers do not announce.
 * A form that wanted the announcement would render this always and let it be
 * blank — see the showcase, which reserves the height for exactly that reason.
 */
function Message({
  text,
  errorProps,
}: {
  readonly text: string;
  readonly errorProps: FieldErrorProps;
}): React.ReactElement | null {
  return text === "" ? null : (
    <p className={MESSAGE} {...errorProps}>
      {text}
    </p>
  );
}

function ControlledRow({
  at,
  label,
}: {
  readonly at: FormPathTo<string>;
  readonly label: string;
}): React.ReactElement {
  const field = useField(at);
  const renders = useRenderCount();
  return (
    <>
      <div className={ROW}>
        <label className={LABEL} {...field.labelProps}>
          {label}
        </label>
        <input className={INPUT} {...field.inputProps} />
        <Renders count={renders} />
      </div>
      <Message
        text={field.issues[0]?.message ?? ""}
        errorProps={field.errorProps}
      />
    </>
  );
}

function UncontrolledRow({
  at,
  label,
}: {
  readonly at: FormPathTo<string>;
  readonly label: string;
}): React.ReactElement {
  const field = useUncontrolledField(at);
  const renders = useRenderCount();
  return (
    <>
      <div className={ROW}>
        <label className={LABEL} {...field.labelProps}>
          {label}
        </label>
        <input className={INPUT} {...field.inputProps} />
        <Renders count={renders} />
      </div>
      <Message
        text={field.issues[0]?.message ?? ""}
        errorProps={field.errorProps}
      />
    </>
  );
}

function Lines({ mode }: { readonly mode: Mode }): React.ReactElement {
  const lines = useRows("items");
  const listIssues = useFieldIssues("items");
  const Row = mode === "controlled" ? ControlledRow : UncontrolledRow;
  return (
    <div className="mt-4 rounded-lg border border-outline-variant p-3">
      <p className="flex items-center justify-between text-xs font-medium text-on-surface-variant">
        <span>items — a row keeps its own identity across a splice</span>
        <span className="text-error">{listIssues[0]?.message ?? ""}</span>
      </p>
      {lines.rows.map((line) => (
        <div key={line.key} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Row at={`${line.path}.sku`} label={`sku ${line.index}`} />
          </div>
          <button
            type="button"
            className="mb-2 rounded-md border border-outline-variant px-2 py-1 text-xs"
            onClick={() => lines.remove(line.index)}
          >
            remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="mt-2 rounded-md bg-secondary-container px-3 py-1 text-xs text-on-secondary-container"
        onClick={() => lines.insert(lines.rows.length, blankLine())}
      >
        + line
      </button>
    </div>
  );
}

const KIND_TINT: Readonly<Record<Entry["kind"], string>> = {
  value: "text-primary",
  issues: "text-error",
  rows: "text-tertiary",
  flag: "text-on-surface-variant",
  form: "text-on-surface-variant",
  forget: "text-on-surface-variant",
};

/**
 * What the runtime just did, newest first. It reads the recording store rather
 * than any hook, so it is a sibling of the fields and re-rendering it does not
 * re-render them — which matters here more than anywhere, because the numbers
 * beside the fields are the other half of the demo.
 */
function Tape({ tape }: { readonly tape: Tape }): React.ReactElement {
  const entries = useSyncExternalStore(tape.subscribe, tape.read, tape.read);
  // After mount, so the fourteen cells that building the form wrote are not
  // the fourteen the reader is looking at.
  useEffect(() => tape.startRecording(), [tape]);
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-outline-variant">
      <p className="flex items-center justify-between border-b border-outline-variant bg-surface px-3 py-1.5 text-[0.65rem] font-semibold tracking-wide text-on-surface-variant uppercase">
        <span>every cell the runtime wrote</span>
        <button type="button" className="font-normal normal-case" onClick={tape.clear}>
          clear
        </button>
      </p>
      {entries.length === 0 ? (
        <p className="px-3 py-3 text-xs text-on-surface-variant">
          Type in a field above. Nothing is written until something changes.
        </p>
      ) : (
        <ol className="max-h-52 overflow-y-auto">
          {entries.map((entry) => (
            <li
              key={entry.seq}
              className="grid grid-cols-[6.5rem_11rem_minmax(0,1fr)] items-baseline gap-2 border-b border-outline-variant/60 px-3 py-1 font-mono text-[0.7rem] last:border-b-0"
            >
              <span className={KIND_TINT[entry.kind]}>{entry.channel}</span>
              <span className="truncate">{entry.path}</span>
              <span className="truncate text-on-surface-variant">{entry.what}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Toolbar({ counter }: { readonly counter: PassCounter }): React.ReactElement {
  const passes = useSyncExternalStore(
    counter.subscribe,
    counter.read,
    counter.read
  );
  const status = useFormStatus();
  const form = useForm();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-outline-variant pt-3 text-xs">
      <span className="text-on-surface-variant">
        validator passes{" "}
        <strong className="font-mono tabular-nums text-on-surface">{passes}</strong>
      </span>
      <span className="text-on-surface-variant">
        errors{" "}
        <strong className="font-mono tabular-nums text-on-surface">
          {status.errorCount}
        </strong>
      </span>
      <button
        type="button"
        className="ml-auto rounded-md border border-outline-variant px-2 py-1"
        onClick={() => {
          form.reset();
          counter.reset();
        }}
      >
        reset
      </button>
    </div>
  );
}

function Sheet({
  mode,
  counter,
  tape,
}: {
  readonly mode: Mode;
  readonly counter: PassCounter;
  readonly tape: Tape;
}): React.ReactElement {
  // The store is an argument, so instrumenting the runtime needs no hook in
  // it: this is the same seam the `./store-zustand` entry uses.
  const form = useCreateForm(() => ({
    adapter: counter.adapter,
    defaultValues: structuredClone(orderDefaults),
    store: tape.store,
  }));
  const Row = mode === "controlled" ? ControlledRow : UncontrolledRow;
  return (
    <FormProvider form={form}>
      <Row at="owner.name" label="name" />
      <Row at="billing.postcode" label="billing" />
      <Row at="shipping.postcode" label="shipping" />
      <Lines mode={mode} />
      <Toolbar counter={counter} />
      <Tape tape={tape} />
    </FormProvider>
  );
}

export default function LiveForm(): React.ReactElement {
  const [mode, setMode] = useState<Mode>("controlled");
  // One counter per mounted sheet, so switching modes starts the count over
  // rather than carrying the other mode's passes into it.
  const counter = useMemo(() => createPassCounter(orderAdapter), [mode]);
  const tape = useMemo(() => createRecordingStore(), [mode]);

  return (
    <div className="mt-6 rounded-xl border border-outline-variant bg-surface-low p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["controlled", "uncontrolled"] as const).map((one) => (
          <button
            key={one}
            type="button"
            aria-pressed={mode === one}
            className={
              "rounded-full px-3 py-1 text-xs font-medium " +
              (mode === one
                ? "bg-primary text-on-primary"
                : "border border-outline-variant text-on-surface-variant")
            }
            onClick={() => setMode(one)}
          >
            {one === "controlled" ? "useField" : "useUncontrolledField"}
          </button>
        ))}
        <span className="text-xs text-on-surface-variant">
          the number on each row is how many times it rendered
        </span>
      </div>
      <Sheet key={mode} mode={mode} counter={counter} tape={tape} />
    </div>
  );
}
