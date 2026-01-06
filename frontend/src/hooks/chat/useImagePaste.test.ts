import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useImagePaste,
  fileToImage,
  MAX_IMAGE_SIZE,
  MAX_IMAGE_DIMENSION,
} from "./useImagePaste";

// Mock Image class for dimension checking
class MockImage {
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    // Simulate async image load
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

// Store original Image
const OriginalImage = global.Image;

describe("useImagePaste", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Image mock for each test
    global.Image = MockImage as unknown as typeof Image;
  });

  afterEach(() => {
    global.Image = OriginalImage;
  });

  describe("fileToImage", () => {
    it("should reject unsupported file types", async () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      const result = await fileToImage(file);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.reason).toBe("type");
        expect(result.error.message).toContain("Unsupported image type");
      }
    });

    it("should reject files larger than MAX_IMAGE_SIZE", async () => {
      // Create a file larger than 5MB
      const largeContent = new ArrayBuffer(MAX_IMAGE_SIZE + 1);
      const file = new File([largeContent], "large.png", { type: "image/png" });

      const result = await fileToImage(file);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.reason).toBe("size");
        expect(result.error.message).toContain("too large");
        expect(result.error.message).toContain("5MB");
      }
    });

    it("should reject images with dimensions larger than MAX_IMAGE_DIMENSION", async () => {
      // Mock Image to return large dimensions
      global.Image = class extends MockImage {
        width = MAX_IMAGE_DIMENSION + 1;
        height = 100;
      } as unknown as typeof Image;

      const smallContent = new ArrayBuffer(100);
      const file = new File([smallContent], "wide.png", { type: "image/png" });

      const result = await fileToImage(file);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.reason).toBe("dimensions");
        expect(result.error.message).toContain("dimensions too large");
      }
    });

    it("should accept valid images", async () => {
      const smallContent = new ArrayBuffer(100);
      const file = new File([smallContent], "valid.png", { type: "image/png" });

      const result = await fileToImage(file);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.image.mediaType).toBe("image/png");
        expect(result.image.fileName).toBe("valid.png");
        expect(result.image.id).toMatch(/^img-/);
        expect(result.image.previewUrl).toBeDefined();
        expect(result.image.data).toBeDefined();
      }
    });

    it("should accept all supported image types", async () => {
      const supportedTypes = [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
      ];

      for (const type of supportedTypes) {
        const file = new File([new ArrayBuffer(100)], `test.${type}`, { type });
        const result = await fileToImage(file);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.image.mediaType).toBe(type);
        }
      }
    });
  });

  describe("useImagePaste hook", () => {
    it("should initialize with empty images array", () => {
      const { result } = renderHook(() => useImagePaste());

      expect(result.current.images).toEqual([]);
      expect(result.current.hasImages).toBe(false);
      expect(result.current.validationErrors).toEqual([]);
      expect(result.current.hasValidationErrors).toBe(false);
    });

    it("should handle file selection with valid images", async () => {
      const { result } = renderHook(() => useImagePaste());
      const file = new File([new ArrayBuffer(100)], "test.png", {
        type: "image/png",
      });

      await act(async () => {
        await result.current.handleFileSelect([file]);
      });

      await waitFor(() => {
        expect(result.current.images).toHaveLength(1);
        expect(result.current.hasImages).toBe(true);
        expect(result.current.images[0].fileName).toBe("test.png");
      });
    });

    it("should handle file selection with invalid images", async () => {
      const { result } = renderHook(() => useImagePaste());
      const largeFile = new File(
        [new ArrayBuffer(MAX_IMAGE_SIZE + 1)],
        "large.png",
        { type: "image/png" },
      );

      await act(async () => {
        await result.current.handleFileSelect([largeFile]);
      });

      await waitFor(() => {
        expect(result.current.images).toHaveLength(0);
        expect(result.current.validationErrors).toHaveLength(1);
        expect(result.current.hasValidationErrors).toBe(true);
        expect(result.current.validationErrors[0].reason).toBe("size");
      });
    });

    it("should handle mixed valid and invalid files", async () => {
      const { result } = renderHook(() => useImagePaste());
      const validFile = new File([new ArrayBuffer(100)], "valid.png", {
        type: "image/png",
      });
      const invalidFile = new File([new ArrayBuffer(100)], "invalid.txt", {
        type: "text/plain",
      });

      await act(async () => {
        await result.current.handleFileSelect([validFile, invalidFile]);
      });

      await waitFor(() => {
        expect(result.current.images).toHaveLength(1);
        expect(result.current.validationErrors).toHaveLength(1);
      });
    });

    it("should remove image by ID", async () => {
      const { result } = renderHook(() => useImagePaste());
      const file = new File([new ArrayBuffer(100)], "test.png", {
        type: "image/png",
      });

      await act(async () => {
        await result.current.handleFileSelect([file]);
      });

      await waitFor(() => {
        expect(result.current.images).toHaveLength(1);
      });

      const imageId = result.current.images[0].id;

      act(() => {
        result.current.removeImage(imageId);
      });

      expect(result.current.images).toHaveLength(0);
      expect(result.current.hasImages).toBe(false);
    });

    it("should clear all images", async () => {
      const { result } = renderHook(() => useImagePaste());
      const file1 = new File([new ArrayBuffer(100)], "test1.png", {
        type: "image/png",
      });
      const file2 = new File([new ArrayBuffer(100)], "test2.png", {
        type: "image/png",
      });

      await act(async () => {
        await result.current.handleFileSelect([file1, file2]);
      });

      await waitFor(() => {
        expect(result.current.images).toHaveLength(2);
      });

      act(() => {
        result.current.clearImages();
      });

      expect(result.current.images).toHaveLength(0);
    });

    it("should clear validation errors", async () => {
      const { result } = renderHook(() => useImagePaste());
      const invalidFile = new File([new ArrayBuffer(100)], "invalid.txt", {
        type: "text/plain",
      });

      await act(async () => {
        await result.current.handleFileSelect([invalidFile]);
      });

      await waitFor(() => {
        expect(result.current.validationErrors).toHaveLength(1);
      });

      act(() => {
        result.current.clearValidationErrors();
      });

      expect(result.current.validationErrors).toHaveLength(0);
      expect(result.current.hasValidationErrors).toBe(false);
    });

    it("should return images in request format", async () => {
      const { result } = renderHook(() => useImagePaste());
      const file = new File([new ArrayBuffer(100)], "test.png", {
        type: "image/png",
      });

      await act(async () => {
        await result.current.handleFileSelect([file]);
      });

      await waitFor(() => {
        expect(result.current.images).toHaveLength(1);
      });

      const requestImages = result.current.getImagesForRequest();

      expect(requestImages).toHaveLength(1);
      expect(requestImages[0]).toHaveProperty("mediaType");
      expect(requestImages[0]).toHaveProperty("data");
      expect(requestImages[0]).not.toHaveProperty("id");
      expect(requestImages[0]).not.toHaveProperty("previewUrl");
    });
  });

  describe("constants", () => {
    it("should have correct MAX_IMAGE_SIZE (5MB)", () => {
      expect(MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
    });

    it("should have correct MAX_IMAGE_DIMENSION (4096px)", () => {
      expect(MAX_IMAGE_DIMENSION).toBe(4096);
    });
  });
});
