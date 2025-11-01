const NOTION_SECRET = process.env.NOTION_SECRET;
const NOTION_DB = process.env.NOTION_DATABASE_ID;

exports.handler = async () => {
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_SECRET}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 10 }),
    });

    const data = await res.json();
    const items = (data.results || []).map((p) => {
      const pr = p.properties || {};
      const name = pr.Name?.title?.[0]?.plain_text || "Untitled";
      const link = pr["Product URL"]?.url || "#";
      const price = pr.Price?.number || 0;
      const img =
        pr.Image?.files?.[0]?.external?.url ||
        pr.Image?.files?.[0]?.file?.url ||
        null;
      return { title: name, url: link, image: img, price };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
