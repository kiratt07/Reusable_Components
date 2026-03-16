// header.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All shared types for the ui-header library component.
// Centralised here so they can be imported by the component, service, and tests
// without any circular dependency.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard OIDC / Keycloak JWT payload fields we care about.
 * All fields are optional — tokens from different providers may omit any of them.
 */
export interface JwtPayload {
  /** Full display name (e.g. "John Doe") */
  name?: string;
  /** Given name */
  firstName?: string;
  /** Family name */
  lastName?: string;
  /** Keycloak-specific short username */
  preferred_username?: string;
  /** Email address as final fallback identifier */
  email?: string;
}

/**
 * Branding configuration consumed by the header.
 * Supplied via InjectionToken — never hard-imported.
 */
export interface HeaderConfig {
  /** Primary company name, e.g. "BNP Paribas" */
  companyName: string;
  /** Subtitle shown after the dash, e.g. "Client Engagement & Financial Security" */
  companySubtitle: string;
  /** Path to the logo image asset */
  logoPath: string;
}

/**
 * Resolved user profile derived from the JWT token.
 * This is what the component works with — never the raw token.
 */
export interface UserProfile {
  /** Best available display name */
  fullName: string;
  /** Up to 2 uppercase initials for the avatar circle */
  initials: string;
}
