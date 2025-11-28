import { listAssetCategories } from "@/lib/repositories/asset-categories";
import AssetCategoriesClient from "./AssetCategoriesClient";

export default async function AssetCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = listAssetCategories();
  return (
    <AssetCategoriesClient initialCategories={categories} locale={locale} />
  );
}

