// Same-origin proxy for FIPIRAN's fund list (their CORS only allows fipiran.ir).
// Cached at the edge for 1 hour; the upstream data updates daily.
const UPSTREAM = "https://fipiran.ir/services/fund/fundcompare";

export async function onRequest(context) {
  const cache = caches.default;
  const cacheKey = new Request("https://cache.local/fipiran-fundcompare");

  let res = await cache.match(cacheKey);
  if (res) return res;

  let upstream;
  try {
    upstream = await fetch(UPSTREAM, { headers: { accept: "application/json" } });
  } catch (e) {
    return json({ error: "upstream unreachable" }, 502);
  }
  if (!upstream.ok) return json({ error: "upstream status " + upstream.status }, 502);

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
