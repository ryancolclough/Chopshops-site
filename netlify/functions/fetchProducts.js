// netlify/functions/fetchProducts.js

const NOTION_SECRET = process.env.NOTION_SECRET;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const DEFAULT_TAG = process.env.DEFAULT_TAG || "chopshops-20";

const NOTION_URL = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;

function val(p) {
  if (!p) return null;
  switch (p.type) {
    case "title": return p.title?.[0]?.plain_text ?? null;
    case "rich_text": return p.rich_text?.[0]?.plain_text ?? null;
    case "number": return p.number ?? null;
    case "select": return p.select?.name ?? null;
    case "checkbox": return !!p.checkbox;
    case "url": return p.url ?? null;
    case "files": return p.files?.[0]?.file?.url || p.files?.[0]?.name || null;
    default: return null;
  }
}

function mapRow(page) {
  const props = page.properties || {};
  const name = val(props.Name);
  const productUrl = val(props["Product URL"]);
  const url = productUrl
    ? appendAmazonTag(productUrl, DEFAULT_TAG)
    : `https://www.amazon.com/s?k=${encodeURIComponent(name || "")}&tag=${DEFAULT_TAG}`;
  const image = val(props.Image);
  const price = val(props.Price);
  const category = val(props.Category);
  const approved = !!val(props.Approved);

  if (!approved || !name) return null;

  return { name, url, image, price, category };
}

function appendAmazonTag(url, tag) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("amazon.") || u.hostname.endsWith("amazon.com")) {
      // If no tag, add it. If tag exists, keep existing.
      if (!u.searchParams.get("tag")) u.searchParams.set("tag", tag);
      return u.toString();
    }
  } catch (_) {}
  return url;
}

exports.handler = async () => {
  try {
    if (!NOTION_SECRET || !NOTION_DATABASE_ID) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing NOTION env vars" }),
      };
    }

    const res = await fetch(NOTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_SECRET}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Pull rows; you can add a filter for Approved here if you want server-side
        sorts: [{ property: "Name", direction: "ascending" }],
        page_size: 50,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Notion error:", text);
      return { statusCode: res.status, body: JSON.stringify({ error: "Notion query failed" }) };
    }

    const data = await res.json();
    const items = (data.results || []).map(mapRow).filter(Boolean);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ items }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
