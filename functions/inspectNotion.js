export async function onRequest(context) {
  try {
    const { NOTION_SECRET, NOTION_DATABASE_ID } = context.env;

    if (!NOTION_SECRET || !NOTION_DATABASE_ID) {
      return json({ error: "Missing NOTION_SECRET or NOTION_DATABASE_ID" }, 500);
    }

    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
      headers: {
        "Authorization": `Bearer ${NOTION_SECRET}`,
        "Notion-Version": "2022-06-28"
      }
    });

    const db = await res.json();
    const columnKeys = Object.keys(db.properties || {});
    return json({ columnKeys });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}
