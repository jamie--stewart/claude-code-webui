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

/**
 * Converts a File to a PastedImage object
 */
async function fileToImage(file: File): Promise<PastedImage | null> {
  if (!isSupportedImageType(file.type)) {
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Extract base64 data (remove the "data:image/xxx;base64," prefix)
      const base64Data = dataUrl.split(",")[1];

      resolve({
        id: generateImageId(),
        mediaType: file.type as SupportedMediaType,
        data: base64Data,
        previewUrl: dataUrl,
        fileName: file.name || undefined,
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function useImagePaste() {
  const [images, setImages] = useState<PastedImage[]>([]);

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
      for (const file of imageFiles) {
        const image = await fileToImage(file);
        if (image) {
          newImages.push(image);
        }
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
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
      for (const file of files) {
        const image = await fileToImage(file);
        if (image) {
          newImages.push(image);
        }
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
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
  };
}
