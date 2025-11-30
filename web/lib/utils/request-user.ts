import { readUserCookieFromString } from "@/lib/utils/user-cookie";

export interface RequestUser {
  id: string;
  nickname?: string;
  email?: string;
  token?: string;
}

export function extractUserFromRequest(request: Request): RequestUser | null {
  const cookieUser = readUserCookieFromString(request.headers.get("cookie"));
  if (!cookieUser) {
    return null;
  }
  return {
    id: String(cookieUser.id),
    nickname: cookieUser.nickname,
    email: cookieUser.email,
    token: cookieUser.token,
  };
}
