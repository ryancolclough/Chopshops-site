/**
 * Netlify Function: fetchProducts
 * Securely pulls product data from your Notion database
 * using environment variables for all secrets.
 */

const NOTION_SECRET = process.env.NOTION_SECRET;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const DEFAULT_TAG = process.env.DEFAULT_TAG || "chopshops-20";

const NOTION_URL = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;

/** Helper to safely read property values */
function getValue(prop) {
  if (!prop) return null;
  if (prop.type === "title") return prop.title?.[0]?.plain_text || null;
  if (prop.type === "rich_text") return prop.rich_text?.[0]?.plain_text || null;
  if (prop.type === "number") return prop.number ?? null;
  if (prop.type === "select") return prop.select?.name || null;
  if (prop.type === "checkbox") return prop.checkbox || false;
  if (prop.type === "url") return prop.url || null;
  if (prop.type === "files")
    return prop.files?.[0]?.file?.url || prop.files?.[0]?.name || null;
  return null;
}

/** Format one Notion row into a product object */
function mapRow(page) {
  const props = page.properties;
  const name = getValue(props.Name);
  const url =
    getValue(props["Product URL"]) ||
    `https://www.amazon.com/s?k=${encodeURIComponent(name)}&tag=${DEFAULT_TAG}`;
  const image = getValue(props.Image);
  const price = getValue(props.Price);
  const category = getValue(props.Category);
  const approved = getValue(props.Approved);

  // Show only approved items
  if (!approved) return null;

  return { name, url, image, price, category };
}

exports.handler = async () => {
  try {
    const res = await fetch(NOTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_SECRET}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sorts: [{ property: "Name", direction: "ascending" }],
        page_size: 50,
      }),
    });

    if (!res.ok) {
      console.error("Notion API error:", await res.text());
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: "Failed to fetch from Notion" }),
      };
    }

    const data = await res.json();
    const products = (data.results || []).map(mapRow).filter(Boolean);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ items: products }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error fetching products" }),
    };
  }
};
