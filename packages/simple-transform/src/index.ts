import Mustache from "mustache";
import type { TransformerPlugin, ActionArgs } from "@curatedotfun/types";

interface SimpleTransformerConfig extends Record<string, unknown> {
  template: string;
}

export default class SimpleTransformer
  implements TransformerPlugin<unknown, string, SimpleTransformerConfig>
{
  readonly type = "transformer" as const;
  private template: string = "{{content}}"; // Simple default template

  async initialize(config?: SimpleTransformerConfig): Promise<void> {
    if (config?.template) {
      this.template = config.template;
    }
  }

  async transform({
    input,
  }: ActionArgs<unknown, SimpleTransformerConfig>): Promise<string> {
    try {
      return Mustache.render(this.template, input);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Simple transformation failed: ${errorMessage}`);
    }
  }

  async shutdown(): Promise<void> {
    // No cleanup needed
  }
}
