import { XMarkIcon } from "@heroicons/react/24/solid";
import type { PastedImage } from "../../hooks/chat/useImagePaste";

interface ImagePreviewProps {
  images: PastedImage[];
  onRemove: (id: string) => void;
}

export function ImagePreview({ images, onRemove }: ImagePreviewProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 p-2 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
      {images.map((image) => (
        <div key={image.id} className="relative flex-shrink-0 group">
          <img
            src={image.previewUrl}
            alt={image.fileName || "Pasted image"}
            className="h-16 w-16 object-cover rounded-md border border-slate-200 dark:border-slate-600"
          />
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            className="absolute -top-1 -right-1 p-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            title="Remove image"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
          {image.fileName && (
            <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-black/50 text-white truncate px-0.5 rounded-b-md">
              {image.fileName}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
