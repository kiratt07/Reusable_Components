// ui-header.component.spec.ts
// Jasmine/Karma — Angular default test framework
// All imports at the top — no duplicate imports

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

// ── UiHeaderComponent tests ───────────────────────────────────────────────────

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
    expect(fixture.nativeElement.querySelector('.company-title')?.textContent)
      .toContain('BNP Paribas');
  });

  it('should render company subtitle from config', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.company-title')?.textContent)
      .toContain('Client Engagement & Financial Security');
  });

  it('should render logo with correct src', () => {
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('.company-logo-img');
    expect(img?.getAttribute('src')).toBe('header-icons/header-logo.png');
  });

  it('should render logo with alt text', () => {
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('.company-logo-img');
    expect(img?.getAttribute('alt')).toBeTruthy();
  });

  // ── Avatar ───────────────────────────────────────────────────────────────────

  it('should display decoded initials in avatar', () => {
    fixture.componentRef.setInput('authToken', 'valid.jwt.token');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('SA');
  });

  it('should show fallback initials when no token', () => {
    decoderSpy.decode.and.returnValue(FALLBACK_PROFILE);
    fixture.componentRef.setInput('authToken', '');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('?');
  });

  it('should update avatar when token changes', () => {
    fixture.componentRef.setInput('authToken', 'first.token');
    fixture.detectChanges();

    decoderSpy.decode.and.returnValue({ fullName: 'John Doe', initials: 'JD' });
    fixture.componentRef.setInput('authToken', 'second.token');
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('JD');
  });

  it('should set aria-label on avatar', () => {
    fixture.componentRef.setInput('authToken', 'valid.jwt.token');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.getAttribute('aria-label')).toContain('Shreya Agarwal');
  });

  it('should set title on avatar', () => {
    fixture.componentRef.setInput('authToken', 'valid.jwt.token');
    fixture.detectChanges();
    const avatar = fixture.nativeElement.querySelector('.user-avatar');
    expect(avatar?.getAttribute('title')).toBe('Shreya Agarwal');
  });

  // ── Buttons ──────────────────────────────────────────────────────────────────

  it('should render notification button', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Notifications"]')).toBeTruthy();
  });

  it('should render help button', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Help"]')).toBeTruthy();
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

  // ── JWT Decoder calls ────────────────────────────────────────────────────────

  it('should call jwt decoder with provided token', () => {
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

// ── JwtDecoderService tests ───────────────────────────────────────────────────

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

  it('should use name claim when present', () => {
    const p = service.decode(makeJwt({ name: 'Shreya Agarwal' }));
    expect(p.fullName).toBe('Shreya Agarwal');
    expect(p.initials).toBe('SA');
  });

  it('should compose firstName + lastName when name absent', () => {
    const p = service.decode(makeJwt({ firstName: 'Shreya', lastName: 'Agarwal' }));
    expect(p.fullName).toBe('Shreya Agarwal');
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
