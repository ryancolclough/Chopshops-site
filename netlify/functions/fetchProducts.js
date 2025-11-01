const NOTION_SECRET = process.env.NOTION_SECRET;
const NOTION_DB = process.env.NOTION_DATABASE_ID;

const HEADERS = {
  "Authorization": `Bearer ${NOTION_SECRET}`,
  "Notion-Version": "2025-09-03",
  "Content-Type": "application/json",
};

exports.handler = async () => {
  try {
    // Step 1: Fetch data from Notion
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB}/query`, {
      method: "POST",
      headers: HEADERS,
    });

    const data = await res.json();

    if (!data.results) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No results from Notion", details: data }),
      };
    }

    // Step 2: Extract column keys dynamically
    const sample = data.results[0]?.properties || {};
    const columnKeys = Object.keys(sample);

    // Step 3: Map entries intelligently
    const items = data.results.map((page) => {
      const props = page.properties;

      // Detect key matches
      const nameKey = columnKeys.find(k => /name/i.test(k)) || "Name";
      const urlKey = columnKeys.find(k => /(url|link)/i.test(k)) || "Product URL";
      const priceKey = columnKeys.find(k => /price/i.test(k)) || "Price";
      const imageKey = columnKeys.find(k => /(image|photo|picture)/i.test(k)) || "Image";

      const getValue = (prop) => {
        if (!prop) return null;
        if (prop.type === "title") return prop.title[0]?.plain_text || "";
        if (prop.type === "rich_text") return prop.rich_text[0]?.plain_text || "";
        if (prop.type === "url") return prop.url;
        if (prop.type === "files") {
          return prop.files?.[0]?.file?.url || prop.files?.[0]?.external?.url || "";
        }
        if (prop.type === "number") return prop.number;
        return null;
      };

      return {
        name: getValue(props[nameKey]),
        url: getValue(props[urlKey]),
        price: getValue(props[priceKey]),
        image: getValue(props[imageKey]),
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ columnKeys, sample, items }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};