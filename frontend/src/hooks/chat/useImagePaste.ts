import { useState, useCallback } from "react";

export interface PastedImage {
  /** Unique identifier for the image */
  id: string;
  /** MIME type of the image */
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  /** Base64-encoded image data (without data URL prefix) */
  data: string;
  /** Data URL for preview display */
  previewUrl: string;
  /** File name if available */
  fileName?: string;
}

export interface ImageValidationError {
  fileName?: string;
  reason: "size" | "dimensions" | "type" | "read_error";
  message: string;
}

/** Maximum image file size in bytes (5MB) */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Maximum image dimension in pixels (4096px - typical API limit) */
export const MAX_IMAGE_DIMENSION = 4096;

/** Supported image MIME types */
const SUPPORTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

type SupportedMediaType = (typeof SUPPORTED_TYPES)[number];

function isSupportedImageType(type: string): type is SupportedMediaType {
  return SUPPORTED_TYPES.includes(type as SupportedMediaType);
}

/**
 * Generates a unique ID for pasted images
 */
function generateImageId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export type FileToImageResult =
  | { success: true; image: PastedImage }
  | { success: false; error: ImageValidationError };

/**
 * Checks image dimensions by loading it into an Image element
 */
function checkImageDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

/**
 * Converts a File to a PastedImage object with validation
 */
export async function fileToImage(file: File): Promise<FileToImageResult> {
  // Check file type
  if (!isSupportedImageType(file.type)) {
    return {
      success: false,
      error: {
        fileName: file.name,
        reason: "type",
        message: `Unsupported image type: ${file.type}. Supported types: PNG, JPEG, GIF, WebP`,
      },
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      success: false,
      error: {
        fileName: file.name,
        reason: "size",
        message: `Image too large (${sizeMB}MB). Maximum size is 5MB`,
      },
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      // Check image dimensions
      try {
        const { width, height } = await checkImageDimensions(dataUrl);
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          resolve({
            success: false,
            error: {
              fileName: file.name,
              reason: "dimensions",
              message: `Image dimensions too large (${width}x${height}). Maximum dimension is ${MAX_IMAGE_DIMENSION}px`,
            },
          });
          return;
        }
      } catch {
        resolve({
          success: false,
          error: {
            fileName: file.name,
            reason: "read_error",
            message: "Failed to read image dimensions",
          },
        });
        return;
      }

      // Extract base64 data (remove the "data:image/xxx;base64," prefix)
      const base64Data = dataUrl.split(",")[1];

      resolve({
        success: true,
        image: {
          id: generateImageId(),
          mediaType: file.type as SupportedMediaType,
          data: base64Data,
          previewUrl: dataUrl,
          fileName: file.name || undefined,
        },
      });
    };
    reader.onerror = () =>
      resolve({
        success: false,
        error: {
          fileName: file.name,
          reason: "read_error",
          message: "Failed to read image file",
        },
      });
    reader.readAsDataURL(file);
  });
}

export function useImagePaste() {
  const [images, setImages] = useState<PastedImage[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    ImageValidationError[]
  >([]);

  /**
   * Clears validation errors
   */
  const clearValidationErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  /**
   * Handles paste event from clipboard
   */
  const handlePaste = useCallback(
    async (event: React.ClipboardEvent | ClipboardEvent) => {
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) return;

      const imageFiles: File[] = [];
      for (const item of clipboardItems) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length === 0) return;

      // Prevent default paste behavior only if we have images
      event.preventDefault();

      const newImages: PastedImage[] = [];
      const newErrors: ImageValidationError[] = [];

      for (const file of imageFiles) {
        const result = await fileToImage(file);
        if (result.success) {
          newImages.push(result.image);
        } else {
          newErrors.push(result.error);
        }
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
      }
      if (newErrors.length > 0) {
        setValidationErrors((prev) => [...prev, ...newErrors]);
      }
    },
    [],
  );

  /**
   * Handles file input change (for drag-drop or file picker)
   */
  const handleFileSelect = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return;

      const newImages: PastedImage[] = [];
      const newErrors: ImageValidationError[] = [];

      for (const file of files) {
        const result = await fileToImage(file);
        if (result.success) {
          newImages.push(result.image);
        } else {
          newErrors.push(result.error);
        }
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
      }
      if (newErrors.length > 0) {
        setValidationErrors((prev) => [...prev, ...newErrors]);
      }
    },
    [],
  );

  /**
   * Removes an image by ID
   */
  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  /**
   * Clears all images
   */
  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  /**
   * Gets images in the format expected by the backend
   */
  const getImagesForRequest = useCallback(() => {
    return images.map(({ mediaType, data }) => ({ mediaType, data }));
  }, [images]);

  return {
    images,
    handlePaste,
    handleFileSelect,
    removeImage,
    clearImages,
    getImagesForRequest,
    hasImages: images.length > 0,
    validationErrors,
    clearValidationErrors,
    hasValidationErrors: validationErrors.length > 0,
  };
}
