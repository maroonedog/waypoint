// ===========================================================================
// drive-input.ts — types into a subject the way a person does.
//
// Through the DOM, never through a library API. Driving each subject through
// its own setter would measure whatever that setter happens to skip, and no
// two libraries skip the same things. An input event is the one instruction
// every one of them agrees to receive.
//
// The value is written through the prototype setter because React tracks the
// last value on the node itself; assigning the property directly makes React
// treat the change as its own and swallow the event.
// ===========================================================================

export interface InputTarget {
  readonly document: Document;
  readonly window: {
    readonly Event: typeof Event;
    readonly HTMLInputElement: typeof HTMLInputElement;
  };
}

export function findInput(document: Document, path: string): HTMLInputElement {
  const found = document.querySelector(
    `[data-path=${JSON.stringify(path)}]`
  ) as HTMLInputElement | null;
  if (found === null) throw new Error(`no input is rendered for "${path}"`);
  return found;
}

export function driveInput(
  target: InputTarget,
  path: string,
  value: string
): void {
  const element = findInput(target.document, path);
  const setter = Object.getOwnPropertyDescriptor(
    target.window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (setter === undefined) throw new Error("the DOM has no value setter");
  setter.call(element, value);
  element.dispatchEvent(new target.window.Event("input", { bubbles: true }));
}

export function driveBlur(target: InputTarget, path: string): void {
  const element = findInput(target.document, path);
  element.dispatchEvent(new target.window.Event("blur", { bubbles: false }));
}
