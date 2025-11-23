export interface RequestUser {
  id: string;
  nickname?: string;
  email?: string;
  token?: string;
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim().length > 0) ?? null;
}

export function extractUserFromRequest(request: Request): RequestUser | null {
  const headers = request.headers;

  const id =
    firstNonEmpty([headers.get("x-user-id")]) ?? null;

  if (!id) {
    return null;
  }

  const nickname =
    firstNonEmpty([headers.get("x-user-nickname")]) ?? undefined;

  const email =
    firstNonEmpty([headers.get("x-user-email")]) ?? undefined;

  const token =
    firstNonEmpty([headers.get("x-user-token")]) ?? undefined;

  return {
    id,
    nickname,
    email,
    token,
  };
}
