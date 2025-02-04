import { Plugin, TransformOptions } from "@curatedotfun/types";

interface TwitterSubmission {
  content: string;
  curatorUsername: string;
  curatorNotes?: string;
  tweetId?: string;
  username?: string;
}

export default class SimpleTransformer implements Plugin {
  name = "simple-transform";
  version = "0.0.1";
  private format: string = "{CONTENT}"; // Default format if none provided

  async initialize(config: Record<string, string>): Promise<void> {
    if (config.format) {
      this.format = config.format;
    }
  }

  async transform({ input }: TransformOptions): Promise<string> {
    try {
      const submission = input as TwitterSubmission;
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
