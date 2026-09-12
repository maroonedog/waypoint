// The rendered slice: the two-postcode form on screen, with a counter behind
// every component and a toggle that can take either field out of the tree.
//
// WHAT THE SCREEN IS FOR, because it is not a screen. Nothing here is drawn to
// be looked at — `counters` is the output. A form that re-renders everything on
// every keystroke passes every assertion about values and issues, so the only
// way to state the claim this library exists for is to count the renders, and
// the only way to count them is for the component to be built around a counter.
// That is why the screen is constructed here rather than imported from
// anywhere real: a component that existed for its own sake could gain a memo, a
// context read or a parent, and the count would move for a reason that has
// nothing to do with the runtime.
//
// WHY THE TOGGLES. A field that is absent is not a variation on the screen, it
// is the second half of the subject: cells are written for readers, so a field
// with no mounted reader is the case where a write can go missing. `showBilling`
// and `showShipping` exist so a test can create a value or an error while the
// component that owns it is gone and then bring it back.
//
// WHY TYPING GOES THROUGH THE PROTOTYPE SETTER, which reads like ceremony and
// is the difference between a test and a test that passes for the wrong reason.
// React keeps its own record of the last value it saw on a node and ignores an
// input event whose value it believes it already knows. A probe on this slice
// confirmed it: assigning `element.value` directly and dispatching `input` left
// the form holding "", while going through
// `HTMLInputElement.prototype`'s setter and dispatching the same event moved it.
// A test that assigned the value plainly would therefore observe zero renders
// and no issue — and read as the library failing to react, when nothing was
// ever told.
import { dom } from "./dom.mjs";
import { mountIntoDocument } from "./react-root.mjs";
import { buildForm } from "./postcode-form.mjs";
import { find } from "./testid-lookup.mjs";

const React = await import("react");
const { FormProvider, Field } = await import("@maroonedog/waypoint/react");

const { act, createElement: h, useState, Fragment } = React;

function makeScreen(form, counters) {
  const Input = ({ path, testId }) =>
    h(Field, { path }, (field) => {
      counters[testId] += 1;
      return h(
        Fragment,
        null,
        h("input", { ...field.inputProps, "data-testid": testId }),
        h(
          "span",
          { "data-testid": testId + "-error" },
          field.issues.map((issue) => issue.message).join(" ")
        )
      );
    });

  return function Screen() {
    counters.shell += 1;
    const [showShipping, setShowShipping] = useState(true);
    const [showBilling, setShowBilling] = useState(true);
    return h(
      FormProvider,
      { form },
      h(
        Fragment,
        null,
        showBilling
          ? h(Input, { path: "billing.postcode", testId: "billing" })
          : null,
        showShipping
          ? h(Input, { path: "shipping.postcode", testId: "shipping" })
          : null,
        h("button", {
          "data-testid": "toggle",
          onClick: () => setShowShipping((shown) => !shown),
        }),
        h("button", {
          "data-testid": "toggle-billing",
          onClick: () => setShowBilling((shown) => !shown),
        })
      )
    );
  };
}

/** A keystroke React believes, rather than one it has already discounted. */
export async function type(container, testId, value) {
  const element = find(container, testId);
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(element, value);
    element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

/** Mounts the slice, on the shipped store unless another one is handed in. */
export async function renderSlice(store) {
  const counters = { shell: 0, billing: 0, shipping: 0 };
  const form = buildForm(store);
  const Screen = makeScreen(form, counters);
  const { container, root } = await mountIntoDocument(h(Screen));
  return { form, counters, container, root };
}
