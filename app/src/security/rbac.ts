import type { Decision, Domain } from '../schema/decision.schema.js';

// Role-based visibility for multi-user LAN access. Some domains (finance) are
// restricted; only full-access roles see them. Everything is local; this governs
// who-sees-what within the local network, not what leaves the machine.
export interface VisibilityPolicy {
  /** Roles that can see everything, including restricted domains. */
  fullAccessRoles: string[];
  /** Domains hidden from roles without full access. */
  restrictedDomains: Domain[];
}

export const DEFAULT_POLICY: VisibilityPolicy = {
  fullAccessRoles: ['owner', 'admin', 'founder', 'cfo', 'head-of-finance', 'finance'],
  restrictedDomains: ['finance'],
};

export function canSee(role: string, domain: Domain, policy: VisibilityPolicy = DEFAULT_POLICY): boolean {
  if (policy.fullAccessRoles.includes(role)) return true;
  return !policy.restrictedDomains.includes(domain);
}

export function visibleDomains(role: string, allDomains: readonly Domain[], policy: VisibilityPolicy = DEFAULT_POLICY): Domain[] {
  return allDomains.filter((d) => canSee(role, d, policy));
}

export function filterForRole<T extends Pick<Decision, 'domain'>>(
  items: T[],
  role: string,
  policy: VisibilityPolicy = DEFAULT_POLICY,
): T[] {
  return items.filter((d) => canSee(role, d.domain, policy));
}

/** Default role when none supplied — full access (single-operator local use). */
export const DEFAULT_ROLE = 'owner';
