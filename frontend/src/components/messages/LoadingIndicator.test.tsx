import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingComponent } from "./LoadingIndicator";

describe("LoadingComponent", () => {
  describe("rendering", () => {
    it("renders Claude label", () => {
      render(<LoadingComponent />);

      expect(screen.getByText("Claude")).toBeInTheDocument();
    });

    it("renders thinking text", () => {
      render(<LoadingComponent />);

      expect(screen.getByText("Thinking...")).toBeInTheDocument();
    });

    it("renders with MessageContainer alignment left", () => {
      const { container } = render(<LoadingComponent />);

      // MessageContainer with alignment="left" renders justify-start
      const outerDiv = container.querySelector(".mb-4");
      expect(outerDiv).toHaveClass("justify-start");
    });
  });

  describe("spinner animation", () => {
    it("renders spinner element", () => {
      const { container } = render(<LoadingComponent />);

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("spinner has correct styling", () => {
      const { container } = render(<LoadingComponent />);

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toHaveClass("w-4");
      expect(spinner).toHaveClass("h-4");
      expect(spinner).toHaveClass("border-2");
      expect(spinner).toHaveClass("rounded-full");
    });
  });

  describe("text animation", () => {
    it("renders pulsing text", () => {
      const { container } = render(<LoadingComponent />);

      const pulsing = container.querySelector(".animate-pulse");
      expect(pulsing).toBeInTheDocument();
      expect(pulsing).toHaveTextContent("Thinking...");
    });
  });

  describe("styling", () => {
    it("has correct background color scheme", () => {
      const { container } = render(<LoadingComponent />);

      const innerContainer = container.querySelector(".rounded-lg");
      expect(innerContainer?.className).toContain("bg-slate-200");
      expect(innerContainer?.className).toContain("dark:bg-slate-700");
    });

    it("Claude label has correct styling", () => {
      render(<LoadingComponent />);

      const label = screen.getByText("Claude");
      expect(label).toHaveClass("text-xs");
      expect(label).toHaveClass("font-semibold");
      expect(label).toHaveClass("mb-2");
    });

    it("content container has flex layout", () => {
      const { container } = render(<LoadingComponent />);

      const flexContainer = container.querySelector(".flex.items-center.gap-2");
      expect(flexContainer).toBeInTheDocument();
    });
  });
});
