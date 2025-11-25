import { NextResponse } from "next/server";
import { saveUpload, validateUpload } from "@/lib/uploads";

const MAX_FILES_PER_REQUEST = 10;

type UploadResponse = {
  data: Awaited<ReturnType<typeof saveUpload>>[];
  errors?: string[];
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .concat(formData.getAll("file"))
      .filter((entry): entry is File => entry instanceof File);

    if (!files.length) {
      return NextResponse.json(
        { error: "FILE_REQUIRED", message: "请上传至少一个文件。" },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        {
          error: "TOO_MANY_FILES",
          message: `单次最多上传 ${MAX_FILES_PER_REQUEST} 个文件。`,
        },
        { status: 400 },
      );
    }

    const uploads: Awaited<ReturnType<typeof saveUpload>>[] = [];
    const errors: string[] = [];

    // 执行顺序逐个处理，避免超大并发占用内存
    // eslint-disable-next-line no-restricted-syntax
    for (const file of files) {
      const validationError = validateUpload(file);
      if (validationError) {
        errors.push(`${file.name || "文件"}: ${validationError}`);
        continue;
      }

      try {
        // 在单个文件层面执行，避免部分文件失败导致全部回滚
        // eslint-disable-next-line no-await-in-loop
        const record = await saveUpload(file);
        uploads.push(record);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "上传失败，请稍后重试。";
        errors.push(`${file.name || "文件"}: ${message}`);
      }
    }

    if (!uploads.length) {
      return NextResponse.json(
        {
          error: "UPLOAD_FAILED",
          message: errors.join("；") || "上传失败，请稍后重试。",
          errors,
        },
        { status: 400 },
      );
    }

    const responsePayload: UploadResponse = {
      data: uploads,
      errors: errors.length ? errors : undefined,
    };

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "上传失败，请稍后重试。";
    return NextResponse.json(
      {
        error: "UPLOAD_FAILED",
        message,
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
