import type { DistributorPlugin, ActionArgs } from "@curatedotfun/types";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface SupabaseConfig {
  url: string;
  key: string;
  tableName: string;
  [key: string]: string;
}

export default class SupabasePlugin
  implements DistributorPlugin<string, SupabaseConfig>
{
  readonly type = "distributor" as const;
  private client: SupabaseClient | null = null;
  private tableName: string | null = null;

  async initialize(config?: SupabaseConfig): Promise<void> {
    if (!config) {
      throw new Error("Supabase plugin requires configuration");
    }
    if (!config.url) {
      throw new Error("Supabase plugin requires url");
    }
    if (!config.key) {
      throw new Error("Supabase plugin requires key");
    }
    if (!config.tableName) {
      throw new Error("Supabase plugin requires tableName");
    }

    this.client = createClient(config.url, config.key);
    this.tableName = config.tableName;

    try {
      // Validate credentials by attempting to query the table
      const { error } = await this.client
        .from(this.tableName)
        .select("*")
        .limit(1);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Failed to initialize Supabase plugin:", error);
      throw new Error("Failed to validate Supabase credentials");
    }
  }

  async distribute({
    input: content,
  }: ActionArgs<string, SupabaseConfig>): Promise<void> {
    if (!this.client || !this.tableName) {
      throw new Error("Supabase plugin not initialized");
    }

    try {
      await this.insertData(content);
    } catch (error) {
      console.error("Failed to insert data into Supabase:", error);
      throw error;
    }
  }

  private async insertData(content: string): Promise<void> {
    if (!this.client || !this.tableName) {
      throw new Error("Supabase plugin not initialized");
    }

    const { error } = await this.client.from(this.tableName).insert({
      content,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
  }
}
