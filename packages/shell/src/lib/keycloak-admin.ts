/**
 * Keycloak Admin REST API client helpers.
 *
 * Used by registration and account management flows to create and manage
 * Keycloak user accounts. Authenticates via the client_credentials grant
 * using the configured KEYCLOAK_CLIENT_ID / KEYCLOAK_CLIENT_SECRET, which
 * must have the "manage-users" service account role in the realm.
 *
 * All functions throw a KeycloakAdminError on failure so callers can
 * distinguish Keycloak errors from other unexpected errors.
 */

export class KeycloakAdminError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'KeycloakAdminError';
  }
}

/**
 * Obtains a short-lived admin access token using the client_credentials grant.
 * The calling function is responsible for scoping the token lifetime to a
 * single request — do not cache these tokens across requests.
 */
async function getAdminToken(): Promise<string> {
  const keycloakUrl = process.env.KEYCLOAK_URL;
  const realm = process.env.KEYCLOAK_REALM;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

  if (!keycloakUrl || !realm || !clientId || !clientSecret) {
    throw new KeycloakAdminError(
      'Keycloak environment variables are not configured (KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET)',
    );
  }

  const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new KeycloakAdminError(
      `Failed to obtain Keycloak admin token: ${response.status} ${text}`,
      response.status,
    );
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new KeycloakAdminError('Keycloak token response did not include access_token');
  }

  return data.access_token;
}

function getAdminBaseUrl(): string {
  const keycloakUrl = process.env.KEYCLOAK_URL;
  const realm = process.env.KEYCLOAK_REALM;

  if (!keycloakUrl || !realm) {
    throw new KeycloakAdminError(
      'KEYCLOAK_URL and KEYCLOAK_REALM environment variables are required',
    );
  }

  return `${keycloakUrl}/admin/realms/${realm}`;
}

/**
 * Creates a user in Keycloak with the given credentials.
 *
 * Returns the Keycloak user ID extracted from the Location header of the
 * 201 Created response.
 *
 * Throws KeycloakAdminError on:
 * - 409 Conflict  — email already registered in Keycloak
 * - Any other non-2xx response
 */
export async function createKeycloakUser(params: {
  email: string;
  name: string;
  password: string;
}): Promise<string> {
  const token = await getAdminToken();
  const baseUrl = getAdminBaseUrl();

  const firstName = params.name.split(' ')[0] ?? params.name;
  const lastName = params.name.split(' ').slice(1).join(' ') || undefined;

  const body = {
    username: params.email,
    email: params.email,
    firstName,
    ...(lastName ? { lastName } : {}),
    enabled: true,
    emailVerified: false,
    credentials: [
      {
        type: 'password',
        value: params.password,
        temporary: false,
      },
    ],
  };

  const response = await fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 409) {
    throw new KeycloakAdminError(
      'A Keycloak account with this email address already exists.',
      409,
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new KeycloakAdminError(
      `Failed to create Keycloak user: ${response.status} ${text}`,
      response.status,
    );
  }

  // Keycloak returns the new user URL in the Location header:
  // e.g. http://localhost:8080/admin/realms/vastu/users/<uuid>
  const location = response.headers.get('Location');
  if (!location) {
    throw new KeycloakAdminError(
      'Keycloak user created but Location header was missing from response',
    );
  }

  const keycloakUserId = location.split('/').pop();
  if (!keycloakUserId) {
    throw new KeycloakAdminError(
      `Could not extract user ID from Keycloak Location header: ${location}`,
    );
  }

  return keycloakUserId;
}

/**
 * Deletes a Keycloak user by their Keycloak user ID.
 *
 * Used as a compensating transaction when DB record creation fails after
 * the Keycloak user has already been created. Failures are logged but not
 * re-thrown so that the original error is not swallowed.
 */
export async function deleteKeycloakUser(keycloakUserId: string): Promise<void> {
  let token: string;
  try {
    token = await getAdminToken();
  } catch (err) {
    console.error('[keycloak-admin] Failed to obtain token for cleanup delete:', err);
    return;
  }

  const baseUrl = getAdminBaseUrl();
  const response = await fetch(`${baseUrl}/users/${keycloakUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => '');
    console.error(
      `[keycloak-admin] Failed to delete Keycloak user ${keycloakUserId} during cleanup: ${response.status} ${text}`,
    );
  }
}
