import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Redis } from "@upstash/redis";
import { cors } from "hono/cors";

interface RssItem {
  title?: string;
  content: string;
  link?: string;
  publishedAt: string;
  guid: string;
}

interface Feed {
  id: string;
  title: string;
  maxItems: number;
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const app = new Hono();

// Enable CORS
app.use("*", cors());

// Health check
app.get("/", (c) => c.text("RSS Service is running"));

// Create a new feed
app.post("/feeds", async (c) => {
  const { id, title, maxItems = 100 } = await c.req.json<Feed>();
  
  if (!id || !title) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const feed: Feed = { id, title, maxItems };
  await redis.set(`feed:${id}`, JSON.stringify(feed));
  
  return c.json({ message: "Feed created successfully", feed });
});

// Add item to feed
app.post("/feeds/:id/items", async (c) => {
  const feedId = c.req.param("id");
  const item = await c.req.json<RssItem>();
  
  const feed = await redis.get<string>(`feed:${feedId}`);
  if (!feed) {
    return c.json({ error: "Feed not found" }, 404);
  }

  // Add item to feed's items list
  await redis.lpush(`feed:${feedId}:items`, JSON.stringify(item));
  
  // Trim to max items
  const { maxItems = 100 } = JSON.parse(feed);
  await redis.ltrim(`feed:${feedId}:items`, 0, maxItems - 1);
  
  return c.json({ message: "Item added successfully", item });
});

// Get feed as RSS
app.get("/feeds/:id", async (c) => {
  const feedId = c.req.param("id");
  
  const feed = await redis.get<string>(`feed:${feedId}`);
  if (!feed) {
    return c.json({ error: "Feed not found" }, 404);
  }

  const { title } = JSON.parse(feed);
  const items = await redis.lrange<string[]>(`feed:${feedId}:items`, 0, -1);
  
  const rssItems = items.map((item) => {
    const { title: itemTitle, content, link, publishedAt, guid } = JSON.parse(item);
    return `
    <item>
      <title>${escapeXml(itemTitle || "")}</title>
      <description>${escapeXml(content)}</description>
      <link>${escapeXml(link || "")}</link>
      <pubDate>${new Date(publishedAt).toUTCString()}</pubDate>
      <guid>${escapeXml(guid)}</guid>
    </item>`;
  }).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${c.req.url}</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
});

// Helper function to escape XML special characters
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Start server if not in production (Vercel will handle this in prod)
if (process.env.NODE_ENV !== "production") {
  serve({
    fetch: app.fetch,
    port: 3001,
  });
  console.log("RSS Service running at http://localhost:3001");
}
