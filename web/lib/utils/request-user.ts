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
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const headers = request.headers;

  const id =
    firstNonEmpty([
      searchParams.get("user_id"),
      headers.get("x-user-id"),
      headers.get("x-dootask-user-id"),
    ]) ?? null;

  if (!id) {
    return null;
  }

  const nickname =
    firstNonEmpty([
      searchParams.get("user_nickname"),
      headers.get("x-user-nickname"),
    ]) ?? undefined;

  const email =
    firstNonEmpty([
      searchParams.get("user_email"),
      headers.get("x-user-email"),
    ]) ?? undefined;

  const token =
    firstNonEmpty([
      searchParams.get("user_token"),
      headers.get("x-user-token"),
      headers.get("x-dootask-user-token"),
    ]) ?? undefined;

  return {
    id,
    nickname,
    email,
    token,
  };
}


