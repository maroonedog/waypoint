// ===========================================================================
// assert-production-react.ts — proves what was loaded before anything is
// counted.
//
// Three checks, because each one alone is escapable. The environment variable
// says what was intended; a Profiler that never fires says what was actually
// loaded, since a production build does not call one; and the absence of
// StrictMode says the tree was not double-invoked.
//
// A development build renders every component twice under StrictMode, warns on
// paths a production build never enters, and carries checks nobody ships. A
// count taken from one and published as what a user gets is the first way a
// benchmark of this kind goes wrong, and it leaves no trace in the output.
// ===========================================================================
import type { ReactElement } from "react";

export interface ProductionReactProof {
  readonly nodeEnv: string;
  readonly reactVersion: string;
  readonly profilerFired: boolean;
  readonly strictModeUsed: boolean;
}

export class NotProductionReactError extends Error {
  constructor(proof: ProductionReactProof, which: string) {
    super(
      `The benchmark refuses to measure a development build (${which}). ` +
        `Proof: ${JSON.stringify(proof)}`
    );
    this.name = "NotProductionReactError";
  }
}

export interface ProbeDeps {
  readonly React: typeof import("react");
  readonly createRoot: typeof import("react-dom/client").createRoot;
  readonly container: HTMLElement;
  readonly strictModeUsed: boolean;
}

/** @throws NotProductionReactError when anything says this is a dev build. */
export function assertProductionReact(deps: ProbeDeps): ProductionReactProof {
  const { React, createRoot, container, strictModeUsed } = deps;
  let profilerFired = false;

  const Probe = (): ReactElement =>
    React.createElement(
      React.Profiler,
      {
        id: "production-probe",
        onRender: () => {
          profilerFired = true;
        },
      },
      React.createElement("span", null, "probe")
    );

  const root = createRoot(container);
  root.render(React.createElement(Probe));
  root.unmount();

  const proof: ProductionReactProof = {
    nodeEnv: process.env["NODE_ENV"] ?? "",
    reactVersion: React.version,
    profilerFired,
    strictModeUsed,
  };

  if (proof.nodeEnv !== "production") {
    throw new NotProductionReactError(proof, "NODE_ENV is not production");
  }
  if (proof.profilerFired) {
    throw new NotProductionReactError(proof, "a Profiler fired");
  }
  if (proof.strictModeUsed) {
    throw new NotProductionReactError(proof, "StrictMode is in the tree");
  }
  return proof;
}
