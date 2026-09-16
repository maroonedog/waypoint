import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import ts from "typescript";
import { JSDOM } from "jsdom";

test("the sample shows an error, then saves the corrected address", async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: "http://localhost", pretendToBeVisual: true,
  });
  for (const name of ["window", "document", "HTMLElement", "Event", "Node"]) {
    globalThis[name] = name === "window" ? dom.window : dom.window[name];
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement, StrictMode } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const compiled = new URL("./.app-test.mjs", import.meta.url);
  const source = await readFile(new URL("./src/App.tsx", import.meta.url), "utf8");
  await writeFile(compiled, ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  } }).outputText);
  const root = createRoot(dom.window.document.getElementById("root"));
  try {
    const { App } = await import(compiled.href);
    await act(async () => root.render(createElement(StrictMode, null, createElement(App))));
    const input = dom.window.document.querySelector("input");
    const form = dom.window.document.querySelector("form");
    const status = dom.window.document.querySelector('[role="status"]');
    const setInputValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
    async function enterAndSubmit(value) {
      await act(async () => {
        setInputValue.call(input, value);
        input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      });
      await act(async () => {
        form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
      });
    }
    await enterAndSubmit("invalid");
    assert.equal(input.getAttribute("aria-invalid"), "true");
    assert.match(dom.window.document.body.textContent, /Enter a valid email address/);
    assert.equal(status.textContent, "Nothing saved yet.");
    await enterAndSubmit("ada@example.com");
    assert.notEqual(input.getAttribute("aria-invalid"), "true");
    assert.equal(status.textContent, "Saved: ada@example.com");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    await unlink(compiled);
  }
});
