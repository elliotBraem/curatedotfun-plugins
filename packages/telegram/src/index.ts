import type { ActionArgs, DistributorPlugin } from "@curatedotfun/types";
import telegramifyMarkdown from "telegramify-markdown";

interface TelegramConfig {
  botToken: string;
  channelId?: string;
  messageThreadId?: string;
  [key: string]: string | undefined;
}

export default class TelegramPlugin
  implements DistributorPlugin<string, TelegramConfig>
{
  readonly type = "distributor" as const;
  private botToken: string | null = null;
  private channelId: string | null = null;
  private messageThreadId: string | null = null;

  async initialize(config?: TelegramConfig): Promise<void> {
    if (!config) {
      throw new Error("Telegram plugin requires configuration.");
    }

    // Validate required config
    if (!config.botToken) {
      throw new Error("Telegram plugin requires botToken");
    }
    if (!config.channelId && !config.messageThreadId) {
      throw new Error(
        "Telegram plugin requires either channelId or messageThreadId",
      );
    }
    if (config.messageThreadId && !config.channelId) {
      throw new Error(
        "Telegram plugin requires channelId when messageThreadId is provided",
      );
    }

    this.botToken = config.botToken;
    this.channelId = config.channelId || null;
    this.messageThreadId = config.messageThreadId || null;

    try {
      // Validate credentials
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getChat?chat_id=${this.channelId || this.messageThreadId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to validate Telegram credentials");
      }
    } catch (error) {
      console.error("Failed to initialize Telegram plugin:", error);
      throw error;
    }
  }

  async distribute({
    input: content,
  }: ActionArgs<string, TelegramConfig>): Promise<void> {
    if (!this.botToken || (!this.channelId && !this.messageThreadId)) {
      throw new Error("Telegram plugin not initialized");
    }

    const message = this.formatMessage(content);
    await this.sendMessage(message);
  }

  private formatMessage(content: string): string {
    // First let telegramify-markdown handle the markdown conversion
    let formatted = telegramifyMarkdown(content, "escape");

    // Handle URL paths - escape dots and hyphens in URLs
    formatted = formatted.replace(/\]\((https?:\/\/[^)]+)\)/g, (match, url) => {
      return `](${url.replace(/([.-])/g, "\\$1")})`;
    });

    return formatted;
  }

  private async sendMessage(text: string): Promise<void> {
    const chatId = this.channelId;
    if (!chatId) {
      throw new Error("No valid chat ID available");
    }

    const messageData: {
      chat_id: string;
      text: string;
      parse_mode: string;
      message_thread_id?: string;
    } = {
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
    };

    if (this.messageThreadId) {
      messageData.message_thread_id = this.messageThreadId;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send message: ${JSON.stringify(error)}`);
    }
  }
}
