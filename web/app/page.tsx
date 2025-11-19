import { redirect } from "next/navigation";
import { normalizeLocale } from "@/lib/i18n";

type RootPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RootPage({ searchParams }: RootPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const langParam = resolvedSearchParams?.lang;
  const normalized = normalizeLocale(
    Array.isArray(langParam) ? langParam[0] : langParam,
  );
  redirect(`/${normalized}`);
}
