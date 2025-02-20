import type { TransformerPlugin, ActionArgs } from "@curatedotfun/types";

interface TwitterSubmission {
  content: string;
  curatorUsername: string;
  curatorNotes?: string;
  tweetId?: string;
  username?: string;
}

interface SimpleTransformerConfig {
  format?: string;
  [key: string]: string | undefined;
}

export default class SimpleTransformer
  implements
    TransformerPlugin<TwitterSubmission, string, SimpleTransformerConfig>
{
  readonly type = "transform" as const;
  private format: string = "{CONTENT}"; // Default format if none provided

  async initialize(config?: SimpleTransformerConfig): Promise<void> {
    if (config?.format) {
      this.format = config.format;
    }
  }

  async transform({
    input,
  }: ActionArgs<TwitterSubmission, SimpleTransformerConfig>): Promise<string> {
    try {
      const submission = input;
      let result = this.format;

      // Replace content placeholder
      result = result.replace("{CONTENT}", submission.content);
      result = result.replace("{CURATOR}", submission.curatorUsername);
      result = result.replace("{CURATOR_NOTES}", submission.curatorNotes || "");
      result = result.replace("{SUBMISSION_ID}", submission.tweetId || "");

      return result;
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
