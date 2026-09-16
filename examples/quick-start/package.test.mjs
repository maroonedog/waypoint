import { test } from "node:test";
import assert from "node:assert/strict";
import { lstat, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createForm } from "@maroonedog/waypoint/core";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";

test("uses an installed package, not a workspace link", async () => {
  const packageDirectory = new URL("./node_modules/@maroonedog/waypoint/", import.meta.url);
  assert.equal((await lstat(packageDirectory)).isSymbolicLink(), false);
  const installed = await realpath(packageDirectory);
  const resolved = await realpath(fileURLToPath(import.meta.resolve("@maroonedog/waypoint/core")));
  assert.ok(resolved.startsWith(installed + (process.platform === "win32" ? "\\" : "/")));
});

test("installed resolver blocks invalid data and submits valid data", async () => {
  const adapter = zodFormResolver(z.object({ email: z.email() }));
  const form = createForm({ adapter, defaultValues: { email: "invalid" } });
  const submitted = [];
  const invalid = await form.submit((values) => { submitted.push(values); });
  assert.equal(invalid.submitted, false);
  assert.ok(invalid.blockedBy.some((issue) => issue.path === "email"));
  assert.deepEqual(submitted, []);
  form.reset({ email: "ada@example.com" });
  const valid = await form.submit((values) => { submitted.push(values); });
  assert.equal(valid.submitted, true);
  assert.deepEqual(submitted, [{ email: "ada@example.com" }]);
});
