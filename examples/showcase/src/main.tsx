import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ApplicationForm } from "./application-form.js";
import { MdButton } from "./md/button.js";
import "./theme.css";

function Page() {
  const [submitted, setSubmitted] = useState<unknown>(undefined);

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant bg-surface-low">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-5">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary"
          >
            <span className="material-symbols-rounded text-[22px]">
              edit_document
            </span>
          </span>
          <div>
            <h1 className="text-lg font-medium text-on-surface">
              お取引口座 開設申込
            </h1>
            <p className="text-sm text-on-surface-variant">
              form-contract の参考画面 — Material Design 3
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-6">
        {submitted === undefined ? null : (
          <div className="mb-4 rounded-lg bg-primary-container p-5 text-on-primary-container">
            <h2 className="mb-2 flex items-center gap-2 text-base font-medium">
              <span aria-hidden className="material-symbols-rounded text-[20px]">
                check_circle
              </span>
              申込を受け付けました
            </h2>
            <pre className="max-h-64 overflow-auto rounded-sm bg-surface-lowest/60 p-3 text-xs text-on-surface">
              {JSON.stringify(submitted, null, 2)}
            </pre>
            <div className="mt-3">
              <MdButton tone="outlined" onClick={() => setSubmitted(undefined)}>
                閉じる
              </MdButton>
            </div>
          </div>
        )}
        <ApplicationForm onSubmitted={setSubmitted} />
      </main>
    </div>
  );
}

const host = document.getElementById("root");
if (host === null) throw new Error("The page has no #root element.");
createRoot(host).render(<Page />);
