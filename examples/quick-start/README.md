# Quick Start

From the repository root, with Node 22.14 or newer:

```sh
npm ci
npm run example:quick-start
```

The command builds waypoint, creates an npm tarball, copies this app to a new
temporary directory outside the workspace, and installs the tarball there with
React, Zod and Vite. It requires registry access for those dependencies. It then
type-checks and bundles the app, tests validation and submission, and starts Vite.
Open the local URL printed by Vite. Stop the server with Ctrl+C.

Enter `invalid` and press Save: an error appears and nothing is saved. Enter
`ada@example.com` and press Save: the result appears below the form. This is a
local demonstration; no backend request is made.

Edit `src/App.tsx` in the printed temporary directory to experiment. That directory
is retained so you can keep using it independently. Restart it with `npm run dev`
from that directory. Its package.json includes the installed local tarball.

For verification without starting a server:

```sh
npm run verify:package
```

No source aliases or workspace links are used. The app's build checks the published
declarations and bundles the installed React binding; the tests exercise the
installed core, Zod resolver, and sample form's invalid-to-valid submission in
jsdom. This recipe uses a local tarball and does not
require waypoint to be published on npm.
