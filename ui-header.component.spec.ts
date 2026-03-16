// ui-header.component.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for UiHeaderComponent.
//
// Strategy:
//   • JwtDecoderService is MOCKED — component tests verify presentation only
//   • JWT decode logic is tested separately in jwt-decoder.service.spec.ts
//   • Tests use Angular 19 signal inputs via fixture.componentRef.setInput()
// ─────────────────────────────────────────────────────────────────────────────

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';

import { UiHeaderComponent } from './ui-header.component';
import { JwtDecoderService } from './jwt-decoder.service';
import { HEADER_CONFIG } from './header-config.token';
import { UserProfile } from './header.types';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const MOCK_CONFIG = {
  companyName: 'Test Corp',
  companySubtitle: 'Testing Division',
  logoPath: 'assets/test-logo.png',
};

const MOCK_PROFILE: UserProfile = { fullName: 'Shreya Agarwal', initials: 'SA' };
const FALLBACK_PROFILE: UserProfile = { fullName: 'Unknown', initials: '?' };

// ── Test suite ────────────────────────────────────────────────────────────────

describe('UiHeaderComponent', () => {
  let fixture: ComponentFixture<UiHeaderComponent>;
  let component: UiHeaderComponent;
  let decoderSpy: jest.Mocked<Pick<JwtDecoderService, 'decode'>>;

  beforeEach(async () => {
    decoderSpy = { decode: jest.fn().mockReturnValue(MOCK_PROFILE) };

    await TestBed.configureTestingModule({
      imports: [UiHeaderComponent],
      providers: [
        { provide: HEADER_CONFIG, useValue: MOCK_CONFIG },
        { provide: JwtDecoderService, useValue: decoderSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UiHeaderComponent);
    component = fixture.componentInstance;
  });

  // ── Creation ────────────────────────────────────────────────────────────────

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // ── Branding rendering ──────────────────────────────────────────────────────

  it('should render company name from injected config', () => {
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.company-title');
    expect(title?.textContent).toContain('Test Corp');
  });

  it('should render company subtitle from injected config', () => {
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.company-title');
    expect(title?.textContent).toContain('Testing Division');
  });

  it('should render logo with correct src from config', () => {
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('.company-logo-img');
    expect(img?.getAttribute('src')).toBe('assets/test-logo.png');
  });

  it('should have accessible alt text on logo', () => {
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('.company-logo-img');
    expect(img?.getAttribute('alt')).toBeTruthy();
  });

  // ── Avatar rendering ────────────────────────────────────────────────────────

  it('should display decoded user initials in avatar', () => {
    fixture.componentRef.setInput('authToken', 'valid.jwt.token');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('SA');
  });

  it('should show fallback initials when no token is provided', () => {
    decoderSpy.decode.mockReturnValue(FALLBACK_PROFILE);
    fixture.componentRef.setInput('authToken', '');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('?');
  });

  it('should set aria-label on avatar with full name', () => {
    fixture.componentRef.setInput('authToken', 'valid.jwt.token');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.getAttribute('aria-label')).toContain('Shreya Agarwal');
  });

  it('should update avatar when authToken signal changes', () => {
    fixture.componentRef.setInput('authToken', 'first.token');
    fixture.detectChanges();
    expect(decoderSpy.decode).toHaveBeenCalledWith('first.token');

    decoderSpy.decode.mockReturnValue({ fullName: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('authToken', 'second.token');
    fixture.detectChanges();

    expect(decoderSpy.decode).toHaveBeenCalledWith('second.token');
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('JD');
  });

  // ── Action buttons ──────────────────────────────────────────────────────────

  it('should render notification button with aria-label', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[aria-label="Notifications"]');
    expect(btn).toBeTruthy();
  });

  it('should render help button with aria-label', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[aria-label="Help"]');
    expect(btn).toBeTruthy();
  });

  // ── Accessibility ───────────────────────────────────────────────────────────

  it('should have role=banner on host element', () => {
    fixture.detectChanges();
    // role="banner" is set via host metadata in the component decorator
    const host: HTMLElement = fixture.nativeElement.parentElement;
    expect(
      host?.querySelector('[role="banner"]') ||
      fixture.nativeElement.closest('[role="banner"]')
    ).toBeTruthy();
  });

  it('should have aria-label on the header element', () => {
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header');
    expect(header?.getAttribute('aria-label')).toBeTruthy();
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// jwt-decoder.service.spec.ts  (inline here for convenience — move to own file)
// ═══════════════════════════════════════════════════════════════════════════════

import { TestBed } from '@angular/core/testing';
import { JwtDecoderService } from './jwt-decoder.service';

/** Builds a fake unsigned JWT with the given payload */
function makeJwt(payload: object): string {
  // base64URL-encode the payload (simulate real JWT structure)
  const json = JSON.stringify(payload);
  const base64 = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `eyJhbGciOiJIUzI1NiJ9.${base64}.fake_signature`;
}

describe('JwtDecoderService', () => {
  let service: JwtDecoderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JwtDecoderService);
  });

  it('should be created', () => expect(service).toBeTruthy());

  // ── Name resolution priority ─────────────────────────────────────────────

  it('should use name claim when present', () => {
    const p = service.decode(makeJwt({ name: 'Shreya Agarwal' }));
    expect(p.fullName).toBe('Shreya Agarwal');
    expect(p.initials).toBe('SA');
  });

  it('should compose firstName + lastName when name is absent', () => {
    const p = service.decode(makeJwt({ firstName: 'Shreya', lastName: 'Agarwal' }));
    expect(p.fullName).toBe('Shreya Agarwal');
    expect(p.initials).toBe('SA');
  });

  it('should fall back to preferred_username', () => {
    const p = service.decode(makeJwt({ preferred_username: 'shreya.agarwal' }));
    expect(p.fullName).toBe('shreya.agarwal');
  });

  it('should fall back to email', () => {
    const p = service.decode(makeJwt({ email: 's@bnp.com' }));
    expect(p.fullName).toBe('s@bnp.com');
  });

  it('should return Unknown for empty payload', () => {
    const p = service.decode(makeJwt({}));
    expect(p.fullName).toBe('Unknown');
    expect(p.initials).toBe('?');
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it('should return fallback for empty string token', () => {
    const p = service.decode('');
    expect(p.initials).toBe('?');
  });

  it('should return fallback for malformed token', () => {
    const p = service.decode('not-a-jwt');
    expect(p.initials).toBe('?');
  });

  it('should return fallback for whitespace-only token', () => {
    const p = service.decode('   ');
    expect(p.initials).toBe('?');
  });

  it('should never produce more than 2 initials', () => {
    const p = service.decode(makeJwt({ name: 'Alice Bob Charlie Dave' }));
    expect(p.initials.length).toBeLessThanOrEqual(2);
  });

  it('should handle single-word names', () => {
    const p = service.decode(makeJwt({ name: 'Alice' }));
    expect(p.initials).toBe('A');
  });

  it('should handle extra whitespace in names', () => {
    const p = service.decode(makeJwt({ name: '  John   Doe  ' }));
    expect(p.initials).toBe('JD');
  });
});
