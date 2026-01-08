import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollapsibleDetails } from "./CollapsibleDetails";

// Mock the contentUtils module
vi.mock("../../utils/contentUtils", () => ({
  createContentPreview: vi.fn((content: string, maxLines: number) => {
    const lines = content.split("\n");
    const previewLines = lines.slice(0, maxLines);
    return {
      preview: previewLines.join("\n"),
      hasMore: lines.length > maxLines,
      totalLines: lines.length,
      previewLines: previewLines.length,
    };
  }),
  createMoreLinesIndicator: vi.fn(
    (total: number, preview: number) =>
      `... ${total - preview} more line(s) (click to expand)`,
  ),
}));

const defaultColorScheme = {
  header: "text-blue-800",
  content: "text-blue-700",
  border: "border-blue-200",
  bg: "bg-blue-50",
};

describe("CollapsibleDetails", () => {
  describe("rendering", () => {
    it("renders label", () => {
      render(
        <CollapsibleDetails
          label="Test Label"
          details="Some details"
          colorScheme={defaultColorScheme}
        />,
      );

      expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("renders badge when provided", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
          badge="init"
        />,
      );

      expect(screen.getByText("(init)")).toBeInTheDocument();
    });

    it("does not render badge when not provided", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
        />,
      );

      expect(screen.queryByText(/^\(/)).not.toBeInTheDocument();
    });

    it("renders icon when provided", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
          icon={<span data-testid="custom-icon">⚙</span>}
        />,
      );

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });

    it("applies colorScheme classes", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
        />,
      );

      const container = screen.getByText("Label").closest("div[class*='mb-3']");
      expect(container).toHaveClass("bg-blue-50");
    });

    it("renders previewSummary when provided", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
          previewSummary="3 items"
        />,
      );

      expect(screen.getByText("3 items")).toBeInTheDocument();
    });
  });

  describe("collapsible behavior", () => {
    it("shows collapsed state by default", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Detailed content here"
          colorScheme={defaultColorScheme}
        />,
      );

      // Should show the expand indicator
      expect(screen.getByText("▶")).toBeInTheDocument();
    });

    it("shows expanded state when defaultExpanded is true", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Detailed content here"
          colorScheme={defaultColorScheme}
          defaultExpanded={true}
        />,
      );

      // defaultExpanded=true makes it non-collapsible, showing content directly
      expect(screen.getByText("Detailed content here")).toBeInTheDocument();
    });

    it("expands when header is clicked", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Detailed content here"
          colorScheme={defaultColorScheme}
        />,
      );

      const header = screen.getByText("Label").closest('[role="button"]');
      fireEvent.click(header!);

      expect(screen.getByText("▼")).toBeInTheDocument();
      expect(screen.getByText("Detailed content here")).toBeInTheDocument();
    });

    it("collapses when expanded header is clicked", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Detailed content here"
          colorScheme={defaultColorScheme}
        />,
      );

      const header = screen.getByText("Label").closest('[role="button"]');

      // Expand
      fireEvent.click(header!);
      expect(screen.getByText("▼")).toBeInTheDocument();

      // Collapse
      fireEvent.click(header!);
      expect(screen.getByText("▶")).toBeInTheDocument();
    });
  });

  describe("keyboard navigation", () => {
    it("expands on Enter key", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Detailed content"
          colorScheme={defaultColorScheme}
        />,
      );

      const header = screen.getByText("Label").closest('[role="button"]');
      fireEvent.keyDown(header!, { key: "Enter" });

      expect(screen.getByText("▼")).toBeInTheDocument();
    });

    it("expands on Space key", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Detailed content"
          colorScheme={defaultColorScheme}
        />,
      );

      const header = screen.getByText("Label").closest('[role="button"]');
      fireEvent.keyDown(header!, { key: " " });

      expect(screen.getByText("▼")).toBeInTheDocument();
    });

    it("does not expand on other keys", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Detailed content"
          colorScheme={defaultColorScheme}
        />,
      );

      const header = screen.getByText("Label").closest('[role="button"]');
      fireEvent.keyDown(header!, { key: "Tab" });

      expect(screen.getByText("▶")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has role button when collapsible", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
        />,
      );

      const header = screen.getByRole("button");
      expect(header).toBeInTheDocument();
    });

    it("has aria-expanded attribute when collapsible", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
        />,
      );

      const header = screen.getByRole("button");
      expect(header).toHaveAttribute("aria-expanded", "false");
    });

    it("updates aria-expanded when expanded", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
        />,
      );

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(header).toHaveAttribute("aria-expanded", "true");
    });

    it("has tabIndex when collapsible", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
        />,
      );

      const header = screen.getByRole("button");
      expect(header).toHaveAttribute("tabindex", "0");
    });

    it("does not have role button when not collapsible (defaultExpanded)", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Details"
          colorScheme={defaultColorScheme}
          defaultExpanded={true}
        />,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("empty content", () => {
    it("is not collapsible with empty details", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details=""
          colorScheme={defaultColorScheme}
        />,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByText("▶")).not.toBeInTheDocument();
    });

    it("is not collapsible with whitespace-only details", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="   "
          colorScheme={defaultColorScheme}
        />,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("preview functionality", () => {
    it("does not show preview when showPreview is false", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6"
          colorScheme={defaultColorScheme}
          showPreview={false}
        />,
      );

      // Should not show preview content when collapsed
      const header = screen.getByText("Label").closest('[role="button"]');
      expect(header).toBeInTheDocument();
      // The preview pre element should not exist
      const previewPre = document.querySelector("pre.whitespace-pre-wrap");
      expect(previewPre).not.toBeInTheDocument();
    });

    it("uses custom previewContent when provided", () => {
      render(
        <CollapsibleDetails
          label="Label"
          details="Full details here"
          colorScheme={defaultColorScheme}
          previewContent="Custom preview"
        />,
      );

      expect(screen.getByText("Custom preview")).toBeInTheDocument();
    });
  });
});
