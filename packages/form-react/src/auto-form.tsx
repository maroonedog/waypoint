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
// ===========================================================================
import { Fragment, type ReactElement, type ReactNode } from "react";
import { bindDeclaredPath, type DescriptorNode } from "form-core";
import { Field } from "./field.js";
import { FieldRows } from "./field-rows.js";
import { useFormHandle } from "./use-form.js";
import type { RowsBinding } from "./use-rows.js";

export interface AutoFormProps {
  /** Draw only these top-level paths; omit for all of them. */
  readonly only?: readonly string[];
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
const at = (declaredPath: string, indices: readonly number[]): string =>
  bindDeclaredPath(declaredPath, indices) ?? declaredPath;

function renderNode(
  node: DescriptorNode,
  renderList: AutoFormProps["renderList"],
  indices: readonly number[]
): ReactElement {
  const here = at(node.path, indices);
  if (node.kind === "field") {
    return <Field key={here} path={here as never} />;
  }
  if (node.kind === "group") {
    return (
      <div key={here} data-field-group={here}>
        {node.children.map((child) => renderNode(child, renderList, indices))}
      </div>
    );
  }
  return (
    <FieldRows key={here} path={here as never}>
      {(binding) => {
        const rows = binding.rows.map((row) => (
          <Fragment key={row.key}>
            {node.children.map((child) =>
              renderNode(child, renderList, [...indices, row.index])
            )}
          </Fragment>
        ));
        return renderList === undefined ? rows : renderList(binding, rows);
      }}
    </FieldRows>
  );
}

export function AutoForm(props: AutoFormProps): ReactElement {
  const form = useFormHandle();
  const { only, renderList } = props;
  const drawn =
    only === undefined
      ? form.tree
      : form.tree.filter((node) => only.includes(node.path));
  return <>{drawn.map((node) => renderNode(node, renderList, []))}</>;
}
