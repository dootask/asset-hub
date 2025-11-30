import { NextResponse } from "next/server";
import { readUserCookieFromString } from "@/lib/utils/user-cookie";

export async function GET(request: Request) {
  const cookieUser = readUserCookieFromString(request.headers.get("cookie"));

  if (!cookieUser) {
    return NextResponse.json(
      {
        error: "USER_CONTEXT_MISSING",
        message: "缺少用户信息，请通过插件入口访问或确保已写入认证 Cookie。",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: {
      id: cookieUser.id,
      nickname: cookieUser.nickname ?? "",
      email: cookieUser.email ?? "",
      token: cookieUser.token ?? "",
    },
  });
}
