// Edge function: proxy HLS playlist & .ts segments while hiding origin URL.
// Routes:
//   GET /m3u8-proxy?type=playlist        -> returns rewritten master/variant .m3u8
//   GET /m3u8-proxy?type=variant&u=B64   -> returns rewritten variant playlist for given encoded URL
//   GET /m3u8-proxy?type=seg&u=B64       -> proxies a segment / key
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function b64urlEncode(s: string) {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function checkAccess(req: Request): Promise<{ ok: boolean; reason?: string }> {
  const auth = req.headers.get("Authorization");
  if (!auth) return { ok: false, reason: "no auth" };
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user?.email) return { ok: false, reason: "not signed in" };

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  // admin role bypass
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (roles?.some((r: any) => r.role === "admin")) return { ok: true };

  const { data: row } = await admin
    .from("paid_livestream_access")
    .select("expires_at")
    .ilike("email", user.email)
    .maybeSingle();
  if (!row) return { ok: false, reason: "no access" };
  if (new Date(row.expires_at).getTime() < Date.now())
    return { ok: false, reason: "expired" };
  return { ok: true };
}

function rewritePlaylist(text: string, baseUrl: string, proxyBase: string) {
  const base = new URL(baseUrl);
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Rewrite EXT-X-KEY URI="..."
    if (line.startsWith("#EXT-X-KEY") || line.startsWith("#EXT-X-MAP") || line.startsWith("#EXT-X-MEDIA")) {
      line = line.replace(/URI="([^"]+)"/g, (_m, uri) => {
        const abs = new URL(uri, base).toString();
        return `URI="${proxyBase}?type=seg&u=${b64urlEncode(abs)}"`;
      });
      out.push(line);
      continue;
    }
    if (line.startsWith("#") || line.trim() === "") {
      out.push(line);
      continue;
    }
    // It's a URL line (variant playlist or segment)
    const abs = new URL(line.trim(), base).toString();
    const isPlaylist = /\.m3u8(\?|$)/i.test(abs);
    const type = isPlaylist ? "variant" : "seg";
    out.push(`${proxyBase}?type=${type}&u=${b64urlEncode(abs)}`);
  }
  return out.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const proxyBase = `${url.origin}${url.pathname}`;

    // Access check (skip for OPTIONS already handled)
    const access = await checkAccess(req);
    if (!access.ok) {
      return new Response(JSON.stringify({ error: "Forbidden", reason: access.reason }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "playlist") {
      // Fetch active m3u8 from settings
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: s } = await admin
        .from("paid_livestream_settings")
        .select("m3u8_url")
        .limit(1)
        .maybeSingle();
      const target = s?.m3u8_url;
      if (!target) {
        return new Response("No stream configured", {
          status: 404,
          headers: corsHeaders,
        });
      }
      const r = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" } });
      const text = await r.text();
      const rewritten = rewritePlaylist(text, target, proxyBase);
      return new Response(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (type === "variant") {
      const u = url.searchParams.get("u");
      if (!u) return new Response("Missing u", { status: 400, headers: corsHeaders });
      const target = b64urlDecode(u);
      const r = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" } });
      const text = await r.text();
      const rewritten = rewritePlaylist(text, target, proxyBase);
      return new Response(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (type === "seg") {
      const u = url.searchParams.get("u");
      if (!u) return new Response("Missing u", { status: 400, headers: corsHeaders });
      const target = b64urlDecode(u);
      const range = req.headers.get("range");
      const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0" };
      if (range) headers["Range"] = range;
      const r = await fetch(target, { headers });
      const respHeaders: Record<string, string> = { ...corsHeaders };
      const ct = r.headers.get("content-type");
      if (ct) respHeaders["Content-Type"] = ct;
      const cl = r.headers.get("content-length");
      if (cl) respHeaders["Content-Length"] = cl;
      const cr = r.headers.get("content-range");
      if (cr) respHeaders["Content-Range"] = cr;
      const ar = r.headers.get("accept-ranges");
      if (ar) respHeaders["Accept-Ranges"] = ar;
      return new Response(r.body, { status: r.status, headers: respHeaders });
    }

    return new Response("Bad type", { status: 400, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
