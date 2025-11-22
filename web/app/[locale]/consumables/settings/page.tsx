import type { Metadata } from "next";
import ConsumableCategoriesClient from "./ConsumableCategoriesClient";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";
import { getRequestBaseUrl } from "@/lib/utils/server-url";

export const metadata: Metadata = {
  title: "耗材类别 - Asset Hub",
};

export default async function ConsumableSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = listConsumableCategories();
  const baseUrl = await getRequestBaseUrl();
  return (
    <ConsumableCategoriesClient
      locale={locale}
      initialCategories={categories}
      baseUrl={baseUrl}
    />
  );
}

