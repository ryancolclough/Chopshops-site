export async function onRequest(context) {
  try {
    const { NOTION_SECRET, NOTION_DATABASE_ID, DEFAULT_TAG } = context.env;

    if (!NOTION_SECRET || !NOTION_DATABASE_ID) {
      return json({ error: "Missing NOTION_SECRET or NOTION_DATABASE_ID" }, 500);
    }

    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_SECRET}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 50 })
    });

    if (!res.ok) {
      const text = await res.text();
      return json({ error: "Notion query failed", status: res.status, detail: text }, res.status);
    }

    const data = await res.json();
    const pages = data.results || [];

    const getProp = (p, keys) => {
      for (const k of keys) {
        const prop = p.properties?.[k];
        if (!prop) continue;
        if (prop.type === "title") return prop.title?.map(r => r.plain_text).join("");
        if (prop.type === "rich_text") return prop.rich_text?.map(r => r.plain_text).join("");
        if (prop.type === "url") return prop.url;
        if (prop.type === "files" && prop.files?.length) {
          const f = prop.files[0];
          return f.external?.url || f.file?.url || null;
        }
        if (prop.type === "number") return prop.number;
        if (prop.type === "select") return prop.select?.name;
      }
      return null;
    };

    const mapped = pages.map(p => ({
      title: getProp(p, ["Name", "Title"]),
      url: getProp(p, ["Product URL", "Amazon Link"]),
      price: getProp(p, ["Price", "Cost"]),
      image: getProp(p, ["Image", "Photo"]),
      status: getProp(p, ["Approved", "Status"]),
    }));

    return json({ items: mapped });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}
