"use client";

import { useMemo, useRef } from "react";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
  useFileUpload,
} from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiClient } from "@/lib/http/client";
import { extractApiErrorMessage } from "@/lib/utils/api-error";
import { useAppFeedback } from "@/components/providers/feedback-provider";
import type { UploadedFile } from "@/lib/types/upload";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  locale?: string;
  helperText?: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  accept?: string;
  className?: string;
};

const DEFAULT_ACCEPT =
  "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain";
const DEFAULT_MAX_SIZE = 20 * 1024 * 1024; // 20MB，需与后端校验保持一致

function UploadQueueList({
  locale,
  onRemoveFile,
}: {
  locale?: string;
  onRemoveFile?: (file: File) => void;
}) {
  const items = useFileUpload((state) => Array.from(state.files.values()));

  if (!items.length) return null;

  const isChinese = locale === "zh";
  return (
    <FileUploadList>
      {items.map((entry) => (
        <FileUploadItem
          key={`${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`}
          value={entry.file}
          className="gap-3"
        >
          <FileUploadItemPreview />
          <div className="flex flex-1 flex-col gap-1">
            <FileUploadItemMetadata size="sm" />
            <FileUploadItemProgress />
          </div>
          <FileUploadItemDelete
            asChild
            onClick={() => onRemoveFile?.(entry.file)}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <span className="sr-only">{isChinese ? "移除" : "Remove"}</span>
              ×
            </Button>
          </FileUploadItemDelete>
        </FileUploadItem>
      ))}
    </FileUploadList>
  );
}

export function AttachmentUploadField({
  value,
  onChange,
  locale = "en",
  helperText,
  maxFiles = 6,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  accept = DEFAULT_ACCEPT,
  className,
}: Props) {
  const feedback = useAppFeedback();
  const isChinese = locale === "zh";
  const uploadedUrlByFileKey = useRef<Map<string, string>>(new Map());
  const getFileKey = (file: File) =>
    `${file.name}-${file.size}-${file.lastModified}`;

  const hint = useMemo(
    () =>
      helperText ??
      (isChinese
        ? "支持图片、PDF、Word/Excel，单文件不超过 20MB。"
        : "Supports images, PDF, Word/Excel. Max 20MB each."),
    [helperText, isChinese],
  );

  const handleUpload = async (
    files: File[],
    helpers: {
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: Error) => void;
    },
  ) => {
    try {
      const client = await getApiClient();
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await client.post<{ data: UploadedFile[]; errors?: string[] }>(
        "/apps/asset-hub/api/uploads",
        formData,
        {
          onUploadProgress: (event) => {
            if (!event.total) return;
            const progress = Math.round((event.loaded / event.total) * 100);
            files.forEach((file) => helpers.onProgress(file, progress));
          },
        },
      );

      const uploaded = response.data.data ?? [];
      if (uploaded.length) {
        const nextUrls: string[] = [];
        uploaded.forEach((item, index) => {
          const file = files[index];
          if (!file) return;
          const key = getFileKey(file);
          uploadedUrlByFileKey.current.set(key, item.url);
          nextUrls.push(item.url);
        });

        const next = Array.from(new Set([...value, ...nextUrls]));
        onChange(next);
        files.forEach((file) => helpers.onSuccess(file));
      }

      if (response.data.errors?.length) {
        feedback.warning(response.data.errors.join("；"));
      }
    } catch (error) {
      const message = extractApiErrorMessage(
        error,
        isChinese ? "上传失败，请稍后重试。" : "Upload failed. Please try again.",
      );
      files.forEach((file) => helpers.onError(file, new Error(message)));
      feedback.error(message);
    }
  };

  const handleFileReject = (file: File, message: string) => {
    feedback.error(`${file.name}: ${message}`);
  };

  const handleFileValidate = (file: File) => {
    if (file.size > maxSizeBytes) {
      return isChinese
        ? `单个文件不能超过 ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB`
        : `Max file size ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB`;
    }
    return null;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <FileUpload
        accept={accept}
        maxFiles={maxFiles}
        maxSize={maxSizeBytes}
        multiple
        onFileReject={handleFileReject}
        onFileValidate={handleFileValidate}
        onUpload={handleUpload}
      >
        <FileUploadDropzone className="w-full">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center justify-center rounded-full border border-dashed p-2.5">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {isChinese ? "拖拽文件到此处" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-muted-foreground">{hint}</p>
            <FileUploadTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                {isChinese ? "浏览文件" : "Browse files"}
              </Button>
            </FileUploadTrigger>
          </div>
        </FileUploadDropzone>

        <UploadQueueList
          locale={locale}
          onRemoveFile={(file) => {
            const key = getFileKey(file);
            const url = uploadedUrlByFileKey.current.get(key);
            if (url) {
              uploadedUrlByFileKey.current.delete(key);
              onChange(value.filter((item) => item !== url));
            }
          }}
        />
      </FileUpload>
    </div>
  );
}
