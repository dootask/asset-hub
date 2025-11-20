import { listAssetCategories } from "@/lib/repositories/asset-categories";
import AssetCategoriesClient from "./AssetCategoriesClient";
import { getRequestBaseUrl } from "@/lib/utils/server-url";

export default async function AssetCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = listAssetCategories();
  const baseUrl = await getRequestBaseUrl();
  return (
    <AssetCategoriesClient initialCategories={categories} locale={locale} baseUrl={baseUrl} />
  );
}


