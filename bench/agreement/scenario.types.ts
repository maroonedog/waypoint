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
   * Whether the harness settles after EVERY step, or only after the last one.
   *
   * Required rather than defaulted, because when it is `false` it is the whole
   * point of the scenario. Draining after each keystroke is the one
   * arrangement in which coalescing and debouncing buy nothing: every library
   * gets its pass per character whether it wanted one or not, so a harness
   * that only ever drains per keystroke cannot measure the mechanism those
   * features exist to be. A burst says `false` and is read at the end.
   */
  readonly settlesBetweenSteps: boolean;
  /**
   * Whether the verdict is SUPPOSED to move. A steady-state scenario exists to
   * measure the path where nothing changes, so requiring its verdict to move
   * would be requiring it not to be the scenario it is. It has to prove itself
   * another way: the value must reach the document.
   */
  readonly verdictMoves: boolean;
}
