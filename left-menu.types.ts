// left-menu.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All shared types for the left-menu component.
// Centralised here so they can be imported by component, service, and tests.
// ─────────────────────────────────────────────────────────────────────────────

/** A single clickable item inside a section */
export interface SectionItem {
  itemName: string;
  itemId: string;
  itemRedirect: string;
}

/** A group of items with a section heading e.g. "Operations", "Insights" */
export interface Section {
  sectionDisplayName: string;
  sectionItems: SectionItem[];
}

/** The sliding drawer menu for one app */
export interface SubMenu {
  displayName: string;
  sections: Section[];
}

/** One app entry in the icon sidebar */
export interface App {
  appId: string;
  displayName: string;
  icon: string;
  isDefault?: boolean;
  /** itemId of the item to auto-select when this app opens */
  defaultItemId?: string;
  subMenu: SubMenu;
}

/** Root config shape matching nav-config.json */
export interface NavConfig {
  host: string;
  apps: App[];
}
