export interface Company {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

export interface CreateCompanyPayload {
  name: string;
  code: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  scope: string;
  description?: string;
  createdAt: string;
  members: string[];
}

export interface CreateRolePayload {
  name: string;
  scope: string;
  description?: string;
  members?: string[];
}

export interface SystemVersionInfo {
  version: string;
  releaseDate?: string | null;
  edition: string;
  plan: string;
  changelogUrl?: string | null;
  license: {
    maxUsers?: number | null;
    expiresAt?: string | null;
  };
}

