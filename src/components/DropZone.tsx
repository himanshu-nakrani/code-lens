"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DropZoneProps {
  onFiles: (files: FileList | File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function DropZone({ onFiles, disabled, compact }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  // Directory uploads: set non-standard attributes reliably
  useEffect(() => {
    const el = dirInputRef.current;
    if (!el) return;
    el.setAttribute("webkitdirectory", "");
    el.setAttribute("directory", "");
  });

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (disabled) return;

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const files = await collectFromDataTransfer(e.dataTransfer);
        if (files.length > 0) {
          onFiles(files);
          return;
        }
      }
      if (e.dataTransfer.files?.length) {
        onFiles(e.dataTransfer.files);
      }
    },
    [disabled, onFiles]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary text-xs"
        >
          Add files
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => dirInputRef.current?.click()}
          className="btn-secondary text-xs"
        >
          Add folder
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onFiles(e.target.files)}
        />
        <input
          ref={dirInputRef}
          type="file"
          multiple
          className="hidden"
          {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={(e) => e.target.files && onFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`drop-zone relative flex flex-col items-center justify-center px-5 py-8 ${
        dragging ? "drop-zone-active" : ""
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">
        {dragging ? "release to load" : "drop zone"}
      </p>
      <p className="mt-2 max-w-xs text-center text-[11px] leading-relaxed text-[var(--muted)]">
        Source/text · 200 KB / file · 2 MB total · folders ok
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary"
        >
          Files
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => dirInputRef.current?.click()}
          className="btn-secondary"
        >
          Folder
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
      <input
        ref={dirInputRef}
        type="file"
        multiple
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </div>
  );
}

/** Recursively read dropped directories via FileSystemEntry API */
async function collectFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const files: File[] = [];
  const items = Array.from(dt.items);

  const entries: FileSystemEntry[] = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }

  if (entries.length === 0) {
    return Array.from(dt.files);
  }

  async function walk(entry: FileSystemEntry, prefix: string): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      // Preserve relative path for tree display
      const path = prefix ? `${prefix}/${file.name}` : file.name;
      Object.defineProperty(file, "webkitRelativePath", {
        value: path,
        writable: false,
      });
      files.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children = await readAllEntries(reader);
      const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      for (const child of children) {
        await walk(child, nextPrefix);
      }
    }
  }

  for (const entry of entries) {
    await walk(entry, "");
  }
  return files;
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all);
        } else {
          all.push(...batch);
          readBatch();
        }
      }, reject);
    };
    readBatch();
  });
}
