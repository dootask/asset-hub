export type AssetStatus = "in-use" | "idle" | "maintenance" | "retired";

export interface Asset {
  id: string;
  name: string;
  category: string;
  status: AssetStatus;
  owner: string;
  location: string;
  purchaseDate: string; // ISO string
}

export interface CreateAssetPayload {
  name: string;
  category: string;
  status: AssetStatus;
  owner: string;
  location: string;
  purchaseDate: string;
}

