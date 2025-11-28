import type { Metadata } from "next";
import ConsumableCategoriesClient from "./ConsumableCategoriesClient";
import { listConsumableCategories } from "@/lib/repositories/consumable-categories";

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
  return (
    <ConsumableCategoriesClient
      locale={locale}
      initialCategories={categories}
    />
  );
}
