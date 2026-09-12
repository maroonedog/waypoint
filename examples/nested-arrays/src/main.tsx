import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WithFormContract } from "./with-form-contract.js";
import { WithReactHookForm } from "./with-react-hook-form.js";
import { WithFormik } from "./with-formik.js";
import { WithTanStack } from "./with-tanstack.js";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <header>
      <h1>配列とネストが混ざったフォーム</h1>
      <p>
        shipments[] → address{"{}"} → lines[] 。同じスキーマ・同じ見た目・同じ操作を
        4実装で。違うのはフィールドの指し方だけです。
      </p>
    </header>
    <main>
      <WithFormContract />
      <WithReactHookForm />
      <WithFormik />
      <WithTanStack />
    </main>
  </StrictMode>
);
