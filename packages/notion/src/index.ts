import type { DistributorPlugin, ActionArgs } from "@curatedotfun/types";
import { Client } from "@notionhq/client";

type NotionPropertyValue = {
  title?: Array<{
    text: { content: string };
  }>;
  rich_text?: Array<{
    text: { content: string };
  }>;
  date?: {
    start: string;
  };
  number?: number;
  checkbox?: boolean;
  multi_select?: Array<{
    name: string;
  }>;
};

interface NotionConfig {
  token: string;
  databaseId: string;
  [key: string]: string;
}

export default class NotionPlugin
  implements DistributorPlugin<Record<string, unknown>, NotionConfig>
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
    input,
  }: ActionArgs<Record<string, unknown>, NotionConfig>): Promise<void> {
    if (!this.client || !this.databaseId) {
      throw new Error("Notion plugin not initialized");
    }

    try {
      await this.createPage(input);
    } catch (error) {
      console.error("Failed to create Notion page:", error);
      throw error;
    }
  }

  private formatProperty(value: unknown): NotionPropertyValue {
    if (typeof value === "string") {
      return {
        rich_text: [
          {
            text: {
              content: value.slice(0, 2000), // Notion's limit
            },
          },
        ],
      };
    }

    if (
      value instanceof Date ||
      (typeof value === "string" && !isNaN(Date.parse(value)))
    ) {
      return {
        date: {
          start: new Date(value).toISOString(),
        },
      };
    }

    if (typeof value === "number") {
      return {
        number: value,
      };
    }

    if (typeof value === "boolean") {
      return {
        checkbox: value,
      };
    }

    // For arrays (multi-select)
    if (Array.isArray(value)) {
      return {
        multi_select: value.map((item) => ({ name: String(item) })),
      };
    }

    // Default to rich_text for other types
    return {
      rich_text: [
        {
          text: {
            content: String(value).slice(0, 2000),
          },
        },
      ],
    };
  }

  private async createPage(properties: Record<string, unknown>): Promise<void> {
    if (!this.client || !this.databaseId) {
      throw new Error("Notion plugin not initialized");
    }

    const formattedProperties: Record<string, NotionPropertyValue> = {};
    let titlePropertyKey: string | null = null;

    // First, look for a property named "title" or "Title"
    for (const [key] of Object.entries(properties)) {
      if (key.toLowerCase() === "title") {
        titlePropertyKey = key;
        break;
      }
    }

    // If no title property found, use the first property as title
    if (!titlePropertyKey) {
      titlePropertyKey = Object.keys(properties)[0];
    }

    // Format properties, handling title property specially
    for (const [key, value] of Object.entries(properties)) {
      if (key === titlePropertyKey) {
        formattedProperties[key] = {
          title: [
            {
              text: {
                content: String(value).slice(0, 2000), // Notion's limit
              },
            },
          ],
        };
      } else {
        formattedProperties[key] = this.formatProperty(value);
      }
    }

    await this.client.pages.create({
      parent: {
        database_id: this.databaseId,
      },
      properties: formattedProperties as any, // Type assertion needed due to Notion's complex types
    });
  }
}
