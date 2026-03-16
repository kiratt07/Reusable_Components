// index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Public API barrel file for the ui-header library component.
//
// Consumers import ONLY from this file:
//   import { UiHeaderComponent, HEADER_CONFIG } from '@cefs/ui-header';
//
// This pattern:
//   • Hides internal implementation files from consumers
//   • Makes refactoring internals non-breaking
//   • Follows Angular library best practices
// ─────────────────────────────────────────────────────────────────────────────

export { UiHeaderComponent } from './ui-header.component';
export { HEADER_CONFIG } from './header-config.token';
export type { HeaderConfig, UserProfile, JwtPayload } from './header.types';
