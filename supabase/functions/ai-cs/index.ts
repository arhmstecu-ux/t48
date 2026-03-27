import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Kamu adalah CS AI untuk T48ID Store, toko online yang menjual tiket show dan PM (Private Message/Video Call) JKT48.

Informasi penting:
- T48ID Store menjual tiket show theater JKT48 dan sesi PM/VC dengan member JKT48
- Metode pembayaran: QRIS, DANA (082234650836), GoPay (082228075442)
- Setelah pembayaran, pembeli konfirmasi via WhatsApp ke admin
- Membership Show JKT48 seharga Rp38.000
- Harga show bervariasi mulai dari Rp38.000 - Rp175.000

Cara pembelian:
1. Pilih show/PM di katalog
2. Tambahkan ke keranjang
3. Pilih metode pembayaran (QRIS/DANA/GoPay)
4. Bayar sesuai nominal
5. Konfirmasi pembayaran via WhatsApp admin
6. Tunggu konfirmasi dari admin

Replay show tersedia dengan sandi yang diberikan setelah pembelian.

Jawab dalam Bahasa Indonesia yang ramah dan sopan. Jika pertanyaan di luar konteks toko, jawab dengan sopan bahwa kamu hanya bisa membantu terkait T48ID Store.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Terlalu banyak permintaan, coba lagi nanti." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Layanan AI sedang tidak tersedia." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
