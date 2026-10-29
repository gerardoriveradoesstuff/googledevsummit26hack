/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
  readonly PUBLIC_PORTAL_URL?: string;
}
