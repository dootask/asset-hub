import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { getDataDirectory } from "@/lib/config";
import type { UploadedFile } from "@/lib/types/upload";

const UPLOAD_SUBDIR = "uploads";
const UPLOAD_ROUTE_PREFIX = "/apps/asset-hub/api/uploads";
export const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const EXTENSION_MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function getUploadDirectory() {
  return path.join(getDataDirectory(), UPLOAD_SUBDIR);
}

async function ensureUploadDirectory() {
  const dir = getUploadDirectory();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function getExtension(file: File) {
  const extFromName = path.extname(file.name || "").toLowerCase();
  if (extFromName) return extFromName;

  const guessedExt = Object.entries(EXTENSION_MIME_MAP).find(
    ([, mime]) => mime === file.type,
  );
  return guessedExt ? guessedExt[0] : "";
}

function guessMimeType(file: File, extension: string) {
  if (file.type) return file.type;
  if (!extension) return "application/octet-stream";
  return EXTENSION_MIME_MAP[extension] ?? "application/octet-stream";
}

export function buildUploadUrl(id: string) {
  return `${UPLOAD_ROUTE_PREFIX}/${encodeURIComponent(id)}`;
}

export function validateUpload(file: File) {
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `文件大小超出限制（最大 ${(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB）`;
  }

  const ext = getExtension(file);
  const mimeType = guessMimeType(file, ext);
  if (ALLOWED_MIME_TYPES.has(mimeType)) {
    return null;
  }

  return "文件类型不被允许，仅支持图片、PDF、Office 文档或纯文本。";
}

export async function saveUpload(file: File): Promise<UploadedFile> {
  const dir = await ensureUploadDirectory();
  const extension = getExtension(file);
  const publicId = `${randomUUID()}${extension}`;
  const filePath = path.join(dir, publicId);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const mimeType = guessMimeType(file, extension);
  const createdAt = new Date().toISOString();

  const metadata: UploadedFile & { storedName: string } = {
    id: publicId,
    url: buildUploadUrl(publicId),
    name: file.name || publicId,
    size: file.size,
    mimeType,
    createdAt,
    storedName: publicId,
  };

  const metaPath = path.join(dir, `${publicId}.json`);
  await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), "utf-8");

  return {
    id: metadata.id,
    url: metadata.url,
    name: metadata.name,
    size: metadata.size,
    mimeType: metadata.mimeType,
    createdAt: metadata.createdAt,
  };
}

export async function getUploadRecord(id: string): Promise<UploadedFile | null> {
  const dir = getUploadDirectory();
  const normalizedId = path.basename(id);
  const metaPath = path.join(dir, `${normalizedId}.json`);
  try {
    const content = await fs.readFile(metaPath, "utf-8");
    const parsed = JSON.parse(content) as UploadedFile & {
      storedName?: string;
    };
    const url = buildUploadUrl(parsed.id);
    return { ...parsed, url };
  } catch (error) {
    return null;
  }
}

export async function readUploadedFile(id: string) {
  const dir = getUploadDirectory();
  const normalizedId = path.basename(id);
  const filePath = path.join(dir, normalizedId);

  try {
    const file = await fs.readFile(filePath);
    return file;
  } catch (error) {
    return null;
  }
}
