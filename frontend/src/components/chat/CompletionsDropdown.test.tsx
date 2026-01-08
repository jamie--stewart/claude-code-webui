import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompletionsDropdown } from "./CompletionsDropdown";
import type { CompletionItem } from "../../hooks/completions/types";

const testItems: CompletionItem[] = [
  { type: "slash_command", value: "/help", displayText: "/help" },
  {
    type: "slash_command",
    value: "/clear",
    displayText: "/clear",
    description: "Clear chat",
  },
  { type: "slash_command", value: "/config", displayText: "/config" },
];

describe("CompletionsDropdown", () => {
  describe("rendering", () => {
    it("should render all items", () => {
      render(
        <CompletionsDropdown
          items={testItems}
          selectedIndex={0}
          onSelect={vi.fn()}
          onHover={vi.fn()}
        />,
      );

      expect(screen.getByText("/help")).toBeInTheDocument();
      expect(screen.getByText("/clear")).toBeInTheDocument();
      expect(screen.getByText("/config")).toBeInTheDocument();
    });

    it("should render item descriptions when provided", () => {
      render(
        <CompletionsDropdown
          items={testItems}
          selectedIndex={0}
          onSelect={vi.fn()}
          onHover={vi.fn()}
        />,
      );

      expect(screen.getByText("Clear chat")).toBeInTheDocument();
    });

    it("should return null for empty items array", () => {
      const { container } = render(
        <CompletionsDropdown
          items={[]}
          selectedIndex={0}
          onSelect={vi.fn()}
          onHover={vi.fn()}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should have correct accessibility attributes", () => {
      render(
        <CompletionsDropdown
          items={testItems}
          selectedIndex={1}
          onSelect={vi.fn()}
          onHover={vi.fn()}
        />,
      );

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveAttribute("aria-label", "Completions");

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(3);
      expect(options[1]).toHaveAttribute("aria-selected", "true");
      expect(options[0]).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("selection highlighting", () => {
    it("should highlight the selected item", () => {
      render(
        <CompletionsDropdown
          items={testItems}
          selectedIndex={1}
          onSelect={vi.fn()}
          onHover={vi.fn()}
        />,
      );

      const options = screen.getAllByRole("option");

      // Selected item should have blue background classes
      expect(options[1].className).toContain("bg-blue-100");
      // Non-selected items should not have blue background
      expect(options[0].className).not.toContain("bg-blue-100");
      expect(options[2].className).not.toContain("bg-blue-100");
    });
  });

  describe("interactions", () => {
    it("should call onSelect when item is clicked", () => {
      const onSelect = vi.fn();
      render(
        <CompletionsDropdown
          items={testItems}
          selectedIndex={0}
          onSelect={onSelect}
          onHover={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("/clear"));
      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it("should call onHover when mouse enters item", () => {
      const onHover = vi.fn();
      render(
        <CompletionsDropdown
          items={testItems}
          selectedIndex={0}
          onSelect={vi.fn()}
          onHover={onHover}
        />,
      );

      fireEvent.mouseEnter(screen.getByText("/config").closest("li")!);
      expect(onHover).toHaveBeenCalledWith(2);
    });

    it("should call onSelect with correct index for each item", () => {
      const onSelect = vi.fn();
      render(
        <CompletionsDropdown
          items={testItems}
          selectedIndex={0}
          onSelect={onSelect}
          onHover={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("/help"));
      expect(onSelect).toHaveBeenCalledWith(0);

      fireEvent.click(screen.getByText("/config"));
      expect(onSelect).toHaveBeenCalledWith(2);
    });
  });

  describe("styling", () => {
    it("should have proper container classes", () => {
      render(
        <CompletionsDropdown
          items={testItems}
          selectedIndex={0}
          onSelect={vi.fn()}
          onHover={vi.fn()}
        />,
      );

      const listbox = screen.getByRole("listbox");
      expect(listbox.className).toContain("absolute");
      expect(listbox.className).toContain("bottom-full");
      expect(listbox.className).toContain("z-50");
    });

    it("should apply hover styles to non-selected items", () => {
      render(
        <CompletionsDropdown
          items={testItems}
          selectedIndex={0}
          onSelect={vi.fn()}
          onHover={vi.fn()}
        />,
      );

      const options = screen.getAllByRole("option");
      // Non-selected items should have hover classes
      expect(options[1].className).toContain("hover:bg-slate-100");
    });
  });
});
