// nav-config.token.ts
// ─────────────────────────────────────────────────────────────────────────────
// InjectionToken for NavConfig — replaces direct JSON import.
//
// WHY:
//   • Direct import (navConfig as unknown as NavConfig) is a TypeScript lie
//   • Token allows runtime override, mocking in tests, multi-tenant config
//
// USAGE in consuming app (app.config.ts):
//   providers: [
//     { provide: NAV_CONFIG, useValue: myCustomNavConfig }
//   ]
//
// If no provider is registered → falls back to nav-config.json automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { InjectionToken } from '@angular/core';
import type { NavConfig } from './left-menu.types';
import defaultConfig from './nav-config.json';

export const NAV_CONFIG = new InjectionToken<NavConfig>(
  'NAV_CONFIG',
  {
    providedIn: 'root',
    factory: () => defaultConfig as NavConfig,
  }
);
