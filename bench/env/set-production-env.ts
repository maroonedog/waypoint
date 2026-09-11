// ===========================================================================
// set-production-env.ts — chooses the React build before React is loaded.
//
// Imported for its side effect, first, and the subjects are loaded with
// dynamic import afterwards. A development build double-invokes render, warns
// on paths a production build never enters, and carries checks nobody ships,
// so measuring one and reporting it as what a user gets is the first way a
// benchmark of this kind goes wrong.
// ===========================================================================

process.env["NODE_ENV"] = "production";
