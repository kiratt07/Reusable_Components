// jwt-decoder.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single-responsibility service: decode a JWT string → UserProfile.
//
// Kept separate from the component so that:
//   1. The component stays a pure presentation layer
//   2. This logic can be unit-tested in complete isolation
//   3. Any future migration to a library (e.g. angular-jwt) is a 1-file change
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@angular/core';
import { JwtPayload, UserProfile } from './header.types';

@Injectable({ providedIn: 'root' })
export class JwtDecoderService {

  /**
   * Decodes a JWT string and returns a resolved UserProfile.
   * Always safe to call — returns a fallback profile on any failure.
   *
   * @param token  Raw JWT string (3 dot-separated segments)
   */
  decode(token: string): UserProfile {
    if (!token?.trim()) {
      return this.fallbackProfile();
    }

    try {
      const payload = this.parsePayload(token);
      const fullName = this.resolveFullName(payload);
      return {
        fullName,
        initials: this.getInitials(fullName),
      };
    } catch (error) {
      // Log for debugging but never surface raw errors to the UI
      console.error('[JwtDecoderService] Token decode failed:', error);
      return this.fallbackProfile();
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Extracts and JSON-parses the JWT payload (middle segment).
   *
   * IMPORTANT: JWTs use base64URL encoding, not standard base64.
   * base64URL replaces '+' with '-' and '/' with '_', and omits padding ('=').
   * We must reverse this before calling atob(), otherwise atob() throws
   * on many real-world tokens.
   */
  private parsePayload(token: string): JwtPayload {
    const segments = token.split('.');
    if (segments.length !== 3) {
      throw new Error('Invalid JWT structure — expected 3 segments');
    }

    const base64Url = segments[1];

    // Step 1: Convert base64URL → standard base64
    const base64 = base64Url
      .replace(/-/g, '+')   // URL-safe char back to standard
      .replace(/_/g, '/');  // URL-safe char back to standard

    // Step 2: Re-add padding stripped by base64URL spec
    const padded = base64.padEnd(
      base64.length + (4 - (base64.length % 4)) % 4,
      '='
    );

    return JSON.parse(atob(padded)) as JwtPayload;
  }

  /**
   * Resolves the best available display name from JWT claims.
   *
   * Priority order (most → least descriptive):
   *   1. name            — Full name from OIDC standard claim
   *   2. firstName + lastName — Composed from given/family name claims
   *   3. preferred_username  — Short username (Keycloak)
   *   4. email           — Email as last resort identifier
   *   5. 'Unknown'       — Absolute fallback
   */
  private resolveFullName(p: JwtPayload): string {
    if (p.name?.trim()) return p.name.trim();

    const composed = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
    if (composed) return composed;

    if (p.preferred_username?.trim()) return p.preferred_username.trim();
    if (p.email?.trim()) return p.email.trim();

    return 'Unknown';
  }

  /**
   * Generates up to 2 uppercase initials from a display name.
   * Examples:
   *   "Shreya Agarwal" → "SA"
   *   "alice"          → "A"
   *   ""               → "?"
   */
  private getInitials(fullName: string): string {
    if (!fullName?.trim()) return '?';

    return fullName
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /** Safe fallback when token is absent or unparseable */
  private fallbackProfile(): UserProfile {
    return { fullName: 'Unknown', initials: '?' };
  }
}
