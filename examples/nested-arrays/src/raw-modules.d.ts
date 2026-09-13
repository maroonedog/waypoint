// Vite's `?raw` import, declared so the type check sees what the bundler does.
//
// It is here rather than pulled in from `vite/client` because that reference
// brings every ambient Vite type with it, and this example needs exactly one.
declare module "*?raw" {
  const content: string;
  export default content;
}
