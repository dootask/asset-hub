const DELETE_SUFFIX_PATTERN = /_delete_[a-z0-9]{6}$/i;

export function stripDeletedSuffix(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.replace(DELETE_SUFFIX_PATTERN, "");
}
