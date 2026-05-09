// WhatsApp helper for direct purchase links
export const OWNER_WA = "6282135963767";

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

interface BuyParams {
  productName: string;
  price: number;
  username?: string;
  profileCode?: string | null;
}

export const buildBuyMessage = ({ productName, price, username, profileCode }: BuyParams) => {
  const who = username
    ? `*${username}*${profileCode ? ` (#${profileCode})` : ""}`
    : "User";
  return [
    "Halo Owner T48ID 👋",
    "",
    `Saya ${who} ingin membeli:`,
    `• ${productName} — ${fmtIDR(price)}`,
    "",
    "Mohon konfirmasi pembayarannya. Terima kasih! 🙏",
  ].join("\n");
};

export const openWhatsAppBuy = (params: BuyParams) => {
  const text = encodeURIComponent(buildBuyMessage(params));
  const url = `https://wa.me/${OWNER_WA}?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
};
