// ═══════════════════════════════════════════════════════════════════════════
//  CoreLink ↔ TOUCHMESLOWLYWEB вэбсайт — бэлэн модуль
//  Хэрэглээ: <script src="corelink-web.js"></script>  эсвэл  import { ... } from "./corelink-web.js"
//  Түлхүүр нь anon (нээлттэй) — зөвхөн web_products унших, create_web_order дуудах эрхтэй.
// ═══════════════════════════════════════════════════════════════════════════

const CORELINK_URL = "https://eeurdykmdsihbufsfybf.supabase.co";
const CORELINK_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldXJkeWttZHNpaGJ1ZnNmeWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMzg3MzksImV4cCI6MjA5MjkxNDczOX0.r6EqdNCuuG97iNAtYgr1aXW4cPpLmWvyBIo24CYSxTY";

const HEADERS = {
  apikey: CORELINK_ANON,
  Authorization: `Bearer ${CORELINK_ANON}`,
  "Content-Type": "application/json",
};

/**
 * 1) Бараа, үнэ, үлдэгдэл татах (CoreLink → вэб)
 *    Буцаах: [{ id, sku, barcode, name, category, unit, price, image_url, description, stock, in_stock }]
 *    Жишээ: const products = await CoreLink.loadProducts();
 *           const bySku = Object.fromEntries(products.map(p => [p.sku, p]));
 *           bySku["SPA0392"].in_stock  → true/false
 */
async function loadProducts() {
  const r = await fetch(`${CORELINK_URL}/rest/v1/web_products?select=*&order=name`, { headers: HEADERS });
  if (!r.ok) throw new Error("CoreLink: бараа татахад алдаа " + r.status);
  return r.json();
}

/**
 * 1b) Зөвхөн нэг барааны үлдэгдэл (SKU-гаар)
 */
async function getStock(sku) {
  const r = await fetch(
    `${CORELINK_URL}/rest/v1/web_products?select=sku,stock,in_stock,price&sku=eq.${encodeURIComponent(sku)}`,
    { headers: HEADERS }
  );
  const rows = await r.json();
  return rows[0] || null;
}

/**
 * 2) Захиалга илгээх (вэб → CoreLink)
 *    items: [{ sku: "SPA0392", quantity: 2 }, ...]   — SKU = CoreLink-ийн дотоод код (ижил)
 *    externalId: сайтын захиалгын дугаар (давхар илгээлтээс хамгаална; заавал биш)
 *    pageKey: page нэр — үндсэн утга "TOUCHMESLOWLYWEB" (энэ сайтын захиалга бүр энэ page дор бүртгэгдэнэ)
 *    mode: "callcenter" (оператор залгаж баталгаажуулна — зөвлөмж) | "direct" (шууд захиалга)
 *    Амжилт: { ok: true, mode, total, call_id | order_number }
 *    Алдаа: throw Error("Бараа олдсонгүй: XYZ" / "Утасны дугаар буруу" / ...)
 */
async function submitOrder({ phone, name, address, items, note, externalId, pageKey = "TOUCHMESLOWLYWEB", mode = "callcenter", mergePending, total, paid }) {
  const r = await fetch(`${CORELINK_URL}/rest/v1/rpc/create_web_order`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      p_phone: phone,
      p_name: name || null,
      p_address: address || null,
      p_items: items,
      p_note: note || null,
      p_page_key: pageKey,
      p_external_id: externalId || null,
      p_mode: mode,
      ...(typeof mergePending === "boolean" ? { p_merge_pending: mergePending } : {}),
      ...(typeof total === "number" ? { p_total: total } : {}),
      ...(typeof paid === "boolean" ? { p_paid: paid } : {}),
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || data.hint || "Захиалга илгээхэд алдаа гарлаа");
  return data;
}

// ─── Хэрэглээний жишээ (захиалгын форм) ───
// document.querySelector("#order-form").addEventListener("submit", async (e) => {
//   e.preventDefault();
//   try {
//     const res = await CoreLink.submitOrder({
//       phone: form.phone.value,
//       name: form.name.value,
//       address: form.address.value,
//       items: cart.map(c => ({ sku: c.sku, quantity: c.qty })),
//       note: form.note.value,
//       externalId: "TMS-" + Date.now(),   // Touchmeslowly-ийн захиалгын дугаар
//     });
//     alert(`Захиалга хүлээн авлаа (${res.total.toLocaleString()}₮). Оператор тантай удахгүй холбогдоно.`);
//   } catch (err) {
//     alert("Алдаа: " + err.message);
//   }
// });

const CoreLink = { loadProducts, getStock, submitOrder };
if (typeof window !== "undefined") window.CoreLink = CoreLink;
if (typeof module !== "undefined") module.exports = CoreLink;
