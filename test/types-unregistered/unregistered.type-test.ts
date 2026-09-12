// ===========================================================================
// unregistered.type-test.ts — an application that registered nothing.
//
// Its own program, because a module augmentation is global: registering a form
// anywhere in a compilation registers it for every file in it, so the
// unregistered case cannot be written beside the registered one.
//
// What is pinned here is the FAILURE DIRECTION. The naive way to read the
// registry compiles this file clean: inferring a path union from an
// unregistered `never` finds no candidate and falls back to the type
// parameter's constraint, `TPath extends string`, so an application that
// forgot to register — or whose registration fell out of the program — gets
// the unchecked hooks back and is told nothing. Every line below is a
// `@ts-expect-error`, and each one fails if that ever happens again.
// ===========================================================================
import { useField, useFieldValue, useRows } from "@maroonedog/waypoint/react";

export function nothingIsAddressable(): void {
  // @ts-expect-error no form type is registered
  useField("owner.email");
  // @ts-expect-error no form type is registered
  useFieldValue("name");
  // @ts-expect-error no form type is registered
  useRows("items");
  // @ts-expect-error a key names nothing when nothing is registered
  useField("order", "owner.email");
}
