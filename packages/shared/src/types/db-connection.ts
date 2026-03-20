// encryptedPassword is intentionally omitted from the application-facing type — it must never be exposed
export type DbConnection = {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  sslEnabled: boolean;
  protocol: string;
  healthStatus: string;
  lastHealthCheck: Date | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateDbConnectionInput = Pick<
  DbConnection,
  'name' | 'host' | 'port' | 'database' | 'username' | 'organizationId'
> & {
  password: string;
  sslEnabled?: boolean;
  protocol?: string;
};

export type UpdateDbConnectionInput = Partial<
  Pick<DbConnection, 'name' | 'host' | 'port' | 'database' | 'username' | 'sslEnabled' | 'protocol'>
> & {
  password?: string;
};
