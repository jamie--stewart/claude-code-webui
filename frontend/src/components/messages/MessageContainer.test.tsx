import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageContainer } from "./MessageContainer";

describe("MessageContainer", () => {
  describe("rendering", () => {
    it("renders children content", () => {
      render(
        <MessageContainer alignment="left" colorScheme="bg-blue-500">
          <span>Test content</span>
        </MessageContainer>,
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("applies colorScheme classes to inner div", () => {
      const { container } = render(
        <MessageContainer alignment="left" colorScheme="bg-blue-500 text-white">
          Content
        </MessageContainer>,
      );

      const innerDiv = container.querySelector(".rounded-lg");
      expect(innerDiv).toHaveClass("bg-blue-500");
      expect(innerDiv).toHaveClass("text-white");
    });

    it("applies common styling to inner div", () => {
      const { container } = render(
        <MessageContainer alignment="left" colorScheme="bg-blue-500">
          Content
        </MessageContainer>,
      );

      const innerDiv = container.querySelector(".rounded-lg");
      expect(innerDiv).toHaveClass("rounded-lg");
      expect(innerDiv).toHaveClass("px-4");
      expect(innerDiv).toHaveClass("py-3");
    });

    it("applies max-width constraints", () => {
      const { container } = render(
        <MessageContainer alignment="left" colorScheme="bg-blue-500">
          Content
        </MessageContainer>,
      );

      const innerDiv = container.querySelector(".rounded-lg");
      expect(innerDiv?.className).toContain("max-w-[85%]");
      expect(innerDiv?.className).toContain("sm:max-w-[70%]");
    });
  });

  describe("alignment", () => {
    it("aligns left with justify-start", () => {
      const { container } = render(
        <MessageContainer alignment="left" colorScheme="bg-blue-500">
          Left aligned
        </MessageContainer>,
      );

      const outerDiv = container.querySelector(".mb-4");
      expect(outerDiv).toHaveClass("justify-start");
    });

    it("aligns right with justify-end", () => {
      const { container } = render(
        <MessageContainer alignment="right" colorScheme="bg-blue-500">
          Right aligned
        </MessageContainer>,
      );

      const outerDiv = container.querySelector(".mb-4");
      expect(outerDiv).toHaveClass("justify-end");
    });

    it("aligns center with justify-center", () => {
      const { container } = render(
        <MessageContainer alignment="center" colorScheme="bg-blue-500">
          Center aligned
        </MessageContainer>,
      );

      const outerDiv = container.querySelector(".mb-4");
      expect(outerDiv).toHaveClass("justify-center");
    });
  });

  describe("layout", () => {
    it("outer div has flex and margin-bottom", () => {
      const { container } = render(
        <MessageContainer alignment="left" colorScheme="bg-blue-500">
          Content
        </MessageContainer>,
      );

      const outerDiv = container.querySelector(".mb-4");
      expect(outerDiv).toHaveClass("flex");
      expect(outerDiv).toHaveClass("mb-4");
    });
  });

  describe("complex children", () => {
    it("renders nested elements correctly", () => {
      render(
        <MessageContainer alignment="left" colorScheme="bg-slate-200">
          <div className="header">Header</div>
          <p className="body">Body content</p>
          <button>Action</button>
        </MessageContainer>,
      );

      expect(screen.getByText("Header")).toBeInTheDocument();
      expect(screen.getByText("Body content")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Action" }),
      ).toBeInTheDocument();
    });
  });
});
