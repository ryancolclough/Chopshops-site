// netlify/functions/fetchProducts.js
const NOTION_SECRET = process.env.NOTION_SECRET;
const NOTION_DB = process.env.NOTION_DATABASE_ID;

const HEADERS = {
  "Authorization": `Bearer ${NOTION_SECRET}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

exports.handler = async () => {
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB}/query`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ page_size: 50 }) // no filters for now
    });

    if (!res.ok) {
      const t = await res.text();
      return j({ error: "Notion query failed", details: t }, 500);
    }

    const data = await res.json();
    const items = (data.results || [])
      .map(p => mapProduct(p.properties || {}))
      .filter(Boolean);

    return j({ items });
  } catch (err) {
    return j({ error: err.message }, 500);
  }
};

// Tries multiple common column names so you don't have to rename your DB
function mapProduct(pr) {
  const title =
    pr.Name?.title?.[0]?.plain_text ||
    pr.Title?.title?.[0]?.plain_text ||
    pr.Product?.title?.[0]?.plain_text || "";

  const url =
    pr["Product URL"]?.url ||
    pr.URL?.url ||
    pr.Link?.url ||
    rich(pr["Product URL"]?.rich_text) ||
    rich(pr.URL?.rich_text) ||
    rich(pr.Link?.rich_text) || "";

  const files =
    pr.Image?.files ||
    pr.Images?.files ||
    pr.Photo?.files ||
    pr.Cover?.files || [];
  const image = files[0]?.external?.url || files[0]?.file?.url || null;

  const price =
    num(pr.Price?.number) ||
    num(pr.Cost?.number) ||
    num(pr["List Price"]?.number);

  const clicks = num(pr.Clicks?.number);
  const conversions = num(pr.Conversions?.number);
  const cr = clicks ? conversions / clicks : 0;

  if (!title || !url) return null;
  return { title, url, image, price, clicks, conversions, cr };
}

const num = n => (typeof n === "number" && !isNaN(n)) ? n : 0;
const rich = rt => Array.isArray(rt) ? rt.map(r => r.plain_text).join("") : "";
const j = (body, statusCode=200) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "access-control-allow-origin": "*"
  },
  body: JSON.stringify(body)
});
