// ===========================================================================
// schema.ts — two forms that disagree about what a path means.
//
// Both declare `owner.email` and both declare `quotas`, and they mean
// different things by them: one is a customer's own record, the other is an
// administrator's view of a tenant. That overlap is the point. With one global
// registry and unqualified paths, `useField("owner.email")` on a page holding
// both has to pick one, and whichever it picks is wrong half the time.
//
// `seats` exists in one of them only, which is what makes a misspelling
// visible: `admin:quotas.seats` compiles and `customer:quotas.seats` does not.
// ===========================================================================
import { z } from "zod";

export const customerSchema = z.object({
  owner: z.object({
    name: z.string().min(1, "Required"),
    email: z.email("That is not an email address"),
  }),
  quotas: z.object({
    storageGb: z.number().min(1, "At least 1 GB").max(100),
  }),
});

export const adminSchema = z.object({
  tenant: z.string().min(2, "At least 2 characters"),
  owner: z.object({
    email: z.email("That is not an email address"),
  }),
  quotas: z.object({
    seats: z.number().min(1, "At least one seat").max(5_000),
    storageGb: z.number().min(1, "At least 1 GB").max(100_000),
  }),
});

export const EMPTY_CUSTOMER = {
  owner: { name: "", email: "" },
  quotas: { storageGb: 5 },
};

export const EMPTY_ADMIN = {
  tenant: "",
  owner: { email: "" },
  quotas: { seats: 10, storageGb: 500 },
};
