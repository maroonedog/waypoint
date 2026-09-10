// ===========================================================================
// auto-form.tsx — layer 1: every declared field, drawn in declaration order.
//
// It walks the descriptor tree and renders through layer 2, so what it draws
// is whatever the registry says. It imports no widget of its own: an
// application that only uses layer 3 must not carry an input this library
// authored, and an application that supplies its own widgets must not have to
// override one.
//
// A list becomes a FieldRows with a FieldScope per row, so nothing the tree
// produces spells a row number. What surrounds a row — the remove button, the
// heading, the add control — is left to `renderList`, because a list that
// looked the same in every application would be a list nobody could use.
// ===========================================================================
import type { ReactElement, ReactNode } from "react";
import type { DescriptorNode } from "form-core";
import { Field } from "./field.js";
import { FieldRows } from "./field-rows.js";
import { FieldScope } from "./field-scope.js";
import { useForm } from "./use-form.js";
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

function renderNode(
  node: DescriptorNode,
  renderList: AutoFormProps["renderList"]
): ReactElement {
  if (node.kind === "field") {
    return <Field key={node.path} path={node.path} />;
  }
  if (node.kind === "group") {
    return (
      <div key={node.path} data-field-group={node.path}>
        {node.children.map((child) => renderNode(child, renderList))}
      </div>
    );
  }
  return (
    <FieldRows key={node.path} path={node.path}>
      {(binding) => {
        const rows = binding.rows.map((row) => (
          <FieldScope key={row.key} row={row}>
            {node.children.map((child) => renderNode(child, renderList))}
          </FieldScope>
        ));
        return renderList === undefined ? rows : renderList(binding, rows);
      }}
    </FieldRows>
  );
}

export function AutoForm(props: AutoFormProps): ReactElement {
  const form = useForm();
  const { only, renderList } = props;
  const drawn =
    only === undefined
      ? form.tree
      : form.tree.filter((node) => only.includes(node.path));
  return <>{drawn.map((node) => renderNode(node, renderList))}</>;
}
