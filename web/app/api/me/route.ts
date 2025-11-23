import { NextResponse } from "next/server";

function parseNumber(value: string | null) {
  if (!value) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export async function GET(request: Request) {
  const headers = request.headers;
  const userId = headers.get("x-user-id");
  const token = headers.get("x-user-token") ?? "";
  const nickname = headers.get("x-user-nickname") ?? "";
  const email = headers.get("x-user-email") ?? "";

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
