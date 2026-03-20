export type TenantStatus = 'ACTIVE' | 'SANDBOX';

export type Organization = {
  id: string;
  name: string;
  logoUrl: string | null;
  workspaceUrl: string | null;
  defaultTimezone: string;
  defaultLanguage: string;
  ssoRequired: boolean;
  mfaRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Tenant = {
  id: string;
  name: string;
  subdomain: string;
  status: TenantStatus;
  region: string | null;
  dbIsolationMode: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateOrganizationInput = Pick<Organization, 'name'> & {
  logoUrl?: string;
  workspaceUrl?: string;
  defaultTimezone?: string;
  defaultLanguage?: string;
};

export type UpdateOrganizationInput = Partial<
  Pick<Organization, 'name' | 'logoUrl' | 'workspaceUrl' | 'defaultTimezone' | 'defaultLanguage' | 'ssoRequired' | 'mfaRequired'>
>;

export type CreateTenantInput = Pick<Tenant, 'name' | 'subdomain' | 'organizationId'> & {
  status?: TenantStatus;
  region?: string;
  dbIsolationMode?: string;
};

export type UpdateTenantInput = Partial<Pick<Tenant, 'name' | 'status' | 'region' | 'dbIsolationMode'>>;
