import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImagePreview } from "./ImagePreview";
import type { PastedImage } from "../../hooks/chat/useImagePaste";

describe("ImagePreview", () => {
  const createMockImage = (
    overrides: Partial<PastedImage> = {},
  ): PastedImage => ({
    id: `img-${Math.random().toString(36).substring(2, 9)}`,
    mediaType: "image/png",
    data: "base64data",
    previewUrl: "data:image/png;base64,base64data",
    ...overrides,
  });

  describe("rendering", () => {
    it("should return null when images array is empty", () => {
      const { container } = render(
        <ImagePreview images={[]} onRemove={() => {}} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render images when provided", () => {
      const images = [createMockImage({ fileName: "test1.png" })];

      render(<ImagePreview images={images} onRemove={() => {}} />);

      expect(screen.getByAltText("test1.png")).toBeInTheDocument();
    });

    it("should render multiple images", () => {
      const images = [
        createMockImage({ fileName: "test1.png" }),
        createMockImage({ fileName: "test2.png" }),
        createMockImage({ fileName: "test3.png" }),
      ];

      render(<ImagePreview images={images} onRemove={() => {}} />);

      expect(screen.getByAltText("test1.png")).toBeInTheDocument();
      expect(screen.getByAltText("test2.png")).toBeInTheDocument();
      expect(screen.getByAltText("test3.png")).toBeInTheDocument();
    });

    it("should use default alt text when fileName is not provided", () => {
      const images = [createMockImage({ fileName: undefined })];

      render(<ImagePreview images={images} onRemove={() => {}} />);

      expect(screen.getByAltText("Pasted image")).toBeInTheDocument();
    });

    it("should display file name label when provided", () => {
      const images = [createMockImage({ fileName: "screenshot.png" })];

      render(<ImagePreview images={images} onRemove={() => {}} />);

      expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    });

    it("should not display file name label when not provided", () => {
      const images = [createMockImage({ fileName: undefined })];

      render(<ImagePreview images={images} onRemove={() => {}} />);

      // The only text should be in aria attributes, not visible text
      expect(screen.queryByText(/\.png$/)).not.toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onRemove with correct id when remove button is clicked", () => {
      const onRemove = vi.fn();
      const images = [createMockImage({ id: "img-123" })];

      render(<ImagePreview images={images} onRemove={onRemove} />);

      const removeButton = screen.getByTitle("Remove image");
      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith("img-123");
    });

    it("should call onRemove with correct id for specific image in list", () => {
      const onRemove = vi.fn();
      const images = [
        createMockImage({ id: "img-1", fileName: "first.png" }),
        createMockImage({ id: "img-2", fileName: "second.png" }),
        createMockImage({ id: "img-3", fileName: "third.png" }),
      ];

      render(<ImagePreview images={images} onRemove={onRemove} />);

      // Get all remove buttons
      const removeButtons = screen.getAllByTitle("Remove image");
      expect(removeButtons).toHaveLength(3);

      // Click the second one
      fireEvent.click(removeButtons[1]);

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith("img-2");
    });
  });

  describe("accessibility", () => {
    it("should have accessible remove button", () => {
      const images = [createMockImage()];

      render(<ImagePreview images={images} onRemove={() => {}} />);

      const removeButton = screen.getByTitle("Remove image");
      expect(removeButton).toHaveAttribute("type", "button");
    });

    it("should have alt text on images", () => {
      const images = [createMockImage({ fileName: "test.png" })];

      render(<ImagePreview images={images} onRemove={() => {}} />);

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("alt", "test.png");
    });
  });

  describe("styling", () => {
    it("should apply correct container classes", () => {
      const images = [createMockImage()];

      const { container } = render(
        <ImagePreview images={images} onRemove={() => {}} />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex", "gap-2", "p-2", "mb-2");
    });

    it("should apply correct image classes", () => {
      const images = [createMockImage()];

      render(<ImagePreview images={images} onRemove={() => {}} />);

      const img = screen.getByRole("img");
      expect(img).toHaveClass("h-16", "w-16", "object-cover", "rounded-md");
    });
  });
});
