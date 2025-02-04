import { TransformerPlugin, ActionArgs } from "@curatedotfun/types";

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

interface AIConfig extends Record<string, string> {
  prompt: string;
  apiKey: string;
}

export default class AITransformer implements TransformerPlugin<string, string, AIConfig> {
  name = "ai_transform";
  version = "0.0.1";
  private prompt: string = "";
  private apiKey: string = "";

  async initialize(config: AIConfig): Promise<void> {
    if (!config.prompt) {
      throw new Error("AI transformer requires a prompt configuration");
    }
    if (!config.apiKey) {
      throw new Error("AI transformer requires an OpenRouter API key");
    }
    this.prompt = config.prompt;
    this.apiKey = config.apiKey;
  }

  async transform({ input }: ActionArgs<string, AIConfig>): Promise<string> {
    try {
      const messages: Message[] = [
        { role: "system", content: this.prompt },
        { role: "user", content: input },
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
            model: "openai/gpt-3.5-turbo", // Default to GPT-3.5-turbo for cost efficiency
            messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      const result = (await response.json()) as OpenRouterResponse;

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid response from OpenRouter API");
      }

      return result.choices[0].message.content;
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
