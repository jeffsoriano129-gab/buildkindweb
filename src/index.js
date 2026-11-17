/**
 * BuildKind Web — edge Worker: Philippines-only access for /ph.
 *
 * The site is static files in ./public, served by Cloudflare's asset handler.
 * wrangler.jsonc ("assets.run_worker_first") sends ONLY /ph and /ph/* to this
 * Worker; every other path is served straight from the static files and never
 * reaches this code.
 */

// ---- Config ----------------------------------------------------------------
const GATED_PREFIX = '/ph';                     // gates /ph and everything under /ph/
const ALLOWED_COUNTRY = 'PH';
const REDIRECT_TO = 'https://buildkindweb.com/'; // where non-PH visitors are sent
const UNKNOWN_COUNTRIES = ['XX', 'T1'];          // XX = unknown, T1 = Tor: let through
// Hosts that skip the country check (local dev and preview deployments).
const ALLOW_HOSTS = ['localhost', '127.0.0.1'];
const ALLOW_HOST_SUFFIXES = ['.pages.dev'];
// Note: this project deploys as a Worker, whose preview URLs end in
// ".workers.dev". It is deliberately NOT listed: if the workers.dev route is
// enabled, listing it would let anyone outside PH bypass the gate there.
// ----------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Anything outside /ph passes through untouched (safety net; normally
    // run_worker_first keeps these requests from reaching the Worker at all).
    if (!isGated(url.pathname)) return env.ASSETS.fetch(request);

    // Non-PH visitor: temporary redirect to the main site, never cached or indexed.
    if (!isAllowed(request, url)) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: REDIRECT_TO,
          'Cache-Control': 'private, no-store',
          Vary: 'CF-IPCountry',
          'X-Robots-Tag': 'noindex',
        },
      });
    }

    // Allowed: serve the static file, but stop shared caches from reusing a
    // response across countries.
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set('Cache-Control', 'private, no-store');
    out.headers.append('Vary', 'CF-IPCountry');
    return out;
  },
};

// True for "/ph" and "/ph/..." (but not e.g. "/phone").
function isGated(path) {
  return path === GATED_PREFIX || path.startsWith(GATED_PREFIX + '/');
}

function isAllowHost(hostname) {
  return ALLOW_HOSTS.includes(hostname) || ALLOW_HOST_SUFFIXES.some(s => hostname.endsWith(s));
}

function isAllowed(request, url) {
  let country;

  if (isAllowHost(url.hostname)) {
    // Dev/preview hosts are always allowed. To try the gate locally, send an
    // "X-Test-Country" header (e.g. US); it is only read on these hosts.
    const test = request.headers.get('X-Test-Country');
    if (!test) return true;
    country = test.toUpperCase();
  } else {
    // Verified bots (e.g. Googlebot) may crawl /ph.
    // TODO: request.cf.botManagement only exists with Cloudflare Bot Management
    // (an Enterprise add-on). Without it this check never matches, so crawlers
    // outside PH are redirected like everyone else and /ph cannot be indexed
    // from them. Alternative on any plan: do the geo-redirect as a WAF/redirect
    // rule using the "Verified bot" field (cf.client.bot) instead of here.
    if (request.cf?.botManagement?.verifiedBot === true) return true;

    // Country from Cloudflare's geolocation, falling back to the header.
    country = (request.cf?.country || request.headers.get('CF-IPCountry') || '').toUpperCase();
  }

  // Unknown location: let through rather than block real visitors.
  if (!country || UNKNOWN_COUNTRIES.includes(country)) return true;

  return country === ALLOWED_COUNTRY;
}
