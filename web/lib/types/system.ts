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
}

export interface CreateRolePayload {
  name: string;
  scope: string;
  description?: string;
}

