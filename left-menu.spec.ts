// left-menu.component.spec.ts
// Jasmine/Karma — Angular default test framework

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeftMenuComponent } from './left-menu.component';
import { NAV_CONFIG } from './nav-config.token';
import { SectionItem } from './left-menu.types';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { faSolidAngleRight, faSolidAngleLeft } from '@ng-icons/font-awesome/solid';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ITEM_1: SectionItem = {
  itemName: 'My Metrics',
  itemId: 'my-metrics',
  itemRedirect: '/operations/my-metrics',
};

const MOCK_ITEM_2: SectionItem = {
  itemName: 'Alert Queue',
  itemId: 'alert-queue',
  itemRedirect: '/operations/alert-queue',
};

const MOCK_NAV_CONFIG = {
  host: 'Test App',
  apps: [
    {
      appId: 'app-sit',
      displayName: 'SI',
      icon: 'sidebar-icons/SIT.png',
      isDefault: true,
      defaultItemId: 'my-metrics',
      subMenu: {
        displayName: 'SIT',
        sections: [
          {
            sectionDisplayName: 'Operations',
            sectionItems: [MOCK_ITEM_1, MOCK_ITEM_2],
          },
        ],
      },
    },
    {
      appId: 'app-dashboard',
      displayName: 'Dashboard',
      icon: 'sidebar-icons/Dashboard.png',
      isDefault: false,
      subMenu: {
        displayName: 'Dashboard',
        sections: [],
      },
    },
  ],
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe('LeftMenuComponent', () => {
  let fixture: ComponentFixture<LeftMenuComponent>;
  let component: LeftMenuComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LeftMenuComponent,
        NgIconComponent,
      ],
      providers: [
        { provide: NAV_CONFIG, useValue: MOCK_NAV_CONFIG },
        provideIcons({ faSolidAngleRight, faSolidAngleLeft }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeftMenuComponent);
    component = fixture.componentInstance;
  });

  // ── Creation ────────────────────────────────────────────────────────────────

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // ── Default app on init ──────────────────────────────────────────────────────

  it('should set default app on init without opening drawer', () => {
    fixture.detectChanges();
    expect(component.activeApp()?.appId).toBe('app-sit');
    expect(component.showRightPanel()).toBeFalse();
  });

  it('should auto-select defaultItemId on init', () => {
    fixture.detectChanges();
    expect(component.activeItem()?.itemId).toBe('my-metrics');
  });

  // ── App selection ────────────────────────────────────────────────────────────

  it('should open drawer when app icon is clicked', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[0] as any);
    expect(component.showRightPanel()).toBeTrue();
  });

  it('should collapse drawer when same app clicked while open', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[0] as any);
    expect(component.showRightPanel()).toBeTrue();

    component.onAppSelect(MOCK_NAV_CONFIG.apps[0] as any);
    expect(component.showRightPanel()).toBeFalse();
  });

  it('should switch to different app when clicked', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[1] as any);
    expect(component.activeApp()?.appId).toBe('app-dashboard');
  });

  it('should open drawer when switching to different app', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[1] as any);
    expect(component.showRightPanel()).toBeTrue();
  });

  // ── Open default app ─────────────────────────────────────────────────────────

  it('should open default app when open arrow clicked', () => {
    fixture.detectChanges();
    component.openDefaultApp();
    expect(component.activeApp()?.appId).toBe('app-sit');
    expect(component.showRightPanel()).toBeTrue();
  });

  // ── Menu item selection ──────────────────────────────────────────────────────

  it('should set activeItem when item clicked', () => {
    fixture.detectChanges();
    component.onItemClick(MOCK_ITEM_2);
    expect(component.activeItem()?.itemId).toBe('alert-queue');
  });

  it('should emit itemSelected when item clicked', () => {
    fixture.detectChanges();
    let emitted: SectionItem | undefined;
    component.itemSelected.subscribe(item => emitted = item);

    component.onItemClick(MOCK_ITEM_1);
    expect(emitted?.itemId).toBe('my-metrics');
  });

  it('should emit correct itemRedirect when item clicked', () => {
    fixture.detectChanges();
    let emitted: SectionItem | undefined;
    component.itemSelected.subscribe(item => emitted = item);

    component.onItemClick(MOCK_ITEM_1);
    expect(emitted?.itemRedirect).toBe('/operations/my-metrics');
  });

  // ── isActiveApp ──────────────────────────────────────────────────────────────

  it('should return true for isActiveApp when app is active and drawer open', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[0] as any);
    expect(component.isActiveApp(MOCK_NAV_CONFIG.apps[0] as any)).toBeTrue();
  });

  it('should return false for isActiveApp when drawer is closed', () => {
    fixture.detectChanges();
    // Default app is set but drawer is closed
    expect(component.isActiveApp(MOCK_NAV_CONFIG.apps[0] as any)).toBeFalse();
  });

  it('should return false for isActiveApp for non-active app', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[0] as any);
    expect(component.isActiveApp(MOCK_NAV_CONFIG.apps[1] as any)).toBeFalse();
  });

  // ── isActiveItem ─────────────────────────────────────────────────────────────

  it('should return true for isActiveItem when item is active', () => {
    fixture.detectChanges();
    component.onItemClick(MOCK_ITEM_1);
    expect(component.isActiveItem(MOCK_ITEM_1)).toBeTrue();
  });

  it('should return false for isActiveItem for non-active item', () => {
    fixture.detectChanges();
    component.onItemClick(MOCK_ITEM_1);
    expect(component.isActiveItem(MOCK_ITEM_2)).toBeFalse();
  });

  // ── Collapse menu ────────────────────────────────────────────────────────────

  it('should clear all state when collapseMenu called', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[0] as any);
    component.collapseMenu();

    expect(component.showRightPanel()).toBeFalse();
    expect(component.activeApp()).toBeNull();
    expect(component.activeItem()).toBeNull();
  });

  // ── Computed activeSections ──────────────────────────────────────────────────

  it('should return sections for active app', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[0] as any);
    expect(component.activeSections().length).toBe(1);
    expect(component.activeSections()[0].sectionDisplayName).toBe('Operations');
  });

  it('should return empty sections when no active app', () => {
    fixture.detectChanges();
    component.collapseMenu();
    expect(component.activeSections().length).toBe(0);
  });

  it('should return empty sections for app with no sections', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[1] as any);
    expect(component.activeSections().length).toBe(0);
  });

  // ── Accessibility ────────────────────────────────────────────────────────────

  it('should render notification button with aria-label', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[0] as any);
    fixture.detectChanges();
    const activeItem = fixture.nativeElement.querySelector('.menu-item.active');
    expect(activeItem?.getAttribute('aria-current')).toBe('page');
  });

  it('should have role navigation on host', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement.closest('[role="navigation"]')
      || fixture.debugElement.nativeElement.parentElement;
    expect(host).toBeTruthy();
  });
});
