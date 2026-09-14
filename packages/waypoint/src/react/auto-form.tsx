// ===========================================================================
// auto-form.tsx — layer 1: every declared field, drawn in declaration order.
//
// It walks the descriptor tree and renders through layer 2, so what it draws
// is whatever the registry says. It imports no widget of its own: an
// application that only uses layer 3 must not carry an input this library
// authored, and an application that supplies its own widgets must not have to
// override one.
//
// A list becomes a FieldRows, and the row's index is bound onto the child
// paths HERE. It used to be supplied by a <FieldScope row> wrapper, which
// meant every path below that wrapper was rewritten whether it wanted to be —
// a component inside it asking for a path elsewhere in the form silently got a
// nonexistent one. Binding where the walk already knows the index keeps that
// from being anybody else's problem.
//
// What surrounds a row — the remove button, the heading, the add control — is
// left to `renderList`, because a list that looked the same in every
// application would be a list nobody could use.
//
// The paths here are RUN-TIME data: they are read out of the descriptor tree
// and have row indices spliced into them, so no type describes them and the
// two casts below say so. This is the one layer where that is not a loss —
// layer 1 exists to draw a form nobody wrote component code for, and checking
// a path against a registry only means anything where somebody typed it.
//
// SO THIS IS WHERE A QUALIFIED PATH IS MINTED RATHER THAN CHECKED. `<Field>`
// and `<FieldRows>` take a path that names its form, and the tree's paths name
// none — they are one form's own vocabulary. The name comes from the enclosing
// provider, which is the same place the hooks compare against, so the paths
// this mints are the paths those would accept. The alternative was to leave
// `<Field>` a door that still takes an unqualified path, which would reopen
// for every caller what it was closed for here.
// ===========================================================================
import { useContext, Fragment, type ReactElement, type ReactNode } from "react";
import { bindDeclaredPath, type DescriptorNode } from "../core/index.js";
import { Field } from "./field.js";
import { FieldRows } from "./field-rows.js";
import { FormKeyContext } from "./form-key-context.js";
import { formPathWithin } from "../dom/parse-qualified-path.js";
import { useFormHandle } from "./use-form.js";
import type { RowsBinding } from "./use-rows.js";
import type { FormDeclaredPath } from "../contract/index.js";

export interface AutoFormProps {
  /**
   * Draw only these top-level declarations; omit for all of them.
   *
   * DECLARED paths — the rule — because that is what the tree is keyed by: a
   * whole list is `form:items[*]`, and the place union has no spelling that
   * means the list itself. They are qualified like every other path a caller
   * writes, and the form is taken off again before they are matched against
   * the tree, which knows only its own.
   *
   * THE TREE STORES A LIST UNDER ITS OWN PATH and hangs the row under
   * `${path}[*]`, so the node to compare against is not the string on the
   * node. `nameOf` below puts the suffix back. Before it did,
   * `only={["form:items[*]"]}` — the spelling this type names, the spelling
   * the comment above recommends, and the spelling the type test asserts —
   * matched no node and drew nothing at all, with no error anywhere: the
   * checked spelling being the broken one, which is the defect shape this
   * package exists to make impossible.
   */
  readonly only?: readonly FormDeclaredPath[];
  /**
   * Wraps one list. It receives the rows binding and the already-rendered
   * rows, so an application decides the chrome and this component decides
   * nothing.
   */
  readonly renderList?: (
    binding: RowsBinding,
    rows: ReactNode
  ) => ReactNode;
}

/** The declared path with this walk's row indices already in it. */
const boundToRows = (
  declaredPath: string,
  indices: readonly number[]
): string =>
  bindDeclaredPath(declaredPath, indices) ?? declaredPath;

function renderNode(
  node: DescriptorNode,
  renderList: AutoFormProps["renderList"],
  indices: readonly number[],
  formKey: string
): ReactElement {
  // `here` is this form's own vocabulary — what the tree holds, and what the
  // DOM carries. `qualified` is what a caller would have typed.
  const here = boundToRows(node.path, indices);
  const qualified = `${formKey}:${here}`;
  if (node.kind === "field") {
    return <Field key={here} path={qualified as never} />;
  }
  if (node.kind === "group") {
    return (
      <div key={here} data-field-group={here}>
        {node.children.map((child) =>
          renderNode(child, renderList, indices, formKey)
        )}
      </div>
    );
  }
  return (
    <FieldRows key={here} path={qualified as never}>
      {(binding) => {
        const rows = binding.rows.map((row) => (
          <Fragment key={row.key}>
            {node.children.map((child) =>
              renderNode(child, renderList, [...indices, row.index], formKey)
            )}
          </Fragment>
        ));
        return renderList === undefined ? rows : renderList(binding, rows);
      }}
    </FieldRows>
  );
}

/** What a caller writes to name this node: a list wears its `[*]`. */
const nameOf = (node: DescriptorNode): string =>
  node.kind === "list" ? `${node.path}[*]` : node.path;

export function AutoForm(props: AutoFormProps): ReactElement {
  const form = useFormHandle();
  const formKey = useContext(FormKeyContext);
  const { only, renderList } = props;
  const drawn =
    only === undefined
      ? form.tree
      : form.tree.filter((node) =>
          only.some(
            (wanted) => formPathWithin(wanted as string, formKey) === nameOf(node)
          )
        );
  return <>{drawn.map((node) => renderNode(node, renderList, [], formKey))}</>;
}
