import { redirect } from "next/navigation";
import { normalizeLocale } from "@/lib/i18n";

type RootPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function RootPage({ searchParams }: RootPageProps) {
  const langParam = searchParams?.lang;
  const normalized = normalizeLocale(
    Array.isArray(langParam) ? langParam[0] : langParam,
  );
  redirect(`/${normalized}`);
}
