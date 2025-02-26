import Mustache from "mustache";
import { z } from "zod";
import type { TransformerPlugin, ActionArgs } from "@curatedotfun/types";

// Schema for the configuration
const ConfigSchema = z.object({
  mappings: z.record(z.union([z.string(), z.array(z.string())])),
});

type Config = z.infer<typeof ConfigSchema>;

export default class ObjectTransformer
  implements
    TransformerPlugin<Record<string, unknown>, Record<string, unknown>, Config>
{
  readonly type = "transformer" as const;
  private config: Config | null = null;

  async initialize(config?: Config): Promise<void> {
    if (!config) {
      throw new Error("Object transformer requires configuration");
    }

    // Validate config against schema
    this.config = ConfigSchema.parse(config);
  }

  async transform({
    input,
    config,
  }: ActionArgs<Record<string, unknown>, Config>): Promise<
    Record<string, unknown>
  > {
    if (!this.config) {
      throw new Error("Object transformer not initialized");
    }

    const output: Record<string, unknown> = {};

    for (const [outputField, template] of Object.entries(
      this.config.mappings,
    )) {
      // Template-based transformation
      if (Array.isArray(template)) {
        output[outputField] = template.map((t) => Mustache.render(t, input));
      } else {
        output[outputField] = Mustache.render(template, input);
      }
    }

    return output;
  }

  async shutdown(): Promise<void> {
    // No cleanup needed
  }
}
