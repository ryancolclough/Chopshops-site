const NOTION_SECRET = process.env.NOTION_SECRET;
const NOTION_DB = process.env.NOTION_DATABASE_ID;

exports.handler = async () => {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_SECRET}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ page_size: 1 })
  });

  const data = await res.json();
  const first = data.results?.[0]?.properties || {};
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ columnKeys: Object.keys(first), sample: first }, null, 2)
  };
};
