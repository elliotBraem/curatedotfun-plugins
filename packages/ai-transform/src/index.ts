import type { ActionArgs, TransformerPlugin } from "@curatedotfun/types";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface SchemaProperty {
  type: "string" | "number" | "boolean" | "array";
  description: string;
}

interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: {
      type: string;
      properties: Record<string, SchemaProperty>;
      required: string[];
      additionalProperties: boolean;
    };
  };
}

interface AIConfig extends Record<string, unknown> {
  prompt: string;
  apiKey: string;
  model?: string;
  schema?: Record<string, SchemaProperty>;
  temperature?: number;
}

interface TransformInput {
  content: string;
}

export default class AITransformer<T = string>
  implements TransformerPlugin<TransformInput, T, AIConfig>
{
  readonly type = "transformer" as const;
  private prompt: string = "";
  private apiKey: string = "";
  private model?: string;
  private responseFormat?: ResponseFormat;
  private temperature: number = 0.7;

  async initialize(config?: AIConfig): Promise<void> {
    if (!config) {
      throw new Error("AI transformer requires configuration");
    }
    if (!config.prompt) {
      throw new Error("AI transformer requires a prompt configuration");
    }
    if (!config.apiKey) {
      throw new Error("AI transformer requires an OpenRouter API key");
    }
    this.prompt = config.prompt;
    this.apiKey = config.apiKey;
    if (typeof config.temperature === "number") {
      this.temperature = config.temperature;
    }
    if (config.schema) {
      this.responseFormat = {
        type: "json_schema",
        json_schema: {
          name: "transformer",
          strict: true,
          schema: {
            type: "object",
            properties: config.schema,
            required: Object.keys(config.schema),
            additionalProperties: false,
          },
        },
      };
      this.model = config.model || "openai/gpt-4o-2024-08-06";
    } else {
      this.model = config.model || "openai/gpt-3.5-turbo";
    }
  }

  async transform({ input }: ActionArgs<TransformInput, AIConfig>): Promise<T> {
    try {
      const messages: Message[] = [
        { role: "system", content: this.prompt },
        {
          role: "user",
          content: typeof input === "string" ? input : JSON.stringify(input),
        },
      ];

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://curate.fun",
            "X-Title": "CurateDotFun",
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: this.temperature,
            ...(this.responseFormat && {
              response_format: this.responseFormat,
            }),
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter API error (${response.status}): ${errorText}`,
        );
      }

      const result = (await response.json()) as OpenRouterResponse;

      if (!result.choices?.[0]?.message?.content) {
        console.log("result", result);
        throw new Error("Invalid response structure from OpenRouter API");
      }

      const content = result.choices[0].message.content;

      if (this.responseFormat) {
        try {
          return JSON.parse(content) as T;
        } catch (error) {
          throw new Error(`Failed to parse JSON response: ${error}`);
        }
      }

      return content as T;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`AI transformation failed: ${errorMessage}`);
    }
  }

  async shutdown(): Promise<void> {
    // Cleanup any resources if needed
  }
}
