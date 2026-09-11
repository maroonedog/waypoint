// ===========================================================================
// scenario.types.ts — one scripted interaction.
//
// A scenario is data, not code, so every subject is driven by the identical
// sequence and no subject can be handed a shortcut. `requires` names the
// capabilities it needs; a subject that does not declare one of them is marked
// `not applicable` BEFORE the scenario runs, rather than being scored as
// wrong for something it never claimed.
// ===========================================================================

export interface TypeStep {
  readonly kind: "type";
  readonly path: string;
  readonly value: string;
}

export interface BlurStep {
  readonly kind: "blur";
  readonly path: string;
}

export type ScenarioStep = TypeStep | BlurStep;

export interface Scenario {
  readonly id: string;
  readonly what: string;
  /** Capabilities a subject must declare to be scored on this. */
  readonly requires: readonly string[];
  readonly steps: readonly ScenarioStep[];
  /**
   * The path whose issue proves the scenario. For a cross-field scenario this
   * is deliberately NOT a path any step writes.
   */
  readonly provingPath?: string;
  /** True when the root before the steps must carry no issues at all. */
  readonly startsClean: boolean;
  /**
   * Whether the verdict is SUPPOSED to move. A steady-state scenario exists to
   * measure the path where nothing changes, so requiring its verdict to move
   * would be requiring it not to be the scenario it is. It has to prove itself
   * another way: the value must reach the document.
   */
  readonly verdictMoves: boolean;
}
