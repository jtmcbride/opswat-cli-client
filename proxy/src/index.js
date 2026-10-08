/**
 * CORS proxy for the Leximble web app: lets the browser load podcast feeds and episode audio from
 * hosts that don't send CORS headers. Deliberately narrow so it isn't an open proxy:
 * - only GET, only from ALLOWED_ORIGINS
 * - only RSS/XML feeds, audio, and Apple's podcast lookup API
 * - responses capped at MAX_BYTES
 */

const AUDIO_PATH = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|mp4)$/i;

function allowedType(type, url) {
  // Apple's lookup API, which maps an Apple Podcasts link to the show's RSS feed.
  if (url.hostname === 'itunes.apple.com' && url.pathname === '/lookup') return true;
  if (/^audio\//i.test(type) || /^video\/mp4/i.test(type)) return true;
  if (/xml|rss|atom/i.test(type)) return true;
  // Some CDNs serve episodes as generic binary.
  if (/octet-stream/i.test(type) && AUDIO_PATH.test(url.pathname)) return true;
  return false;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!allowed.includes(origin)) return new Response('Origin not allowed', { status: 403 });

    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    }
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors });

    let url;
    try {
      url = new URL(new URL(request.url).searchParams.get('url') ?? '');
    } catch {
      return new Response('Missing or invalid url parameter', { status: 400, headers: cors });
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return new Response('Only http and https links are supported', { status: 400, headers: cors });
    }

    let upstream;
    try {
      upstream = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'LeximbleMediaProxy/1.0' } });
    } catch {
      return new Response('Could not reach that site', { status: 502, headers: cors });
    }
    if (!upstream.ok || !upstream.body) {
      return new Response(`The site answered HTTP ${upstream.status}`, { status: 502, headers: cors });
    }

    const type = upstream.headers.get('Content-Type') ?? '';
    if (!allowedType(type, new URL(upstream.url || url))) {
      return new Response('Only podcast feeds and audio files can be loaded', { status: 415, headers: cors });
    }
    const max = Number(env.MAX_BYTES) || 250 * 1024 * 1024;
    const length = Number(upstream.headers.get('Content-Length')) || 0;
    if (length > max) return new Response('File too large', { status: 413, headers: cors });

    // Enforce the cap while streaming too, since Content-Length can be missing or wrong.
    let seen = 0;
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > max) controller.error(new Error('File too large'));
        else controller.enqueue(chunk);
      },
    });
    upstream.body.pipeTo(writable).catch(() => {});

    const headers = { ...cors, 'Content-Type': type, 'Cache-Control': 'private, max-age=300' };
    if (length) headers['Content-Length'] = String(length);
    return new Response(readable, { headers });
  },
};
