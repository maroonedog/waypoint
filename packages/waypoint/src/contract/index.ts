export type { FormFieldConstraints } from "./form-field-constraints.types.js";
export type {
  FormFieldChoice,
  FormFieldDescriptor,
  FormFieldKind,
} from "./form-field-descriptor.types.js";
export type { FormIssue, FormIssueSeverity } from "./form-issue.types.js";
export type {
  FormAdapter,
  FormPaths,
  FormValues,
  PartialValidationResult,
} from "./form-adapter.types.js";
export type { FieldPath } from "./field-path.types.js";
export type {
  AddressablePath,
  ConcretePath,
  DeclaredOf,
  PartlyBoundPath,
} from "./addressable-path.types.js";
export type { InhabitedPath } from "./inhabited-path.types.js";
export type { ValueAtPath } from "./value-at-path.types.js";
export type { ElementOf } from "./element-of.types.js";
export type { IsOpaqueObject, OpaqueObject } from "./opaque-object.types.js";
export { isPending } from "./maybe-async.types.js";
export type { MaybeAsync } from "./maybe-async.types.js";
export type {
  PollableAbortSignal,
  ValidationSignal,
} from "./validation-signal.types.js";
// ---------------------------------------------------------------------------
// The registry, and the path types an application reads out of it.
//
// IT LIVES IN THE ROOT ENTRY AND NOT IN `./react`, and the move is what lets a
// second framework exist at all. An augmentation names a MODULE, so declaring
// it on `@maroonedog/waypoint/react` made the registry React's: a Vue binding
// would have had to own a second one, and a design-system component taking
// `FormPathTo<string>` would read a different interface depending on which
// framework compiled it. One application, two registries, and a shared leaf
// that cannot be shared.
//
// The root entry is where `FormAdapter` is declared, and the registry is a map
// of names to adapters — so this is the entry it was always about. `./react`
// re-exports every name below, because a React file reaching for a path type
// should not have to know where the declaration sits.
// ---------------------------------------------------------------------------
export type {
  AnyCode,
  AnyPath,
  AnyValues,
  ArrayPath,
  CodesAtFormPath,
  CodesFor,
  FormColumnPath,
  FormDeclaredPath,
  FormKey,
  FormKeyOfPath,
  FormListPath,
  FormLocalPath,
  FormPath,
  FormPathOver,
  FormPathTo,
  InhabitedFormPath,
  PathsFor,
  ValueAtFormPath,
  ValueOfPath,
  ValuesAtFormPath,
  ValuesFor,
  WaypointForms,
} from "./waypoint-forms.js";
