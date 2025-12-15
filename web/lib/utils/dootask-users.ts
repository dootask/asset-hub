"use client";

import { fetchUserBasic } from "@dootask/tools";

export type DootaskUserBasic = {
  userid?: string | number;
  id?: string | number;
  nickname?: string;
  name?: string;
};

export type FetchUserBasicOptions = {
  batchSize?: number;
};

function normalizeNumericIds(ids: Array<string | number>) {
  const seen = new Set<number>();
  const normalized: number[] = [];
  ids.forEach((raw) => {
    const numeric = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(numeric)) return;
    if (seen.has(numeric)) return;
    seen.add(numeric);
    normalized.push(numeric);
  });
  return normalized;
}

export function toUserNameMap(users: DootaskUserBasic[]) {
  const map: Record<string, string> = {};
  users.forEach((user) => {
    const rawId = user?.userid ?? user?.id;
    const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
    const name = user?.nickname ?? user?.name ?? "";
    if (!id || !name) return;
    map[id] = name;
  });
  return map;
}

export async function fetchUserBasicBatched(
  userIds: Array<string | number>,
  options: FetchUserBasicOptions = {},
) {
  const batchSize = options.batchSize ?? 50;
  const numericIds = normalizeNumericIds(userIds);
  if (numericIds.length === 0) return [];

  const users: DootaskUserBasic[] = [];
  for (let i = 0; i < numericIds.length; i += batchSize) {
    const batch = numericIds.slice(i, i + batchSize);
    try {
      const result = await fetchUserBasic(batch);
      if (Array.isArray(result)) {
        users.push(...(result as DootaskUserBasic[]));
      }
    } catch {
      // best-effort: ignore errors and continue remaining batches
    }
  }
  return users;
}

export async function fetchUserNameMap(
  userIds: Array<string | number>,
  options: FetchUserBasicOptions = {},
) {
  const users = await fetchUserBasicBatched(userIds, options);
  return toUserNameMap(users);
}

