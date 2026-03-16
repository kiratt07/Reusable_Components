// ui-header.component.ts
// ─────────────────────────────────────────────────────────────────────────────
// Standalone Angular 19 header component for the CEFS application.
//
// Responsibilities (ONLY these — nothing else):
//   • Render company branding from injected HeaderConfig
//   • Render user avatar initials from a resolved UserProfile
//   • Re-resolve the profile whenever the authToken input changes
//
// This component does NOT decode JWTs itself — that is JwtDecoderService's job.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  input,          // Angular 19 signal-based input
  computed,       // Angular 19 computed signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { HEADER_CONFIG } from './header-config.token';
import { JwtDecoderService } from './jwt-decoder.service';
import { HeaderConfig, UserProfile } from './header.types';

@Component({
  selector: 'ui-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-header.component.html',
  styleUrl: './ui-header.component.scss',
  host: {
    // Semantic HTML5 landmark — required for WCAG 2.1 AA compliance
    role: 'banner',
    class: 'ui-header-host',
  },
})
export class UiHeaderComponent {

  // ─── Signal-based input (Angular 17+ recommended pattern) ─────────────────
  /**
   * JWT auth token supplied by the consuming application.
   * Can be passed as:
   *   <ui-header [authToken]="myToken" />
   *
   * The component reacts automatically when this signal changes —
   * no need for OnChanges lifecycle hook with signal inputs.
   */
  readonly authToken = input<string>('');

  // ─── Injected dependencies ────────────────────────────────────────────────
  /** Company branding — override via: { provide: HEADER_CONFIG, useValue: {...} } */
  readonly config: HeaderConfig = inject(HEADER_CONFIG);

  private readonly jwtDecoder = inject(JwtDecoderService);

  // ─── Computed view state (auto-updates when authToken signal changes) ──────
  /**
   * Derived user profile — recomputed reactively whenever authToken changes.
   * This replaces both ngOnInit + ngOnChanges from the classic approach.
   */
  readonly userProfile = computed<UserProfile>(() =>
    this.jwtDecoder.decode(this.authToken())
  );
}
