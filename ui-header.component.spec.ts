// ui-header.component.spec.ts
// Jasmine/Karma — Angular default test framework
// NOTE: jest.fn() replaced with jasmine.createSpyObj()

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiHeaderComponent } from './ui-header.component';
import { JwtDecoderService } from './jwt-decoder.service';
import { HEADER_CONFIG } from './header-config.token';
import { UserProfile } from './header.types';

const MOCK_CONFIG = {
  companyName: 'Test Corp',
  companySubtitle: 'Testing Division',
  logoPath: 'assets/test-logo.png',
};

const MOCK_PROFILE: UserProfile = { fullName: 'Shreya Agarwal', initials: 'SA' };
const FALLBACK_PROFILE: UserProfile = { fullName: 'Unknown', initials: '?' };

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

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render company name', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.company-title')?.textContent).toContain('Test Corp');
  });

  it('should render subtitle', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.company-title')?.textContent).toContain('Testing Division');
  });

  it('should render logo src', () => {
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('.company-logo-img');
    expect(img?.getAttribute('src')).toBe('assets/test-logo.png');
  });

  it('should display initials in avatar', () => {
    fixture.componentRef.setInput('authToken', 'valid.jwt.token');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.user-avatar')?.textContent?.trim()).toBe('SA');
  });

  it('should show fallback initials when no token', () => {
    decoderSpy.decode.and.returnValue(FALLBACK_PROFILE);
    fixture.componentRef.setInput('authToken', '');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.user-avatar')?.textContent?.trim()).toBe('?');
  });

  it('should update avatar when token changes', () => {
    fixture.componentRef.setInput('authToken', 'first.token');
    fixture.detectChanges();

    decoderSpy.decode.and.returnValue({ fullName: 'Jane Doe', initials: 'JD' });
    fixture.componentRef.setInput('authToken', 'second.token');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.user-avatar')?.textContent?.trim()).toBe('JD');
  });

  it('should render notification button', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Notifications"]')).toBeTruthy();
  });

  it('should render help button', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Help"]')).toBeTruthy();
  });
});


// ── JwtDecoderService tests (move to jwt-decoder.service.spec.ts) ─────────────

import { TestBed } from '@angular/core/testing';

function makeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `eyJhbGciOiJIUzI1NiJ9.${base64}.fake_signature`;
}

describe('JwtDecoderService', () => {
  let service: JwtDecoderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JwtDecoderService);
  });

  it('should be created', () => expect(service).toBeTruthy());

  it('should decode name claim', () => {
    const p = service.decode(makeJwt({ name: 'Shreya Agarwal' }));
    expect(p.fullName).toBe('Shreya Agarwal');
    expect(p.initials).toBe('SA');
  });

  it('should compose firstName + lastName', () => {
    const p = service.decode(makeJwt({ firstName: 'Shreya', lastName: 'Agarwal' }));
    expect(p.fullName).toBe('Shreya Agarwal');
  });

  it('should fall back to preferred_username', () => {
    const p = service.decode(makeJwt({ preferred_username: 'shreya' }));
    expect(p.fullName).toBe('shreya');
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

  it('should return fallback for empty token', () => {
    expect(service.decode('').initials).toBe('?');
  });

  it('should return fallback for malformed token', () => {
    expect(service.decode('bad-token').initials).toBe('?');
  });

  it('should never produce more than 2 initials', () => {
    const p = service.decode(makeJwt({ name: 'Alice Bob Charlie' }));
    expect(p.initials.length).toBeLessThanOrEqual(2);
  });
});
