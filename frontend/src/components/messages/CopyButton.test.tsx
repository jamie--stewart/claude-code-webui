import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CopyButton } from "./CopyButton";

describe("CopyButton", () => {
  const mockClipboard = {
    writeText: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders a button", () => {
      render(<CopyButton content="test content" />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("has correct aria-label when not copied", () => {
      render(<CopyButton content="test content" />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Copy to clipboard");
    });

    it("has correct title when not copied", () => {
      render(<CopyButton content="test content" />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("title", "Copy to clipboard");
    });

    it("applies custom className", () => {
      render(<CopyButton content="test" className="custom-class" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("renders with small size by default", () => {
      render(<CopyButton content="test" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("p-1");
    });

    it("renders with medium size when specified", () => {
      render(<CopyButton content="test" size="md" />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("p-1.5");
    });

    it("has type button", () => {
      render(<CopyButton content="test" />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });
  });

  describe("copy functionality", () => {
    it("copies content to clipboard on click", async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      render(<CopyButton content="test content to copy" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          "test content to copy",
        );
      });
    });

    it("shows copied state after successful copy", async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      render(<CopyButton content="test" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute("aria-label", "Copied to clipboard");
        expect(button).toHaveAttribute("title", "Copied!");
      });
    });

    it("applies success styling after copy", async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      render(<CopyButton content="test" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(button.className).toContain("text-green-600");
      });
    });
  });

  describe("fallback copy", () => {
    it("handles clipboard API failure gracefully", async () => {
      // jsdom doesn't support execCommand, so we just verify the button doesn't crash
      mockClipboard.writeText.mockRejectedValue(new Error("Not supported"));

      render(<CopyButton content="fallback content" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Button should still be functional after failed copy attempt
      await waitFor(() => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has focus ring styles", () => {
      render(<CopyButton content="test" />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("focus:ring-2");
      expect(button.className).toContain("focus:ring-blue-500");
    });

    it("is keyboard accessible", () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      render(<CopyButton content="test" />);

      const button = screen.getByRole("button");
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });
});
