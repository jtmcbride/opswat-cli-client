# Media proxy

A small Cloudflare Worker that lets the web version of the app load podcast feeds and episode
audio from hosts that don't allow cross-origin requests. The iOS and Android apps don't need it.

It only accepts GET requests from the origins in `ALLOWED_ORIGINS`, only passes through RSS/XML
and audio responses, and caps responses at `MAX_BYTES`, so it can't be used as a general proxy.
(The Origin check stops other websites, not scripts that fake the header; add a Cloudflare rate
limiting rule if that becomes a problem.)

## Deploy

```bash
cd proxy
npx wrangler login     # once, opens Cloudflare in the browser
npx wrangler deploy    # prints the worker URL, e.g. https://leximble-media-proxy.<you>.workers.dev
```

The free Workers plan is enough for personal use.

Then point the web build at it: in the GitHub repo, go to **Settings → Secrets and variables →
Actions → Variables** and add `MEDIA_PROXY_URL` set to the worker URL. The next Pages deploy picks
it up. For local development, put `EXPO_PUBLIC_MEDIA_PROXY=<worker URL>` in `.env.local`.

If you serve the app from another address, add its origin to `ALLOWED_ORIGINS` in
`wrangler.toml` and deploy again.
