// File System Access API type definitions
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    /** Runtime base path override for reverse proxy hosting */
    __BASE_PATH__?: string;
  }

  interface FileSystemDirectoryHandle {
    readonly kind: "directory";
    readonly name: string;
  }
}

export {};
