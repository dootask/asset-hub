import { NextResponse } from "next/server";

function parseNumber(value: string | null) {
  if (!value) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const userId =
    searchParams.get("user_id") ??
    request.headers.get("x-user-id") ??
    request.headers.get("x-dootask-user-id");
  const token =
    searchParams.get("user_token") ??
    request.headers.get("x-user-token") ??
    request.headers.get("x-dootask-user-token");
  const nickname =
    searchParams.get("user_nickname") ??
    request.headers.get("x-user-nickname") ??
    "";
  const email =
    searchParams.get("user_email") ??
    request.headers.get("x-user-email") ??
    "";

  if (!userId) {
    return NextResponse.json(
      {
        error: "USER_CONTEXT_MISSING",
        message: "缺少 user_id，请通过 URL 或 Header 传入。",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: {
      id: parseNumber(userId),
      nickname,
      email,
      token,
    },
  });
}

