import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  DistributorPlugin,
  DBOperations,
  RssItem,
  ActionArgs,
} from "@curatedotfun/types";
import { RssService } from "./rss.service";

interface RssConfig {
  feedId: string;
  title: string;
  maxItems?: string;
  path?: string;
  [key: string]: string | undefined;
}

export default class RssPlugin implements DistributorPlugin<string, RssConfig> {
  name = "@curatedotfun/rss";
  version = "0.0.1";
  private services: Map<string, RssService> = new Map();
  private dbOps?: DBOperations;

  getServices(): Map<string, RssService> {
    return this.services;
  }

  constructor(dbOperations?: DBOperations) {
    this.dbOps = dbOperations;
  }

  async initialize(config: RssConfig): Promise<void> {
    if (!config.title) {
      throw new Error("RSS plugin requires title");
    }
    if (!config.feedId) {
      throw new Error("RSS plugin requires feedId");
    }

    const maxItems = config.maxItems ? parseInt(config.maxItems) : 100;

    // Create a new RSS service for this feed
    const service = new RssService(
      config.feedId,
      config.title,
      maxItems,
      config.path,
      this.dbOps,
    );

    this.services.set(config.feedId, service);
  }

  async distribute({
    input: content,
    config,
  }: ActionArgs<string, RssConfig>): Promise<void> {
    if (!config?.feedId) {
      throw new Error("RSS plugin requires feedId in config");
    }
    const service = this.services.get(config.feedId);
    if (!service) {
      throw new Error("RSS plugin not initialized for this feed");
    }

    const item: RssItem = {
      title: "New Update",
      content,
      link: "https://twitter.com/", // TODO: Update with actual link
      publishedAt: new Date().toISOString(),
      guid: Date.now().toString(),
    };

    // Save to database
    service.saveItem(item);

    // Write to file if path is provided (backward compatibility)
    const filePath = service.getPath();
    if (filePath) {
      await this.writeToFile(service, filePath);
    }
  }

  private async writeToFile(
    service: RssService,
    filePath: string,
  ): Promise<void> {
    const items = service.getItems();

    const feed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${service.getTitle()}</title>
    <link>https://twitter.com/</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items
      .map(
        (item) => `
    <item>
      <title>${this.escapeXml(item.title || "")}</title>
      <description>${this.escapeXml(item.content)}</description>
      <link>${item.link || ""}</link>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
      <guid>${item.guid || ""}</guid>
    </item>`,
      )
      .join("\n")}
  </channel>
</rss>`;

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, feed, "utf-8");
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  async shutdown(): Promise<void> {
    // Clear all services when plugin shuts down
    this.services.clear();
  }
}
