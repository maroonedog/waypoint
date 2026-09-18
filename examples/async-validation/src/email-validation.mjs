import { z } from "zod";
import { zodFormResolver } from "@maroonedog/waypoint/resolver-zod";

const schema = z.object({
  email: z.email("Enter a valid email address").meta({ title: "Email" }),
  name: z.string().min(1, "Enter your name").meta({ title: "Name" }),
});

/** @param {number} milliseconds @param {AbortSignal | undefined} signal */
export function waitForQuiet(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Validation superseded", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve(undefined);
    }, milliseconds);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

/**
 * Each form owns its cache. Only completed availability answers are cached;
 * failures never become success, and submission always asks again without delay.
 *
 * @param {{
 *   lookup: (email: string, signal?: AbortSignal) => Promise<boolean>,
 *   delayMs?: number, cacheMs?: number, now?: () => number,
 *   pause?: typeof waitForQuiet
 * }} options
 */
export function createEmailValidation(options) {
  const { lookup, delayMs = 300, cacheMs = 5000, now = Date.now, pause = waitForQuiet } = options;
  /** @type {{ email: string, available: boolean, expires: number } | undefined} */
  let cached;
  let submitting = false;
  /** @type {import("@maroonedog/waypoint").FormAdapter<z.infer<typeof schema>, "email" | "name">} */
  const adapter = {
    fields: zodFormResolver(schema).fields,
    validate(root, signal) {
      const parsed = schema.safeParse(root);
      if (!parsed.success) {
        return parsed.error.issues.map(issue => ({
          path: issue.path.join("."), message: issue.message, code: issue.code,
        }));
      }
      const email = parsed.data.email;
      /** @param {boolean} available */
      const verdict = available => available ? [] : [{
        path: "email", code: "email_taken", message: "This email is already registered",
      }];
      if (!submitting && cached?.email === email && cached.expires > now()) {
        return verdict(cached.available);
      }
      const immediate = submitting;
      return (async () => {
        try {
          if (!immediate) await pause(delayMs, signal);
          if (signal?.aborted) throw new DOMException("Validation superseded", "AbortError");
          const available = await lookup(email, signal);
          // A transport may ignore cancellation: do not cache its stale answer.
          if (signal?.aborted) throw new DOMException("Validation superseded", "AbortError");
          cached = { email, available, expires: now() + cacheMs };
          return verdict(available);
        } catch (error) {
          if (signal?.aborted) throw error;
          return [{ path: "email", code: "lookup_failed",
            message: "Could not check this email. Retry before saving." }];
        }
      })();
    },
  };
  return {
    adapter,
    /**
     * @param {Pick<import("@maroonedog/waypoint/core").FormHandle<z.infer<typeof schema>, "email" | "name">, "submit">} form
     * @param {(root: unknown) => void | Promise<void>} save
     */
    async submit(form, save) {
      if (submitting) throw new Error("A submission is already in progress");
      submitting = true;
      try { return await form.submit(save); }
      finally { submitting = false; }
    },
  };
}
