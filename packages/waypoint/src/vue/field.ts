// ===========================================================================
// field.ts — layers 2 and 3, in one component.
//
// A SCOPED SLOT IS LAYER 3, and it is the direct counterpart of React's
// children function rather than an approximation of it: a scoped slot IS a
// function from the binding to vnodes, and it is invoked as this component's
// return value rather than called inside its body for bookkeeping — so passing
// the binding on to a child component is ordinary Vue.
//
//   <Field path="owner.email" v-slot="field">
//     <label v-bind="field.labelProps">Email</label>
//     <input v-bind="field.inputProps">
//     <p v-bind="field.errorProps">{{ field.issues[0]?.message }}</p>
//   </Field>
//
// A render-function argument was the alternative and is strictly worse for
// this: it would force every caller into `h()` and give up templates, which is
// the half of the Vue audience this entry exists to reach.
//
// Without a slot, a widget is resolved and given the same binding. Layer 2 is
// therefore layer 3 with the caller's function looked up instead of written
// inline, and the lookup itself is `../dom/resolve-widget.ts` — the same six
// rules in the same order that the React binding consults.
//
// A field nothing can draw renders nothing rather than throwing. A registry is
// allowed to be partial, and a form that loses one input is easier to diagnose
// than one that fails to render at all.
//
// COVERAGE IS REPORTED IN THE RENDER FUNCTION AND NOT IN `setup()`, which is
// the one thing about this component that has to be got right for the wrong
// reason. Whether a slot was passed and whether the registry answered are
// per-render facts; `setup()` runs once and would freeze both. It is also the
// layer where asking for a field and drawing one come apart: a slot draws
// whatever it likes and that is the caller's business, while a registry lookup
// that finds nothing draws nothing — and a form whose registry is empty would
// otherwise report every field as handled while putting none of them on the
// screen, which is the exact shape worth catching, everything wired and the
// page blank.
// ===========================================================================
import { defineComponent, h, inject, type VNode } from "vue";
import { useFieldBinding } from "./bind-field.js";
import type { FieldBinding } from "./field-binding.types.js";
import { WidgetRegistryInjection } from "./injection-keys.js";
import { EMPTY_REGISTRY } from "./widget-registry.types.js";
import { resolveWidget } from "../dom/resolve-widget.js";
import type {
  FormPath,
  InhabitedFormPath,
  ValueAtFormPath,
} from "../contract/index.js";

export interface FieldProps<Q extends FormPath> {
  /**
   * The PLACE this field occupies, qualified by the form it belongs to. It
   * goes straight to the binding, so a rule has no answer here — a list hands
   * each row `row.path`, and `` `${row.path}.sku` `` is the spelling that
   * names one of them, already carrying its form.
   */
  readonly path: Q & InhabitedFormPath<Q>;
  /** Layer 2: the widget to draw this field with, by name. */
  readonly as?: string;
}

const FieldComponent = defineComponent({
  name: "Field",
  props: {
    path: { type: String, required: true },
    as: { type: String, required: false },
  },
  setup(props, { slots }) {
    // A getter, not `props.path`: `setup()` runs once, and a `<Field>` whose
    // path prop changes has to move its subscriptions rather than keep the
    // first field's. See use-form-for-path.ts.
    const bound = useFieldBinding(() => props.path);
    const registry = inject(WidgetRegistryInjection, EMPTY_REGISTRY);
    return () => {
      const shown = bound.binding as FieldBinding<unknown>;
      const drawn = slots.default;
      if (drawn !== undefined) {
        bound.form.coverage.addressed(bound.path.value);
        return drawn(shown);
      }
      const widget = resolveWidget(registry, shown, props.as);
      if (widget === undefined) {
        bound.form.coverage.undrawn(bound.path.value);
        return null;
      }
      bound.form.coverage.addressed(bound.path.value);
      return h(widget, { field: shown });
    };
  },
});

export const Field = FieldComponent as unknown as <Q extends FormPath>(
  props: FieldProps<Q>,
  context: {
    slots: {
      default?: (binding: FieldBinding<ValueAtFormPath<Q>>) => VNode[];
    };
  }
) => VNode;
