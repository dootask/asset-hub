export interface AssetCategory {
  id: string;
  code: string;
  labelZh: string;
  labelEn: string;
  assetNoPrefix?: string | null;
  description?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetCategoryInput {
  code?: string;
  labelZh: string;
  labelEn: string;
  assetNoPrefix?: string | null;
  description?: string | null;
  color?: string | null;
}

export interface UpdateAssetCategoryInput {
  labelZh?: string;
  labelEn?: string;
  assetNoPrefix?: string | null;
  description?: string | null;
  color?: string | null;
}

