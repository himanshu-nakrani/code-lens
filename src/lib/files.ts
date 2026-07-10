import { detectLanguage, isTextSourceFile } from "./languages";
import type { CodeFile } from "./types";

/** Caps for a reliable local demo */
export const MAX_FILE_BYTES = 200_000; // 200 KB per file
export const MAX_TOTAL_BYTES = 2_000_000; // 2 MB total
export const MAX_FILES = 80;

export interface IngestResult {
  files: CodeFile[];
  skipped: string[];
  truncated: string[];
  warnings: string[];
}

function pathFromFile(file: File): string {
  // webkitRelativePath is set for directory uploads
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  if (rel && rel.length > 0) return rel;
  return file.name;
}

/** Exported for unit tests and optional callers. */
export function isLikelyBinaryContent(text: string): boolean {
  // NUL bytes or high ratio of non-printable chars
  if (text.includes("\u0000")) return true;
  let bad = 0;
  const sample = text.slice(0, 4000);
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13) continue;
    if (c < 32 || c === 127) bad++;
  }
  return sample.length > 0 && bad / sample.length > 0.1;
}

export async function ingestFiles(fileList: FileList | File[]): Promise<IngestResult> {
  const files: CodeFile[] = [];
  const skipped: string[] = [];
  const truncated: string[] = [];
  const warnings: string[] = [];
  let totalBytes = 0;

  const list = Array.from(fileList);

  for (const file of list) {
    if (files.length >= MAX_FILES) {
      warnings.push(`Stopped after ${MAX_FILES} files (demo limit).`);
      break;
    }

    const path = pathFromFile(file);
    const name = file.name;

    if (!isTextSourceFile(name) && !isTextSourceFile(path)) {
      skipped.push(`${path} (binary or unsupported type)`);
      continue;
    }

    if (file.size > MAX_FILE_BYTES) {
      skipped.push(`${path} (${formatBytes(file.size)} exceeds ${formatBytes(MAX_FILE_BYTES)} limit)`);
      continue;
    }

    if (totalBytes + file.size > MAX_TOTAL_BYTES) {
      warnings.push(`Total payload cap ${formatBytes(MAX_TOTAL_BYTES)} reached; remaining files skipped.`);
      skipped.push(`${path} (total size cap)`);
      continue;
    }

    let content: string;
    try {
      content = await file.text();
    } catch {
      skipped.push(`${path} (could not read)`);
      continue;
    }

    if (isLikelyBinaryContent(content)) {
      skipped.push(`${path} (detected binary content)`);
      continue;
    }

    // Soft truncate very long text (shouldn't hit often due to size cap)
    const maxChars = 120_000;
    if (content.length > maxChars) {
      content = content.slice(0, maxChars) + "\n\n/* … truncated by Code Lens … */\n";
      truncated.push(path);
    }

    const language = detectLanguage(name);
    const id = `${path}-${file.size}-${file.lastModified}`;
    const size = new TextEncoder().encode(content).length;
    totalBytes += size;

    files.push({ id, name, path, content, language, size });
  }

  // Stable sort by path
  files.sort((a, b) => a.path.localeCompare(b.path));

  return { files, skipped, truncated, warnings };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
