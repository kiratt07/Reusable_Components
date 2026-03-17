// ui-header.component.ts
import {
  Component,
  inject,
  input,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { HEADER_CONFIG } from './header-config.token';
import { JwtDecoderService } from './jwt-decoder.service';
import type { HeaderConfig, UserProfile } from './header.types';

@Component({
  selector: 'ui-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-header.component.html',
  styleUrl: './ui-header.component.scss',
  host: {
    role: 'banner',
    class: 'ui-header-host',
  },
})
export class UiHeaderComponent {

  /** JWT auth token supplied by the consuming application */
  readonly authToken = input<string>('');

  /** Company branding from injected config */
  readonly config: HeaderConfig = inject(HEADER_CONFIG);

  private readonly jwtDecoder = inject(JwtDecoderService);

  /** Reactively decoded user profile — updates when authToken changes */
  readonly userProfile = computed<UserProfile>(() =>
    this.jwtDecoder.decode(this.authToken())
  );
}
