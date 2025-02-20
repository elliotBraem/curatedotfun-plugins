import type { DistributorPlugin, ActionArgs } from "@curatedotfun/types";
import { Client } from "@notionhq/client";

interface NotionConfig {
  token: string;
  databaseId: string;
  [key: string]: string;
}

export default class NotionPlugin
  implements DistributorPlugin<string, NotionConfig>
{
  readonly type = "distributor" as const;
  private client: Client | null = null;
  private databaseId: string | null = null;

  async initialize(config?: NotionConfig): Promise<void> {
    if (!config) {
      throw new Error("Notion plugin requires configuration");
    }
    if (!config.token) {
      throw new Error("Notion plugin requires token");
    }
    if (!config.databaseId) {
      throw new Error("Notion plugin requires databaseId");
    }

    this.client = new Client({ auth: config.token });
    this.databaseId = config.databaseId;

    try {
      // Validate credentials by attempting to query the database
      await this.client.databases.retrieve({
        database_id: this.databaseId,
      });
    } catch (error) {
      console.error("Failed to initialize Notion plugin:", error);
      throw new Error("Failed to validate Notion credentials");
    }
  }

  async distribute({
    input: content,
  }: ActionArgs<string, NotionConfig>): Promise<void> {
    if (!this.client || !this.databaseId) {
      throw new Error("Notion plugin not initialized");
    }

    try {
      await this.createPage(content);
    } catch (error) {
      console.error("Failed to create Notion page:", error);
      throw error;
    }
  }

  private async createPage(content: string): Promise<void> {
    if (!this.client || !this.databaseId) {
      throw new Error("Notion plugin not initialized");
    }

    await this.client.pages.create({
      parent: {
        database_id: this.databaseId,
      },
      properties: {
        // Assumes the database has a "Content" property of type "rich_text"
        Content: {
          rich_text: [
            {
              text: {
                content: content.slice(0, 2000), // Notion has a 2000 character limit per rich_text block
              },
            },
          ],
        },
        // Assumes the database has a "Created" property of type "date"
        Created: {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
    });
  }
}
