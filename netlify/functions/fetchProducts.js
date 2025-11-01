// netlify/functions/fetchProducts.js
const NOTION_SECRET = process.env.NOTION_SECRET;
const NOTION_DB = process.env.NOTION_DATABASE_ID;
const DEFAULT_TAG = process.env.DEFAULT_TAG || "chopshops-20";

const HEADERS = {
  "Authorization": `Bearer ${NOTION_SECRET}`,
  "Notion-Version": "2025-09-03",
  "Content-Type": "application/json",
};

// Your live column names from the export:
const COLS = {
  LIKE: "Like This Idea",
  NAME: "Product Name",
  WHY: "Why It Saves Money",
  PRICE: "Est. Price (USD)",
  CATEGORY: "Category",
  HOOK: "Video Idea / Hook",
  STATUS: "Status",
  // Optional (supported if you add later):
  URL: "Product URL",
  IMAGE: "Image",
};

exports.handler = async () => {
  try {
    // No filter so we can see everything; we’ll filter in code.
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB}/query`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ page_size: 100 }),
    });

    if (!res.ok) {
      const text = await res.text();
      return j({ error: "Notion query failed", details: text }, 500);
    }

    const data = await res.json();

    const items = (data.results || [])
      .map(page => mapRow(page.properties || {}))
      .filter(Boolean);

    return j({ items });
  } catch (err) {
    return j({ error: err.message }, 500);
  }
};

/** ---------- helpers ---------- */

function mapRow(p) {
  // Readers by Notion prop type
  const val = (prop) => {
    if (!prop) return null;
    switch (prop.type) {
      case "title":        return prop.title?.[0]?.plain_text?.trim() || "";
      case "rich_text":    return prop.rich_text?.[0]?.plain_text?.trim() || "";
      case "url":          return prop.url || "";
      case "files": {
        const f = prop.files?.[0];
        return f?.external?.url || f?.file?.url || "";
      }
      case "number":       return (typeof prop.number === "number" ? prop.number : null);
      case "select":       return prop.select?.name || "";
      case "multi_select": return (prop.multi_select || []).map(x => x.name);
      case "checkbox":     return !!prop.checkbox;
      default:             return null;
    }
  };

  // Pull your columns (with tolerant fallbacks)
  const title =
    val(p[COLS.NAME]) ||
    val(p.Name) || // if someone renames it later
    "";
  if (!title) return null;

  const why = val(p[COLS.WHY]) || "";
  const price = val(p[COLS.PRICE]);
  const category = val(p[COLS.CATEGORY]) || "";
  const hook = val(p[COLS.HOOK]) || "";

  const status = (val(p[COLS.STATUS]) || "").toString().trim();
  const liked = !!val(p[COLS.LIKE]);

  // Prefer a real URL if you later add a URL column.
  let url =
    val(p[COLS.URL]) ||
    val(p.URL) || "";

  // If still no URL, build a tagged Amazon search from the title.
  if (!url) {
    const q = encodeURIComponent(title);
    url = `https://www.amazon.com/s?k=${q}&tag=${encodeURIComponent(DEFAULT_TAG)}`;
  } else {
    // If user pasted a raw Amazon link, append tag when missing.
    if (/amazon\./i.test(url) && !/[\?&]tag=/.test(url)) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}tag=${encodeURIComponent(DEFAULT_TAG)}`;
    }
  }

  // Image (optional): use later if you add "Image" files column
  const image =
    val(p[COLS.IMAGE]) ||
    val(p.Image) || null;

  // Filter logic that matches your flow:
  // show only Approved OR “Like This Idea” checked
  const show = (status && /approved/i.test(status)) || liked;
  if (!show) return null;

  return {
    title,
    url,
    image,
    price,
    category,
    why,
    hook,
    status,
  };
}

function j(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify(body),
  };
}