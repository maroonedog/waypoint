// ===========================================================================
// collect-trace.ts — the browser's own measurement of itself.
//
// Numbers come from the trace, never from page JS. A page that times itself
// is a page whose timing is in the sample, and it cannot see the parts that
// matter most here: style, layout, paint and the compositor all happen after
// the last line of script the page could time.
//
// The session is opened on the BROWSER, not on a page, so a single trace spans
// both renderer processes of a pair. Both members of a pair are therefore
// measured inside one tracing session, which removes "which tracing session
// was this" from the ratio entirely.
// ===========================================================================
import type { Browser, CDPSession } from "playwright-core";

export interface TraceEvent {
  readonly name: string;
  readonly cat: string;
  readonly ph: string;
  readonly pid: number;
  readonly tid: number;
  readonly ts: number;
  readonly dur?: number;
  readonly args?: { readonly data?: { readonly type?: string } };
}

/**
 * `devtools.timeline` carries EventDispatch, Layout, UpdateLayoutTree, Paint
 * and Commit; `blink.user_timing` carries the page's begin/end marks, which is
 * how a sample is cut out of a trace that spans the whole browser; `v8` and
 * `disabled-by-default-v8.gc` carries the garbage collection this lane
 * publishes as a column rather than dropping the samples it lands in.
 */
export const TRACE_CATEGORIES: readonly string[] = [
  "devtools.timeline",
  "blink.user_timing",
  "v8",
  "disabled-by-default-v8.gc",
];

export async function startTrace(browser: Browser): Promise<CDPSession> {
  const client = await browser.newBrowserCDPSession();
  await client.send("Tracing.start", {
    transferMode: "ReturnAsStream",
    streamFormat: "json",
    traceConfig: {
      recordMode: "recordAsMuchAsPossible",
      includedCategories: [...TRACE_CATEGORIES],
    },
  } as never);
  return client;
}

const readStream = async (
  client: CDPSession,
  handle: string
): Promise<string> => {
  const parts: string[] = [];
  for (;;) {
    const chunk = (await client.send("IO.read", {
      handle,
      size: 1024 * 1024,
    } as never)) as { data: string; eof: boolean; base64Encoded?: boolean };
    parts.push(
      chunk.base64Encoded === true
        ? Buffer.from(chunk.data, "base64").toString("utf8")
        : chunk.data
    );
    if (chunk.eof) break;
  }
  await client.send("IO.close", { handle } as never);
  return parts.join("");
};

export async function endTrace(
  client: CDPSession
): Promise<readonly TraceEvent[]> {
  const complete = new Promise<{ stream?: string }>((resolve) => {
    client.once("Tracing.tracingComplete", (event) =>
      resolve(event as { stream?: string })
    );
  });
  await client.send("Tracing.end");
  const { stream } = await complete;
  if (stream === undefined) {
    await client.detach();
    throw new Error("the trace produced no stream");
  }
  const text = await readStream(client, stream);
  await client.detach();

  const parsed: unknown = JSON.parse(text);
  const events = Array.isArray(parsed)
    ? parsed
    : (parsed as { traceEvents?: unknown[] }).traceEvents ?? [];
  return events as readonly TraceEvent[];
}
