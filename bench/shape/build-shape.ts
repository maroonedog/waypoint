// ===========================================================================
// build-shape.ts — the same form at several sizes.
//
// One shape is one schema, one set of defaults the schema accepts, and the
// concrete leaves both imply. Everything downstream takes a shape rather than
// reaching for a module-level schema, which is what lets the sweep exist at
// all — and what stops one subject being measured against a different form
// than another.
//
// The sizes are named by how many leaves they actually render, not by a round
// number somebody hoped for. A reader comparing two rows should not have to
// work out what "flat-60" contained.
// ===========================================================================
import type { FormFieldDescriptor } from "form-contract";
import { zodFormResolver } from "form-contract-resolver-zod";
import { expandDeclaredPath, writeValueAt } from "form-core";
import { makeOrderSchema, fillerPathOf, type OrderValue } from "./order-schema.ts";

export interface Shape {
  readonly id: string;
  readonly schema: object;
  readonly descriptors: readonly FormFieldDescriptor[];
  readonly declaredPaths: readonly string[];
  readonly concretePaths: readonly string[];
  defaults(): unknown;
}

const BASE_DEFAULTS: OrderValue = {
  applicant: {
    lastName: "Lovelace",
    firstName: "Ada",
    email: "ada@example.com",
    phone: "03-1234-5678",
  },
  company: { name: "Analytical Engines", department: "Research", employees: 42 },
  billing: {
    postcode: "100-0001",
    city: "Chiyoda",
    street: "1-1",
    building: "Palace East",
  },
  // The postcodes MATCH, so the cross-field rule is quiet and the defaults are
  // accepted. A root superRefine does not run at all once a leaf has failed.
  shipping: {
    postcode: "100-0001",
    city: "Shibuya",
    street: "2-2",
    building: "Jingumae",
  },
  sameAsBilling: true,
  payment: "invoice",
  note: "",
  agreed: true,
  items: [
    { sku: "A-1", name: "Annual licence", quantity: 1, unitPrice: 120000 },
    { sku: "B-2", name: "Onboarding", quantity: 2, unitPrice: 60000 },
    { sku: "C-3", name: "Support", quantity: 3, unitPrice: 20000 },
  ],
  extra: {},
};

export function buildShape(fillerCount: number): Shape {
  const schema = makeOrderSchema(fillerCount);
  const descriptors = zodFormResolver(schema).fields;
  const declaredPaths = descriptors.map((descriptor) => descriptor.path);

  const makeDefaults = (): unknown => {
    let root: unknown = structuredClone(BASE_DEFAULTS);
    for (let index = 0; index < fillerCount; index += 1) {
      root = writeValueAt(root, fillerPathOf(index), `filler ${index}`);
    }
    return root;
  };

  const seeded = makeDefaults();
  const concretePaths = declaredPaths.flatMap((declared) => [
    ...expandDeclaredPath(seeded, declared),
  ]);

  return {
    id: `leaves-${concretePaths.length}`,
    schema: schema as unknown as object,
    descriptors,
    declaredPaths,
    concretePaths,
    defaults: makeDefaults,
  };
}

/**
 * The sweep. The smallest is the shipped form; the largest is well past where
 * a benchmark that stopped early gets dismissed, and it is the size at which
 * the difference between subjects stops being a constant.
 */
export const SHAPES: readonly Shape[] = [
  buildShape(0),
  buildShape(30),
  buildShape(170),
];
