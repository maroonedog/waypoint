// ===========================================================================
// assert-form-store-contract.ts — runs the contract against a candidate.
//
// An adapter author runs this. A store that passes it is substitutable; one
// that does not is not, whatever its types say.
//
// Each case gets a FRESH store. A case that leaves a listener attached would
// otherwise change what the next one observes, and the failure would be
// reported against the wrong rule.
// ===========================================================================
import type { FormCellStore } from "./form-cell-store.types.js";
import { STORE_CONTRACT_CASES } from "./store-contract-cases.js";

/** Reports one assertion. Pass a test framework's assertion here. */
export type StoreContractExpect = (holds: boolean, what: string) => void;

export function assertFormStoreContract(
  createStore: () => FormCellStore,
  expect: StoreContractExpect
): void {
  for (const contractCase of STORE_CONTRACT_CASES) {
    contractCase.run(createStore(), (holds) => expect(holds, contractCase.what));
  }
}
