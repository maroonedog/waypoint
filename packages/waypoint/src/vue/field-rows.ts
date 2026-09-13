// ===========================================================================
// field-rows.ts — a list, drawn by whoever asked for it.
//
// A scoped slot receiving the whole rows binding, for the same reason
// `<Field>` hands over the field binding: the markup around a row — the
// wrapper, the remove button, the ordering controls — is the application's,
// and a component that drew any of it would be a widget library.
//
//   <FieldRows path="items" v-slot="list">
//     <div v-for="row in list.rows" :key="row.key">
//       <Field :path="`${row.path}.sku`" v-slot="sku"> … </Field>
//       <button type="button" @click="list.remove(row.index)">Remove</button>
//     </div>
//     <button type="button" @click="list.insert(list.rows.length)">Add</button>
//   </FieldRows>
//
// `row.key` is the key, `row.path` is the address, and building a member's
// path from the address is the whole mechanism — nothing ambient rewrites what
// a nested component asks for.
//
// IT REPORTS NO COVERAGE. A list is not a place a value lives; the places are
// the members of its rows, and each of those reports itself when it is bound.
// ===========================================================================
import { defineComponent, type PropType, type VNode } from "vue";
import { useRows, type RowsBinding } from "./use-rows.js";
import type { FormListPath } from "../contract/index.js";

export interface FieldRowsProps<Q extends FormListPath> {
  /** The list, qualified by the form it belongs to: `order:items`. */
  readonly path: Q;
}

const FieldRowsComponent = defineComponent({
  name: "FieldRows",
  props: {
    // Declared at the registry's list type rather than at `string`, because
    // `useRows` has no `string` overload to fall back to — the checked
    // spelling is the only one, which is the point of it.
    path: { type: String as PropType<FormListPath>, required: true },
  },
  setup(props, { slots }) {
    const rows = useRows(() => props.path);
    return () => slots.default?.(rows);
  },
});

export const FieldRows = FieldRowsComponent as unknown as <
  Q extends FormListPath,
>(
  props: FieldRowsProps<Q>,
  context: { slots: { default?: (rows: RowsBinding<Q>) => VNode[] } }
) => VNode;
