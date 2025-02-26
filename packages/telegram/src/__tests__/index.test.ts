import { describe, it, expect, beforeEach } from "vitest";
import TelegramPlugin from "../index";

describe("TelegramPlugin", () => {
  describe("formatMessage", () => {
    let plugin: TelegramPlugin;

    beforeEach(() => {
      plugin = new TelegramPlugin();
    });

    const formatMessage = (content: string) => {
      return (plugin as any).formatMessage(content);
    };

    it("should handle bold text", () => {
      const input = "Hello **bold** text";
      const expected = "Hello *bold* text\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should handle italic text", () => {
      const input = "Hello *italic* text";
      const expected = "Hello _italic_ text\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should handle links", () => {
      const input = "Check [this link](https://example.com)";
      const expected = "Check [this link](https://example\\.com)\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should handle inline code", () => {
      const input = "Use `code here`";
      const expected = "Use `code here`\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should handle code blocks", () => {
      const input = "```\ncode block\nwith lines\n```";
      const expected = "```\ncode block\nwith lines\n```\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should handle complex mixed formatting", () => {
      const input =
        "**Bold** and *italic* with [link](https://example.com) and `code`";
      const expected =
        "*Bold* and _italic_ with [link](https://example\\.com) and `code`\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should handle nested formatting", () => {
      const input = "**Bold with *italic* inside**";
      const expected = "*Bold with _italic_ inside*\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should handle multiple consecutive formatting", () => {
      const input = "**bold** *italic* [link](https://example.com) `code`";
      const expected = "*bold* _italic_ [link](https://example\\.com) `code`\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should escape special characters", () => {
      const input = "Hello! How are you? #hashtag";
      const expected = "Hello\\! How are you? \\#hashtag\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should handle special characters in formatted text", () => {
      const input =
        "**bold-text** *italic.text* [link-text](https://example.com/path-here)";
      const expected =
        "*bold\\-text* _italic\\.text_ [link\\-text](https://example\\.com/path\\-here)\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should handle paragraphs", () => {
      const input = "First paragraph\n\nSecond paragraph";
      const expected = "First paragraph\n\nSecond paragraph\n";
      expect(formatMessage(input)).toBe(expected);
    });

    it("should escape only required characters in normal text", () => {
      const input = "Text with >!@#$%^&*(){}[]<>,.?-+=";
      // Only escape: _*[]()~`>#+-=|{}.!
      const expected =
        "Text with \\>\\!@\\#$%^&\\*\\(\\)\\{\\}\\[\\]<\\>,\\.?\\-\\+\\=\n";
      expect(formatMessage(input)).toBe(expected);
    });
  });
});
