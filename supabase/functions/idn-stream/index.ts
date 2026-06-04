// Edge function: auto-resolve JKT48 IDN+ live m3u8 via GiStream/CTV.
// Flow: list IDN+ live -> pick first live show -> generate HMAC token -> get CTV stream URL.
// Access: must be premium or admin (same gate as paid livestream).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const IDN_API = "https://v5.jkt48connect.com/api/jkt48/idnplus?apikey=JKTCONNECT";
const TOKEN_API = "https://v5.jkt48connect.com/api/token/generate?apikey=JKTCONNECT";
const SIGNING_PATH = "/api/token/generate?apikey=JKTCONNECT";
const CTV_BASE = "https://ctv.jkt48connect.com";
const PARTNER_KID = "jkt48connect-v1";
const PARTNER_SECRET = "gstream@jkt48connect@2108";

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hmacSHA256Hex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function checkAccess(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return false;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const [{ data: roles }, { data: prof }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", user.id),
    admin.from("profiles").select("premium_until").eq("user_id", user.id).maybeSingle(),
  ]);
  if (roles?.some((r: any) => r.role === "admin")) return true;
  if (prof?.premium_until && new Date(prof.premium_until).getTime() > Date.now()) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ok = await checkAccess(req);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Find a live IDN+ show
    const idnRes = await fetch(IDN_API);
    const idnData = await idnRes.json();
    if (!idnData?.data || !Array.isArray(idnData.data)) {
      return new Response(JSON.stringify({ error: "No IDN data" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const live = idnData.data.find((s: any) => s.status === "live") || idnData.data[0];
    if (!live?.slug) {
      return new Response(JSON.stringify({ error: "Tidak ada live IDN+ saat ini" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const slug: string = live.slug;

    // 2) HMAC headers
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const bodyHash = await sha256Hex("{}");
    const signingStr = `${timestamp}:${nonce}:POST:${SIGNING_PATH}:${bodyHash}`;
    const signature = await hmacSHA256Hex(PARTNER_SECRET, signingStr);

    // 3) Get JWT token
    const tokRes = await fetch(TOKEN_API, {
      method: "POST",
      headers: {
        "x-kid": PARTNER_KID,
        "x-timestamp": timestamp,
        "x-nonce": nonce,
        "x-signature": signature,
        "x-slug": slug,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const tokJson = await tokRes.json();
    if (!tokJson?.status || !tokJson?.data?.token) {
      return new Response(JSON.stringify({ error: "Token gagal: " + (tokJson?.message || "unknown") }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = tokJson.data.token;

    // 4) Get stream URL
    const sRes = await fetch(`${CTV_BASE}/stream?slug=${encodeURIComponent(slug)}`, {
      headers: { "x-api-token": token, "x-slug": slug },
    });
    const sJson = await sRes.json();
    if (!sJson?.success) {
      return new Response(JSON.stringify({ error: sJson?.message || "Stream URL gagal" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const streams = sJson.streams || [];
    const url = streams[0]?.url || "";

    return new Response(JSON.stringify({
      url,
      slug,
      title: live.title || live.name || "",
      image: live.image || live.thumbnail || "",
      qualities: streams.map((s: any, i: number) => ({
        index: i, name: s.NAME || `${s.RESOLUTION?.split("x")[1] || "?"}p`,
        url: s.url, resolution: s.RESOLUTION || "", bandwidth: parseInt(s.BANDWIDTH) || 0,
      })),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
