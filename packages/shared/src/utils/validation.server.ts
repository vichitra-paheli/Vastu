import dns from 'dns';
import net from 'net';

// ---------------------------------------------------------------------------
// SSRF protection — IP range validation
// ---------------------------------------------------------------------------

/**
 * Returns true when the dotted-decimal IPv4 string falls within a private,
 * loopback, link-local, multicast, or broadcast range that must not be
 * reachable from a user-supplied hostname.
 *
 * Blocked ranges:
 *   10.0.0.0/8        — RFC 1918 private
 *   172.16.0.0/12     — RFC 1918 private
 *   192.168.0.0/16    — RFC 1918 private
 *   127.0.0.0/8       — loopback
 *   169.254.0.0/16    — link-local / cloud metadata endpoint
 *   224.0.0.0/4       — multicast
 *   240.0.0.0/4       — reserved / broadcast
 *   0.0.0.0/8         — "this" network
 */
export function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    // Unparseable — treat as blocked to be safe
    return true;
  }
  const [a, b] = parts;

  if (a === 10) return true;                           // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
  if (a === 192 && b === 168) return true;             // 192.168.0.0/16
  if (a === 127) return true;                          // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;             // 169.254.0.0/16 link-local
  if (a >= 224) return true;                           // 224+/4 multicast, 240+/4 reserved
  if (a === 0) return true;                            // 0.0.0.0/8

  return false;
}

/**
 * Returns true when the IPv6 address is loopback (::1) or link-local
 * (fe80::/10).
 */
export function isBlockedIpv6(ip: string): boolean {
  // Normalise — strip zone ID if present (e.g. fe80::1%eth0)
  const bare = ip.split('%')[0].toLowerCase();
  if (bare === '::1') return true;
  if (bare.startsWith('fe8') || bare.startsWith('fe9') ||
      bare.startsWith('fea') || bare.startsWith('feb')) {
    return true; // fe80::/10
  }
  if (bare.startsWith('fc') || bare.startsWith('fd')) {
    return true; // fc00::/7 — unique local (RFC 4193)
  }
  return false;
}

export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

/**
 * Validates that `hostname` is safe to connect to.
 *
 * Steps:
 *  1. Reject the string "localhost" and bare IP strings in blocked ranges.
 *  2. Resolve the hostname via DNS.
 *  3. Reject if every resolved address is in a blocked range.
 *
 * Throws `SsrfBlockedError` if the host must be blocked.
 * Throws other errors on DNS failure (NXDOMAIN, SERVFAIL, etc.).
 *
 * @param hostname  The host portion from the DB connection record.
 */
export async function validateHostForSSRF(hostname: string): Promise<void> {
  const lower = hostname.trim().toLowerCase();

  // Reject "localhost" hostname immediately
  if (lower === 'localhost') {
    throw new SsrfBlockedError(
      'Connection to internal/private IP addresses is not allowed',
    );
  }

  // If the caller passed a raw IP, check it directly without a DNS round-trip
  if (net.isIPv4(hostname)) {
    if (isBlockedIpv4(hostname)) {
      throw new SsrfBlockedError(
        'Connection to internal/private IP addresses is not allowed',
      );
    }
    return;
  }

  if (net.isIPv6(hostname)) {
    if (isBlockedIpv6(hostname)) {
      throw new SsrfBlockedError(
        'Connection to internal/private IP addresses is not allowed',
      );
    }
    return;
  }

  // Hostname — resolve to IP(s) and validate every address.
  // We call both resolve4 and resolve6 so we catch AAAA-only hostnames.
  // Promise.allSettled never rejects; individual failures mean no addresses
  // for that family (NXDOMAIN, ENODATA, etc.).
  const [v4, v6] = await Promise.allSettled([
    dns.promises.resolve4(hostname),
    dns.promises.resolve6(hostname),
  ]);

  const addresses: string[] = [
    ...(v4.status === 'fulfilled' ? v4.value : []),
    ...(v6.status === 'fulfilled' ? v6.value : []),
  ];

  if (addresses.length === 0) {
    throw new Error(`DNS resolution returned no addresses for host: ${hostname}`);
  }

  const allBlocked = addresses.every((addr) => {
    if (net.isIPv4(addr)) return isBlockedIpv4(addr);
    if (net.isIPv6(addr)) return isBlockedIpv6(addr);
    return true; // unknown format — block
  });

  if (allBlocked) {
    throw new SsrfBlockedError(
      'Connection to internal/private IP addresses is not allowed',
    );
  }
}
