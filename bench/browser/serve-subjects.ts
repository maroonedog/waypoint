// ===========================================================================
// serve-subjects.ts — the built page, on its own origin, cross-origin isolated.
//
// Two servers, on two ports, because two ports are two origins and two origins
// are two renderer processes. A pair measured inside one process shares an
// allocator, a compiled-code cache and a main thread with whatever the other
// member just did; that is precisely the residue interleaving exists to
// cancel, and it is cheaper to not create it than to average it away.
//
// COOP/COEP because `crossOriginIsolated` is what un-coarsens
// `performance.now()` — 5 µs isolated against 100 µs not. The page asserts it
// rather than assuming these headers arrived.
// ===========================================================================
import { createServer, type Server } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

export interface ServedOrigin {
  readonly origin: string;
  close(): Promise<void>;
}

export function serveSubjects(root: string, port: number): Promise<ServedOrigin> {
  const server: Server = createServer((request, response) => {
    const path = (request.url ?? "/").split("?")[0] ?? "/";
    const file = join(root, normalize(path === "/" ? "/index.html" : path));
    if (!file.startsWith(normalize(root)) || !existsSync(file)) {
      response.writeHead(404).end("not here");
      return;
    }
    response.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-embedder-policy": "require-corp",
      "cross-origin-resource-policy": "same-origin",
      "cache-control": "no-store",
    });
    response.end(readFileSync(file));
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}
