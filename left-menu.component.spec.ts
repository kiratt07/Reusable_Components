// left-menu.component.spec.ts
// Jasmine/Karma — Angular default test framework

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeftMenuComponent } from './left-menu.component';
import { NAV_CONFIG } from './nav-config.token';
import { SectionItem } from './left-menu.types';
import { NgIconsModule } from '@ng-icons/core';

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
      displayName: 'SIT',
      icon: 'icons/SIT.png',
      isDefault: true,
      defaultItemId: 'my-metrics',
      subMenu: {
        displayName: 'Smart Investigation',
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
      icon: 'icons/Dashboard.png',
      isDefault: false,
      subMenu: {
        displayName: 'Dashboard Menu',
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
      imports: [LeftMenuComponent, NgIconsModule.withIcons({})],
      providers: [
        { provide: NAV_CONFIG, useValue: MOCK_NAV_CONFIG },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeftMenuComponent);
    component = fixture.componentInstance;
  });

  // ── Creation ────────────────────────────────────────────────────────────────

  it('should create', () => {
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

  it('should switch active app when different app clicked', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[1] as any);
    expect(component.activeApp()?.appId).toBe('app-dashboard');
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

  // ── isActiveApp / isActiveItem ───────────────────────────────────────────────

  it('should return true for isActiveApp when app is active and drawer is open', () => {
    fixture.detectChanges();
    component.onAppSelect(MOCK_NAV_CONFIG.apps[0] as any);
    expect(component.isActiveApp(MOCK_NAV_CONFIG.apps[0] as any)).toBeTrue();
  });

  it('should return false for isActiveApp when drawer is closed', () => {
    fixture.detectChanges();
    expect(component.isActiveApp(MOCK_NAV_CONFIG.apps[0] as any)).toBeFalse();
  });

  it('should return true for isActiveItem when item is active', () => {
    fixture.detectChanges();
    component.onItemClick(MOCK_ITEM_1);
    expect(component.isActiveItem(MOCK_ITEM_1)).toBeTrue();
  });

  // ── Collapse menu ────────────────────────────────────────────────────────────

  it('should clear all state when collapseMenu is called', () => {
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
});
