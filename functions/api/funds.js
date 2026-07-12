// Same-origin proxy for FIPIRAN's fund list (their CORS blocks browser calls).
// Cached at the edge for 1 hour; the upstream data updates daily.
// NOTE: the API host is www.fipiran.com (fipiran.ir does not serve /services/)
// and it returns 403 unless browser-like Referer/User-Agent headers are sent.
const UPSTREAM = "https://www.fipiran.com/services/fund/fundcompare";
const UPSTREAM_HEADERS = {
  accept: "application/json",
  referer: "https://www.fipiran.com/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0",
};

export async function onRequest(context) {
  const cache = caches.default;
  const cacheKey = new Request("https://cache.local/fipiran-fundcompare");

  let res = await cache.match(cacheKey);
  if (res) return res;

  let upstream;
  try {
    upstream = await fetch(UPSTREAM, { headers: UPSTREAM_HEADERS });
  } catch (e) {
    return json({ error: "upstream unreachable", detail: String(e && e.message || e) }, 503);
  }
  if (!upstream.ok) {
    const snippet = (await upstream.text().catch(() => "")).slice(0, 200);
    return json({ error: "upstream status " + upstream.status, snippet }, 503);
  }

  const body = await upstream.text();
  res = new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
