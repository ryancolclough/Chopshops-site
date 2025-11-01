// functions/fetchProducts.js
// Cloudflare Pages Functions format (no Netlify, no JSX)

export async function onRequest(context) {
  const { env } = context;

  const NOTION_SECRET = env.NOTION_SECRET;
  const NOTION_DATABASE_ID = env.NOTION_DATABASE_ID;
  const DEFAULT_TAG = env.DEFAULT_TAG || "chopshops-20";

  try {
    // Query Notion DB
    const notionRes = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NOTION_SECRET}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sorts: [{ property: "Name", direction: "ascending" }],
        }),
      }
    );

    if (!notionRes.ok) {
      const text = await notionRes.text();
      return new Response(
        JSON.stringify({ error: "Notion query failed", detail: text }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await notionRes.json();

    // Map Notion properties -> simple objects for the UI
    const items = (data.results || [])
      .map((page) => {
        const props = page.properties || {};

        const title = props["Name"]?.title?.[0]?.plain_text || "Untitled";

        const rawUrl = props["Product URL"]?.url || null;
        const url = rawUrl
          ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}tag=${DEFAULT_TAG}`
          : null;

        const image =
          props["Image"]?.files?.[0]?.external?.url ||
          props["Image"]?.files?.[0]?.file?.url ||
          null;

        const price = props["Price"]?.number ?? null;
        const category = props["Category"]?.select?.name || null;
        const why = props["Why"]?.rich_text?.[0]?.plain_text || "";
        const hook = props["Hook"]?.rich_text?.[0]?.plain_text || "";
        const status = props["Status"]?.select?.name || "";
        const liked = !!props["Liked"]?.checkbox;

        // Only show Approved or Liked
        if (status !== "Approved" && !liked) return null;

        return { title, url, image, price, category, why, hook, status, liked };
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ items }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
