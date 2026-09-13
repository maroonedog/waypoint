// ===========================================================================
// refusals.tsx — the calls this example says do not compile, held to it.
//
// A comment saying "uncomment this and it fails" is a claim nothing runs. Each
// line below carries `@ts-expect-error`, so the claim is checked by
// `npm run test:types` in the same pass that checks the working screens: if
// any of these ever starts compiling, the directive becomes an unused
// suppression and the build fails on THAT.
//
// It renders nothing and nothing imports it. Its whole job is to be compiled.
// ===========================================================================
import type { ReactElement } from "react";
import { Num, Text } from "./shared-fields.js";

export function Refusals(): ReactElement {
  return (
    <>
      {/* Two forms are registered, so an unqualified path is ambiguous. */}
      {/* @ts-expect-error */}
      <Text at="owner.email" label="Owner email" />

      {/* `seats` belongs to the admin form; the customer form has no such place. */}
      {/* @ts-expect-error */}
      <Num at="customer:quotas.seats" label="Seats" />

      {/* A near miss on a real path. */}
      {/* @ts-expect-error */}
      <Text at="admin:owner.emial" label="Owner email" />

      {/* `tenant` is a string, so the number component refuses it. */}
      {/* @ts-expect-error */}
      <Num at="admin:tenant" label="Tenant" />

      {/* No form is named `billing`. */}
      {/* @ts-expect-error */}
      <Text at="billing:owner.email" label="Owner email" />
    </>
  );
}
