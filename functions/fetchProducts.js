// /functions/fetchProducts.js  (Cloudflare Pages Function)

export async function onRequest(context) {
  const { NOTION_SECRET, NOTION_DATABASE_ID, DEFAULT_TAG } = context.env;

  const headers = {
    Authorization: `Bearer ${NOTION_SECRET}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  // 1) Query the database (feel free to tweak sorts/filters)
  const query = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sorts: [{ property: "Last edited time", direction: "descending" }], // "Edited time" fallback is also fine
      page_size: 100,
    }),
  });

  if (!query.ok) {
    return json({ items: [], error: "notion_query_failed", status: query.status });
  }

  const data = await query.json();

  // 2) Map Notion properties → site fields
  const items = (data.results || []).map(page => {
    const props = page.properties || {};
    const get = (name) => props[name];

    const title = (get("Name")?.title?.[0]?.plain_text || "").trim();
    const url =
      get("Product URL")?.url ||
      ""; // if EMPTY we still render the card w/out buy link
    const price = get("Price")?.number ?? null;
    const category = get("Category")?.select?.name || "Other";
    const status = (get("Status")?.select?.name || "").toLowerCase();
    const why = (get("Why")?.rich_text?.[0]?.plain_text || "").trim();
    const hook = (get("Hook")?.rich_text?.[0]?.plain_text || "").trim();
    const liked = !!get("Liked")?.checkbox;

    // Image: accept first file OR an external URL users pasted into the "Image" prop
    let image = "";
    const imgProp = get("Image");
    if (imgProp?.files?.length) {
      const f = imgProp.files[0];
      image = f?.external?.url || f?.file?.url || "";
    } else if (imgProp?.url) {
      image = imgProp.url;
    }

    // Optional: tag affiliate if you set a DEFAULT_TAG
    let buy = url;
    if (DEFAULT_TAG && buy && /amazon\./i.test(buy) && !/[?&]tag=/.test(buy)) {
      const sep = buy.includes("?") ? "&" : "?";
      buy = `${buy}${sep}tag=${encodeURIComponent(DEFAULT_TAG)}`;
    }

    return { title, url: buy, image, price, category, status, why, hook, liked };
  });

  return json({ items });
}

// Small helper
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
