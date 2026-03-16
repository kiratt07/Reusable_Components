// header-config.token.ts
// ─────────────────────────────────────────────────────────────────────────────
// Angular InjectionToken for HeaderConfig.
//
// WHY a token instead of a direct JSON import?
//   • Allows runtime override per deployment (white-labelling, multi-tenant)
//   • Makes unit tests trivial — just provide a mock value
//   • Zero coupling between the component and a static file path
//
// USAGE in consuming app (app.config.ts or any module):
//   providers: [
//     { provide: HEADER_CONFIG, useValue: { companyName: 'My Bank', ... } }
//   ]
//
// If no provider is registered, the factory falls back to header-config.json.
// ─────────────────────────────────────────────────────────────────────────────

import { InjectionToken } from '@angular/core';
import { HeaderConfig } from './header.types';
import defaultConfig from './header-config.json';

export const HEADER_CONFIG = new InjectionToken<HeaderConfig>(
  'HEADER_CONFIG',
  {
    providedIn: 'root',
    factory: () => defaultConfig as HeaderConfig,
  }
);
