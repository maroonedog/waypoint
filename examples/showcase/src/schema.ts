import { z } from "zod";
import { STATES } from "./regions.js";

const PHONE = /^\+?1?[-. ]?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}$/;
const ZIP = /^\d{5}(-\d{4})?$/;
const REGISTRATION = /^[A-Z]{2}-\d{6}$/;

const address = z.object({
  postcode: z.string().regex(ZIP, "Use a ZIP code such as 10001 or 10001-2345"),
  state: z.enum(STATES),
  city: z.string().min(1, "City is required").max(40),
  street: z.string().min(1, "Street address is required").max(60),
  building: z.string().max(60).optional(),
});

/** The declared limit, stated once so the message and the rule cannot drift. */
export const ORDER_CEILING = 3_000_000;

const money = (amount: number): string =>
  amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export const applicationSchema = z
  .object({
    applicant: z.object({
      lastName: z.string().min(1, "Last name is required").max(20),
      firstName: z.string().min(1, "First name is required").max(20),
      birthDate: z.string().min(1, "Date of birth is required"),
      email: z.email("That is not an email address"),
      phone: z.string().regex(PHONE, "Use a number such as (212) 555-0184"),
    }),
    company: z.object({
      name: z.string().min(1, "Company name is required").max(60),
      department: z.string().max(40).optional(),
      title: z.string().max(40).optional(),
      employees: z.number().min(1, "At least 1").max(1_000_000),
      registration: z
        .string()
        .regex(REGISTRATION, "Two letters, a hyphen, six digits — e.g. NY-004512"),
    }),
    billing: address,
    shipping: address,
    sameAsBilling: z.boolean(),
    items: z.array(
      z.object({
        sku: z.string().min(1, "A product code is required").max(20),
        name: z.string().min(1, "A description is required").max(60),
        quantity: z.number().min(1, "At least 1").max(999),
        unitPrice: z.number().min(0, "0 or more").max(9_999_999),
      })
    ),
    payment: z.enum(["invoice", "card", "transfer"]),
    note: z.string().max(500).optional(),
    agreed: z.boolean(),
  })
  .superRefine((value, ctx) => {
    // A rule that reports against a field OTHER than the one that moved.
    if (value.agreed !== true) {
      ctx.addIssue({
        code: "custom",
        path: ["agreed"],
        message: "The terms have to be accepted",
      });
    }
    if (value.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Add at least one line",
      });
    }
    const total = value.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    if (total > ORDER_CEILING) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: `${money(total)} is over the ${money(ORDER_CEILING)} limit`,
      });
    }
    // The shipping address is judged against billing, and the toggle that
    // hides it does not change what the rule reads.
    if (
      value.sameAsBilling !== true &&
      value.shipping.postcode === value.billing.postcode &&
      value.shipping.street === value.billing.street
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["shipping", "postcode"],
        message:
          "This is the billing address. If that is right, use the switch above",
      });
    }
  });

export const EMPTY_APPLICATION = {
  applicant: {
    lastName: "",
    firstName: "",
    birthDate: "",
    email: "",
    phone: "",
  },
  company: {
    name: "",
    department: "",
    title: "",
    employees: 1,
    registration: "",
  },
  billing: { postcode: "", state: "New York", city: "", street: "", building: "" },
  shipping: { postcode: "", state: "New York", city: "", street: "", building: "" },
  sameAsBilling: true,
  items: [{ sku: "", name: "", quantity: 1, unitPrice: 0 }],
  payment: "invoice",
  note: "",
  agreed: false,
};
