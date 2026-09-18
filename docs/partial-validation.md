# Partial validation

Partial execution is an optional adapter capability. It avoids unrelated rule
execution and preserves issues outside the validated scopes. It is distinct
from filtering the results of whole-form validation, and from the provider's
`partial` prop, which only concerns field coverage on a screen.

## Zod

```ts
const adapter = zodFormResolver(schema, { partial: true });
const form = createForm({ adapter, defaultValues });

form.field("email").setValue("ada@example.com"); // scheduled partial pass
await form.field("email").validate();           // immediate partial pass
await form.validate(["email", "profile.name"]); // explicit scopes
await form.field("email").issuesFor("candidate"); // no store mutation
await form.validate();                          // whole form
await form.submit(save);                        // always whole form
```

The default remains whole-form execution. `validateOn` controls when edits and
blur events schedule validation. With partial execution enabled, Zod selects
the requested **top-level subtrees**. Editing `profile.name` validates all of
`profile`, including its nested refinements. Editing `items[0].name` validates
the entire `items` array. This preserves container constraints and sibling-row
checks while skipping unrelated top-level fields. It is not leaf-only execution.

Zod object-level refinements prevent safe selection: the resolver falls back
to the original whole-form schema. Invalid root shapes, unknown requested keys,
extra root keys and unsupported selection also use that fallback. Strict-object
unknown-key checks are preserved. Async refinements are supported, but Zod does
not receive an AbortSignal; stale results are discarded by the runtime.
If a refinement closes over other form fields outside its own subtree, leave
partial execution disabled or implement an adapter that expands those dependencies.
Such external reads cannot be inferred from the Zod object shape.

Reset, row operations, participation changes and submission request whole-form
validation. A previous root-level issue also forces a whole-form pass, so it can
be cleared correctly. Calling `validate([])` means whole-form validation.

Scoped form validation returns the issues from the actual executed scope, which
can be wider than requested. Field validation returns only that field's issues.
The committed form status includes retained errors and adopted server errors.
Fields not yet validated can still fail when submission validates the whole form.

## Valibot

Use `valibotFormResolver(schema, { partial: true })`. Plain `object`,
`strictObject`, `looseObject` and `objectWithRest` schemas support selecting
top-level subtrees through Valibot's public `pick` API, including their async
variants. Async schemas still require explicit `fields` for descriptors.

Nested pipes and array checks remain inside the selected subtree. Root pipes,
fallback wrappers, unsupported root schemas, extra root keys and unknown request
keys use whole-form validation. A wrapper whose selected runner emits issues
outside the selected scopes also falls back rather than committing an incomplete
verdict. Wrapper schemas are not guaranteed to skip unrelated execution.
Cross-subtree dependencies hidden in closures require whole-form validation or
a custom adapter with explicit dependency expansion.

Native issue codes and validation config are preserved. All issues are collected
even when Valibot's global config requests early abort. Transformed output does
not replace the form's input values. Submit always validates the original schema.

## Custom adapters and dependencies

Implement the optional `FormAdapter.validatePartial(root, paths, signal?)`:

```ts
validatePartial(root, paths) {
  // Example: both rules depend on either password field.
  if (paths.every(path => path === "password" || path === "confirmation")) {
    return {
      paths: ["password", "confirmation"],
      issues: validatePasswords(root),
    };
  }
  return { paths: [""], issues: validateWholeForm(root) };
}
```

The adapter must expand every request to all affected dependencies. Returned
`paths` describe complete replacement subtrees, including requested paths; `""`
means the whole root. Return **all** issues in those scopes, not just new issues.
An empty issues array clears those scopes. Other issues remain untouched. Paths
are concrete; wildcards are rejected. Issues outside the declared replacement
scopes and incomplete coverage are rejected without committing the result.

The runtime coalesces changed paths. If an async pass is superseded, its unfinished
scopes are included in the next pass; a failed pass retains its work for retry.
A pending whole-form request cannot be downgraded to partial validation. A signal
is available when the method declares its third parameter, and newer passes abort
the prior signal. This currently uses one scheduler per form, not independent
concurrent field schedulers.

Adapters without this method, including the Standard Schema resolver, retain
their existing whole-form behavior.

## Luq 2.9.0 and later

```ts
const adapter = luqFormResolver(toStandardJsonSchema(validator), {
  partial: true,
  dependencies: { password: ["confirmation"] },
});
```

The resolver calls `createPartialValidator` from `@maroonedog/luq/form` to execute
a selected plan. It does not use `pick` or `pickAll`, which still perform full
validation before filtering. Install the optional `@maroonedog/luq` peer at
version 2.9.0 or later in the 2.x line when using this resolver.

Requests are expanded to top-level subtrees, preserving parent and sibling-row
rules. `dependencies` maps a changed subtree to other subtrees whose rules read
it. Expansion is transitive and tolerates cycles; nested dependency paths are
expanded to their top-level subtree as well. Dependencies are **not inferred**
from rule callbacks or `compareField`: declare cross-subtree reads explicitly,
or leave partial execution disabled. An empty-string dependency forces a full
pass. Rules receive the complete root value, including unselected siblings.

Every failing rule in the selected scope is collected, even if Luq's default
config stops early. Native codes and severity filtering are retained. Unsupported
selection, invalid root shapes, legacy objects without a Luq plan, and issues
outside the selected scope fall back to full validation. User rule exceptions
still propagate. Submission always calls the original whole-form validator.

## Verification and size

Regression coverage counts unrelated rule calls, preserves unrelated/adopted
issues, expands dependency scopes, retries failed async scopes, discards stale
answers, and checks whole-form submission, reset and row removal. These tests
also run against the packed package in an independent consumer.

The Zod resolver adds schema selection and safe fallback handling. `npm run size`
measured its minified bundle at 7,400 bytes and gzip at 2,905 bytes, compared with
the previous recorded 2,596 gzip bytes. Only that entry's size baseline was
updated, retaining the established 10% margin (3,196 bytes); other entry budgets
were preserved. `npm run size:check` and `npm run bench:self-audit:check` pass.

Connecting Luq's selected-plan API and dependency expansion measured 5,906
minified bytes / 2,499 gzip bytes for the resolver, versus the recorded 2,136
gzip bytes. Its budget was updated to 2,749 bytes with the same 10% margin.
These resolver measurements exclude the external validator package, including
Luq's own plan-selection implementation; they are not total application sizes.
