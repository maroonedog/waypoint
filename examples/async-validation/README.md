# Async validation

Run `npm run example:async-validation` from the repository root, then open
http://localhost:5187. The service is simulated; nothing is sent over the network.

Fill both fields and leave the email field. `taken@example.com` is unavailable.
Another valid address succeeds. Edit the name within five seconds: a completed
answer for the same email is reused. Enable network failure and press Save:
the error blocks submission. Disable it and retry. Saving bypasses both the
cache and the typing delay. The request counter includes cancelled requests.

`src/email-validation.mjs` is a checked JavaScript recipe, not a new library API.
Create it per form, never at module scope on a server. Its cache retains only
the most recent successful lookup (including an unavailable answer), expires
after five seconds and never stores communication failures. A service error
becomes a blocking issue. An aborted pass rejects rather than reporting success.
The tests also exercise transports that ignore cancellation.

The example uses blur validation to limit interruptions. Synchronous failures
return immediately without starting a lookup. When local validation succeeds,
the whole pass awaits the remote answer. This does not provide independent
per-field validation: another pass for the same email can cancel an in-flight
lookup and start it again. Only completed answers are reused. `validateOn:
"change"` is possible, but unrelated typing can repeatedly restart that request.

The save wrapper forces a fresh lookup and the UI disables edits during save.
A real server must validate again and enforce uniqueness atomically when saving:
an availability check does not reserve an address. The wrapper prevents duplicate
submissions through this recipe; it does not change the core submit contract.

Replace `lookup` with a service that accepts `AbortSignal`, checks HTTP failures,
and validates the response before returning an availability boolean. Do not
turn transport errors into `true` or cache them as an availability answer.

Automated coverage: `test/async-validation-example.test.mjs`. Browser smoke checks
confirmed rejection of a taken email, focus returning to that input, a blocking
communication error and successful retry after recovery. Remaining manual acceptance:
use only Tab/Shift+Tab/Enter, cause an invalid submit and verify focus reaches the
first invalid input; then check field labels, error updates and status messages
with a screen reader. That manual audit has not been performed.
