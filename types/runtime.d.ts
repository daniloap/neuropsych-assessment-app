// The hosting runtime supplies this module. It is never polyfilled in the browser.
declare module "cloudflare:workers" {
  export const env: { DB: import("drizzle-orm/d1").AnyD1Database };
}
