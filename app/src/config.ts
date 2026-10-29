// API / portal URLs for the PWA. Set at build/dev time:
//   PUBLIC_API_URL=https://laptop.tailnet.ts.net/api npm run dev
// or put PUBLIC_API_URL=... in app/.env (see app/.env.example). Defaults to the demo server.
const strip = (s: string) => s.replace(/\/+$/, '');

export const API_URL: string = strip(import.meta.env.PUBLIC_API_URL || 'https://demo.ouwap.com/api');
export const PORTAL_URL: string = strip(import.meta.env.PUBLIC_PORTAL_URL || 'https://demo.ouwap.com/portal');
