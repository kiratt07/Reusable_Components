// left-menu.component.ts
// ─────────────────────────────────────────────────────────────────────────────
// Standalone Angular 19 left-menu / sidebar component.
//
// Responsibilities:
//   • Render fixed icon sidebar from NavConfig (one button per app)
//   • Render sliding drawer with sections + menu items for active app
//   • Track active app, active item, drawer open/close state
//   • Emit itemSelected event to parent — component does NOT navigate itself
//
// What this component does NOT do:
//   • Navigate / route — that's the parent's job via (itemSelected)
//   • Fetch config — injected via NAV_CONFIG token
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';

import { NAV_CONFIG } from './nav-config.token';
import type { App, SectionItem, NavConfig } from './left-menu.types';

@Component({
  selector: 'app-left-menu',
  standalone: true,
  imports: [CommonModule, NgIconsModule],
  templateUrl: './left-menu.component.html',
  styleUrl: './left-menu.component.scss',
  host: {
    // Semantic landmark for screen readers — WCAG 2.1 AA
    role: 'navigation',
    'aria-label': 'Application sidebar',
  },
})
export class LeftMenuComponent implements OnInit {

  // ─── Injected config ──────────────────────────────────────────────────────
  readonly config: NavConfig = inject(NAV_CONFIG);

  // ─── Output event ─────────────────────────────────────────────────────────
  /**
   * Emitted when the user clicks a menu item.
   * Parent is responsible for routing — this component only tells what was clicked.
   *
   * Usage: <app-left-menu (itemSelected)="onNavigate($event)" />
   */
  @Output() itemSelected = new EventEmitter<SectionItem>();

  // ─── Reactive state (Angular 19 signals) ──────────────────────────────────
  /** Currently active app — null means drawer is closed */
  readonly activeApp = signal<App | null>(null);

  /** Whether the sliding drawer is open */
  readonly showRightPanel = signal(false);

  /** Currently highlighted menu item */
  readonly activeItem = signal<SectionItem | null>(null);

  // ─── Computed derived state ───────────────────────────────────────────────
  /** Sections to render in the drawer — derived from activeApp signal */
  readonly activeSections = computed(() =>
    this.activeApp()?.subMenu?.sections ?? []
  );

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Auto-open the default app on load if one is marked isDefault: true
    const defaultApp = this.findDefaultApp();
    if (defaultApp) {
      this.activateApp(defaultApp, false); // false = don't open drawer on init
    }
  }

  // ─── Template event handlers ──────────────────────────────────────────────

  /** Called when user clicks an app icon in the fixed sidebar */
  onAppSelect(app: App): void {
    const isSameApp = this.activeApp()?.appId === app.appId;
    const isDrawerOpen = this.showRightPanel();

    // Clicking the same app while drawer is open → collapse
    if (isSameApp && isDrawerOpen) {
      this.collapseMenu();
      return;
    }

    // Open new app or re-open same app after collapse
    this.activateApp(app, true);
  }

  /** Called when user clicks the open arrow (>) when drawer is closed */
  openDefaultApp(): void {
    const defaultApp = this.findDefaultApp() ?? this.config.apps[0];
    if (defaultApp) {
      this.activateApp(defaultApp, true);
    }
  }

  /** Called when user clicks the close arrow (<) inside the drawer */
  collapseMenu(): void {
    this.showRightPanel.set(false);
    this.activeApp.set(null);
    this.activeItem.set(null);
  }

  /** Called when user clicks a menu item */
  onItemClick(item: SectionItem): void {
    this.activeItem.set(item);
    // Emit to parent — parent handles routing
    this.itemSelected.emit(item);
  }

  // ─── Template helper methods ──────────────────────────────────────────────

  /** Returns true if the given app is currently active and drawer is open */
  isActiveApp(app: App): boolean {
    return this.activeApp()?.appId === app.appId && this.showRightPanel();
  }

  /** Returns true if the given item is currently selected */
  isActiveItem(item: SectionItem): boolean {
    return this.activeItem()?.itemId === item.itemId;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Core method that sets the active app and optionally opens the drawer.
   * Extracted to avoid the duplicate logic that existed in ngOnInit
   * and openDefaultApp() in the original code.
   *
   * @param app       The app to activate
   * @param openDrawer  Whether to open the sliding drawer
   */
  private activateApp(app: App, openDrawer: boolean): void {
    this.activeApp.set(app);
    this.showRightPanel.set(openDrawer);

    // Auto-select the default item if specified in config
    if (app.defaultItemId) {
      const defaultItem = this.findItemById(app, app.defaultItemId);
      this.activeItem.set(defaultItem ?? null);
    } else {
      this.activeItem.set(null);
    }
  }

  /**
   * Finds the app marked isDefault: true in the config.
   * Returns undefined if no default is configured.
   */
  private findDefaultApp(): App | undefined {
    return this.config.apps.find(app => app.isDefault);
  }

  /**
   * Searches all sections of an app for an item matching the given itemId.
   * O(n) linear search — acceptable for typical nav config sizes (<50 items).
   *
   * @param app     The app whose sections to search
   * @param itemId  The itemId to find
   */
  private findItemById(app: App, itemId: string): SectionItem | undefined {
    for (const section of app.subMenu?.sections ?? []) {
      const found = section.sectionItems.find(item => item.itemId === itemId);
      if (found) return found;
    }
    return undefined;
  }
}
