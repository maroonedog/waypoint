export const EDITOR_WORKLOADS = [
  { id: "one-form-one-file", forms: 1, depth: 3, callsPerFile: 27 },
  { id: "one-form-many-files", forms: 1, depth: 3, callsPerFile: 1 },
  { id: "ten-forms", forms: 10, depth: 3, callsPerFile: 3 },
  { id: "thirty-forms", forms: 30, depth: 3, callsPerFile: 3 },
  { id: "deep-form", forms: 1, depth: 5, callsPerFile: 3 },
];

// Distinct object literals avoid giving the compiler a shared subtree to memoize.
function objectShape(depth, prefix = "") {
  if (depth === 0) return { type: "string", leaves: [prefix] };
  const children = Array.from({ length: 3 }, (_, index) => {
    const key = `p${index}`;
    return { key, ...objectShape(depth - 1, prefix ? `${prefix}.${key}` : key) };
  });
  return {
    type: `{ ${children.map(child => `${child.key}: ${child.type}`).join("; ")} }`,
    leaves: children.flatMap(child => child.leaves),
  };
}

export function editorSources(workload) {
  const shape = objectShape(workload.depth);
  const files = new Map();
  const allPaths = [];
  for (let index = 0; index < workload.forms; index++) {
    const key = `form${index}`;
    const rootType = workload.mixedValues && index % 3 !== 0
      ? shape.type.replaceAll("string", index % 3 === 1 ? "number" : "boolean")
      : shape.type;
    files.set(`registry-${index}.ts`, `
import type { FormAdapter, FieldPath } from "@maroonedog/waypoint";
type Root = ${rootType};
declare const adapter: FormAdapter<Root, FieldPath<Root>>;
declare module "@maroonedog/waypoint" {
  interface WaypointForms { ${key}: typeof adapter }
}
`);
    const paths = shape.leaves.map(path => `${key}:${path}`);
    allPaths.push(...paths);
    for (let offset = 0; offset < paths.length; offset += workload.callsPerFile) {
      files.set(`view-${index}-${offset}.ts`, `
import { useField } from "@maroonedog/waypoint/react";
export function view() {
${paths.slice(offset, offset + workload.callsPerFile).map(path => `  useField(${JSON.stringify(path)});`).join("\n")}
}
`);
    }
  }
  return { files, paths: allPaths, leavesPerForm: shape.leaves.length };
}

export function probeSource(path) {
  const source = `import { useField } from "@maroonedog/waypoint/react";
export const value = useField(${JSON.stringify(path)}).value;
`;
  return {
    source,
    completionPosition: source.lastIndexOf('"'),
    hoverPosition: source.indexOf("const value") + "const ".length,
  };
}
