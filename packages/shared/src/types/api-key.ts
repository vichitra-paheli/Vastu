// keyHash is intentionally omitted from the application-facing type — it must never be exposed
export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scope: string;
  description: string | null;
  lastUsedAt: Date | null;
  requestCount24h: number;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

// Returned only at creation time; the full key is never stored in plaintext
export type ApiKeyWithPrefix = ApiKey & {
  fullKey: string;
};

export type CreateApiKeyInput = Pick<ApiKey, 'name' | 'userId' | 'organizationId'> & {
  scope?: string;
  description?: string;
};

export type UpdateApiKeyInput = Partial<Pick<ApiKey, 'name' | 'description' | 'scope'>>;
