// ui-header.component.spec.ts
// Jasmine/Karma — Angular default test framework

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiHeaderComponent } from './ui-header.component';
import { JwtDecoderService } from './jwt-decoder.service';
import { HEADER_CONFIG } from './header-config.token';
import { UserProfile } from './header.types';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CONFIG = {
  companyName: 'BNP Paribas',
  companySubtitle: 'Client Engagement & Financial Security',
  logoPath: 'header-icons/header-logo.png',
};

const MOCK_PROFILE: UserProfile = {
  fullName: 'Shreya Agarwal',
  initials: 'SA'
};

const FALLBACK_PROFILE: UserProfile = {
  fullName: 'Unknown',
  initials: '?'
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe('UiHeaderComponent', () => {
  let fixture: ComponentFixture<UiHeaderComponent>;
  let component: UiHeaderComponent;
  let decoderSpy: jasmine.SpyObj<JwtDecoderService>;

  beforeEach(async () => {
    decoderSpy = jasmine.createSpyObj('JwtDecoderService', ['decode']);
    decoderSpy.decode.and.returnValue(MOCK_PROFILE);

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

  // ── Branding ─────────────────────────────────────────────────────────────────

  it('should render company name from config', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.company-title')?.textContent)
      .toContain('BNP Paribas');
  });

  it('should render company subtitle from config', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.company-title')?.textContent)
      .toContain('Client Engagement & Financial Security');
  });

  it('should render logo with correct src from config', () => {
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('.company-logo-img');
    expect(img?.getAttribute('src')).toBe('header-icons/header-logo.png');
  });

  it('should render logo with alt text', () => {
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('.company-logo-img');
    expect(img?.getAttribute('alt')).toBeTruthy();
  });

  // ── Avatar / User profile ────────────────────────────────────────────────────

  it('should display decoded initials in avatar', () => {
    fixture.componentRef.setInput('authToken', 'valid.jwt.token');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('SA');
  });

  it('should show fallback initials when no token provided', () => {
    decoderSpy.decode.and.returnValue(FALLBACK_PROFILE);
    fixture.componentRef.setInput('authToken', '');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('?');
  });

  it('should update avatar when authToken input changes', () => {
    fixture.componentRef.setInput('authToken', 'first.token');
    fixture.detectChanges();
    expect(decoderSpy.decode).toHaveBeenCalledWith('first.token');

    decoderSpy.decode.and.returnValue({ fullName: 'John Doe', initials: 'JD' });
    fixture.componentRef.setInput('authToken', 'second.token');
    fixture.detectChanges();

    expect(decoderSpy.decode).toHaveBeenCalledWith('second.token');
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('JD');
  });

  it('should set aria-label on avatar with full name', () => {
    fixture.componentRef.setInput('authToken', 'valid.jwt.token');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.getAttribute('aria-label')).toContain('Shreya Agarwal');
  });

  it('should set title on avatar with full name', () => {
    fixture.componentRef.setInput('authToken', 'valid.jwt.token');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.getAttribute('title')).toBe('Shreya Agarwal');
  });

  // ── Action buttons ───────────────────────────────────────────────────────────

  it('should render notification button', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[aria-label="Notifications"]');
    expect(btn).toBeTruthy();
  });

  it('should render help button', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[aria-label="Help"]');
    expect(btn).toBeTruthy();
  });

  it('should render notification button as type button', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[aria-label="Notifications"]');
    expect(btn?.getAttribute('type')).toBe('button');
  });

  it('should render help button as type button', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[aria-label="Help"]');
    expect(btn?.getAttribute('type')).toBe('button');
  });

  // ── Accessibility ────────────────────────────────────────────────────────────

  it('should have aria-label on header element', () => {
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header');
    expect(header?.getAttribute('aria-label')).toBeTruthy();
  });

  it('should have role img on avatar', () => {
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.getAttribute('role')).toBe('img');
  });

  // ── JwtDecoderService integration ────────────────────────────────────────────

  it('should call jwt decoder with the provided token', () => {
    fixture.componentRef.setInput('authToken', 'test.jwt.token');
    fixture.detectChanges();
    expect(decoderSpy.decode).toHaveBeenCalledWith('test.jwt.token');
  });

  it('should call jwt decoder with empty string when no token', () => {
    fixture.componentRef.setInput('authToken', '');
    fixture.detectChanges();
    expect(decoderSpy.decode).toHaveBeenCalledWith('');
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// JwtDecoderService tests
// ═══════════════════════════════════════════════════════════════════════════════

import { TestBed } from '@angular/core/testing';
import { JwtDecoderService } from './jwt-decoder.service';

/** Builds a fake JWT with base64url encoded payload */
function makeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload))
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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── Name resolution priority ──────────────────────────────────────────────

  it('should use name claim when present', () => {
    const p = service.decode(makeJwt({ name: 'Shreya Agarwal' }));
    expect(p.fullName).toBe('Shreya Agarwal');
    expect(p.initials).toBe('SA');
  });

  it('should compose firstName + lastName when name absent', () => {
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

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('should return fallback for empty string token', () => {
    const p = service.decode('');
    expect(p.initials).toBe('?');
    expect(p.fullName).toBe('Unknown');
  });

  it('should return fallback for whitespace token', () => {
    const p = service.decode('   ');
    expect(p.initials).toBe('?');
  });

  it('should return fallback for malformed token', () => {
    const p = service.decode('not-a-jwt');
    expect(p.initials).toBe('?');
  });

  it('should never produce more than 2 initials', () => {
    const p = service.decode(makeJwt({ name: 'Alice Bob Charlie Dave' }));
    expect(p.initials.length).toBeLessThanOrEqual(2);
  });

  it('should handle single word name', () => {
    const p = service.decode(makeJwt({ name: 'Alice' }));
    expect(p.initials).toBe('A');
  });

  it('should handle extra whitespace in name', () => {
    const p = service.decode(makeJwt({ name: '  John   Doe  ' }));
    expect(p.initials).toBe('JD');
  });

  it('should produce uppercase initials', () => {
    const p = service.decode(makeJwt({ name: 'john doe' }));
    expect(p.initials).toBe('JD');
  });
});
