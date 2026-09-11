// ===========================================================================
// order-defaults.ts — a root the schema accepts.
//
// Frozen and cloned per mount, so no subject can start from another's
// leftovers and no subject can mutate the defaults out from under the next.
// ===========================================================================
import type { OrderValue } from "./order-schema.ts";

const DEFAULTS: OrderValue = {
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
  // The postcodes MATCH, so the cross-field rule is quiet and the defaults
  // are accepted. A root superRefine does not run at all once a leaf fails.
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
};

export const orderDefaults = (): OrderValue => structuredClone(DEFAULTS);
