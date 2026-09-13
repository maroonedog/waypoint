// ===========================================================================
// use-field-values.ts — a wildcard read as what it usually means.
//
// `items[*].sku` is one rule, and outside a row scope the ordinary reading of
// it is the whole column: every sku the list currently holds. `useField`
// cannot be that, because the same expression would be a `string` inside a row
// and a `string[]` outside one — a type that depends on where the component
// was rendered, which TypeScript cannot express and a reader could not
// predict. So the aggregate is its own hook, and the ambiguity never exists.
//
// A partly bound path works for the same reason: `shipments[0].lines[*].sku`
// has one wildcard left, so it reads that row's column rather than every row's.
// Nothing here treats that as a case — a bound index is just a path.
//
// SO THE PATH TYPE IS THE WIDE ONE, and this is the hook that wants it. A hook
// addressing a single value narrows to a PLACE, where a wildcard has nothing to
// read; this one addresses a set, and it reaches `expandDeclaredPath`, which
// handles any number of wildcards still standing.
// `FormColumnPath` is that set, qualified: the form is named in front of the
// wildcards, which sit where they always did.
// The rule-or-place union was therefore too NARROW here, not too wide: it
// offers all wildcards or none, and the partly bound spelling the paragraph
// above promises is in neither half, so the sentence was true of the runtime
// and a compile error. `PartlyBoundPath` is each `[*]` kept or bound
// independently, which is exactly the set this hook can answer.
//
// WHAT IT COSTS, because it is the one hook here that is not O(1): it
// subscribes to one cell per place the wildcard covers, plus the row order of
// each array it crosses. Reading a column of two hundred rows is two hundred
// subscriptions. That is the honest price of the question, and it is paid only
// by the component that asks it.
// ===========================================================================
import { useMemo, useSyncExternalStore } from "react";
import { expandDeclaredPath } from "../core/index.js";
import { useFormForPath } from "./use-form-for-path.js";
import type {
  FormColumnPath,
  InhabitedFormPath,
  ValueAtFormPath,
} from "../contract/index.js";

const WILDCARD = "[*]";

/** Every array a path crosses, so the row orders can be subscribed to. */
const arraysCrossed = (declared: string): readonly string[] => {
  const crossed: string[] = [];
  let at = declared.indexOf(WILDCARD);
  while (at !== -1) {
    crossed.push(declared.slice(0, at));
    at = declared.indexOf(WILDCARD, at + WILDCARD.length);
  }
  return crossed;
};

export function useFieldValues<Q extends FormColumnPath>(
  path: Q & InhabitedFormPath<Q>
): readonly ValueAtFormPath<Q>[];
export function useFieldValues(spelling: string): readonly never[] {
  const { form, path: open } = useFormForPath(spelling);

  // Which places the wildcard covers right now. Read during render rather than
  // subscribed to, because it is only used to decide WHAT to subscribe to —
  // the snapshot below is the authoritative read.
  const root = form.readRoot();
  const places = expandDeclaredPath(root, open).join("|");
  // The arrays whose ORDER has to be watched, concretely. A nested wildcard
  // crosses many inner arrays, not one: `grid[*].cells[*].n` watches the order
  // of `grid`, and then of `grid[0].cells`, `grid[1].cells`, and so on.
  const orderPaths = arraysCrossed(open)
    .flatMap((prefix) => expandDeclaredPath(root, prefix))
    .join("|");

  const source = useMemo(() => {
    const concrete = places === "" ? [] : places.split("|");

    // Through the field handle, NOT the raw store. Subscribing to a cell is
    // also what marks it OPEN, and the fan-out writes only cells somebody has
    // open — a reader that went straight to the store would be told about a
    // row it then never gets a value for, which is precisely what a splice
    // produced here before these two lines went through the handles.
    const values = concrete.map((path) => form.field(path).sources.value);
    const orders = (orderPaths === "" ? [] : orderPaths.split("|")).map(
      (arrayPath) => form.rows(arrayPath).ids
    );

    // Cached so the snapshot is reference-stable: useSyncExternalStore calls
    // read on every render, and a fresh array each time is what React reports
    // as "The result of getSnapshot should be cached" before it loops.
    let held: readonly never[] = [];

    return {
      subscribe: (listener: () => void) => {
        const stops = [...orders, ...values].map((one) =>
          one.subscribe(listener)
        );
        return () => {
          for (const stop of stops) stop();
        };
      },
      read: (): readonly never[] => {
        const next = values.map((one) => one.read() as never);
        const same =
          next.length === held.length &&
          next.every((one, index) => Object.is(one, held[index]));
        if (!same) held = next;
        return held;
      },
    };
    // `places` is in the key on purpose: when a splice changes which cells
    // exist, the subscription set has to change with it, and React resubscribes
    // exactly when this object's identity does.
  }, [form, open, places, orderPaths]);

  return useSyncExternalStore(source.subscribe, source.read, source.read);
}
