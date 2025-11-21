import type {
  ConsumableOperationAuditQuery,
} from "@/lib/repositories/consumable-operations";
import type {
  ConsumableOperationStatus,
  ConsumableOperationType,
} from "@/lib/types/consumable-operation";
import { CONSUMABLE_OPERATION_TYPES } from "@/lib/types/consumable-operation";

export type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

const TYPE_VALUES = CONSUMABLE_OPERATION_TYPES.map((item) => item.value);
const STATUS_VALUES: ConsumableOperationStatus[] = [
  "pending",
  "done",
  "cancelled",
];

function isURLSearchParams(
  params: RawSearchParams,
): params is URLSearchParams {
  return typeof (params as URLSearchParams).get === "function";
}

function getValues(params: RawSearchParams, key: string) {
  if (isURLSearchParams(params)) {
    const values = params.getAll(key);
    if (values.length) {
      return values;
    }
    const single = params.get(key);
    return single ? [single] : [];
  }

  const raw = params[key];
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.length > 0) {
    return [raw];
  }
  return [];
}

function getFirst(params: RawSearchParams, key: string) {
  const values = getValues(params, key);
  return values.length ? values[0] : undefined;
}

function filterEnum<T extends string>(values: string[], allowed: T[]) {
  const set = new Set(allowed);
  return values
    .map((value) => value.trim())
    .filter((value): value is T => set.has(value as T));
}

function parseNumber(value?: string, fallback?: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function buildConsumableOperationQuery(
  params: RawSearchParams,
): ConsumableOperationAuditQuery {
  const types = filterEnum<ConsumableOperationType>(
    getValues(params, "type"),
    TYPE_VALUES,
  );
  const statuses = filterEnum<ConsumableOperationStatus>(
    getValues(params, "status"),
    STATUS_VALUES,
  );

  const page = parseNumber(getFirst(params, "page"));
  const pageSize = parseNumber(getFirst(params, "pageSize"));

  const query: ConsumableOperationAuditQuery = {};

  if (types.length) {
    query.types = types;
  }

  if (statuses.length) {
    query.statuses = statuses;
  }

  const keyword = getFirst(params, "keyword");
  if (keyword) {
    query.keyword = keyword.trim();
  }

  const consumableId = getFirst(params, "consumableId");
  if (consumableId) {
    query.consumableId = consumableId.trim();
  }

  const keeper = getFirst(params, "keeper");
  if (keeper) {
    query.keeper = keeper.trim();
  }

  const actor = getFirst(params, "actor");
  if (actor) {
    query.actor = actor.trim();
  }

  const dateFrom = parseDate(getFirst(params, "dateFrom"));
  if (dateFrom) {
    query.dateFrom = dateFrom;
  }

  const dateTo = parseDate(getFirst(params, "dateTo"));
  if (dateTo) {
    query.dateTo = dateTo;
  }

  if (page && page > 0) {
    query.page = page;
  }

  if (pageSize && pageSize > 0) {
    query.pageSize = pageSize;
  }

  return query;
}

export function toURLSearchParams(
  params: Record<string, string | string[] | undefined>,
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => entry && query.append(key, entry));
    } else if (typeof value === "string" && value) {
      query.set(key, value);
    }
  });
  return query;
}

export function searchParamsToQueryString(
  params: Record<string, string | string[] | undefined>,
) {
  const query = toURLSearchParams(params);
  return query.toString();
}

