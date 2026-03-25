App starts
    │
    ▼
app.component.ts
passes [authToken]="token"
    │
    ▼
ui-header.component.ts
receives the token
    │
    ├──────────────────────────────────┐
    │                                  │
    ▼                                  ▼
jwt-decoder.service.ts          header-config.token.ts
reads the JWT token             reads header-config.json
extracts user name                     │
generates initials                     ▼
"Shreya Agarwal" → "SA"        companyName, subtitle, logoPath
    │                                  │
    └──────────────┬───────────────────┘
                   │
                   ▼
        ui-header.component.html
        renders everything on screen
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
[LOGO]    BNP Paribas - CEFS   [SA]




App starts
    │
    ▼
app.component.ts
renders <app-left-menu>
    │
    ▼
left-menu.component.ts
reads nav-config.json
via NAV_CONFIG token
    │
    ▼
ngOnInit()
finds isDefault: true app
sets it as activeApp (no drawer)
    │
    ▼
left-menu.component.html
renders fixed sidebar
with app icons
    │
    ▼
User clicks app icon
    │
    ▼
onAppSelect(app)
    │
    ├── Same app clicked + drawer open?
    │         │
    │         ▼
    │   collapseMenu()
    │   closes drawer
    │
    └── Different app / drawer closed?
              │
              ▼
        activateApp(app)
        sets activeApp signal
        sets showRightPanel = true
        finds defaultItemId
        sets activeItem signal
              │
              ▼
        Drawer slides open
        shows sections + items
              │
              ▼
        User clicks menu item
              │
              ▼
        onItemClick(item)
        sets activeItem signal
        highlights the item
              │
              ▼
        @Output() itemSelected
        emits to parent
              │
              ▼
        app.component.ts
        onNavigate(item)
        router.navigate([item.itemRedirect])





        App starts
    │
    ▼
app.component.ts
renders <app-left-menu>
    │
    ▼
left-menu.component.ts
reads nav-config.json
via NAV_CONFIG token
    │
    ▼
ngOnInit()
finds isDefault: true app
sets it as activeApp (no drawer)
    │
    ▼
left-menu.component.html
renders fixed sidebar
with app icons
    │
    ▼
User clicks app icon
    │
    ▼
onAppSelect(app)
    │
    ├── Same app clicked + drawer open?
    │         │
    │         ▼
    │   collapseMenu()
    │   closes drawer
    │
    └── Different app / drawer closed?
              │
              ▼
        activateApp(app)
        sets activeApp signal
        sets showRightPanel = true
        finds defaultItemId
        sets activeItem signal
              │
              ▼
        Drawer slides open
        shows sections + items
              │
              ▼
        User clicks menu item
              │
              ▼
        onItemClick(item)
        sets activeItem signal
        highlights the item
              │
              ▼
        @Output() itemSelected
        emits to parent
              │
              ▼
        app.component.ts
        onNavigate(item)
        router.navigate([item.itemRedirect])


Signal Flow (How data updates)
── ui-header ──────────────────────────────

authToken input changes
        │
        ▼
computed(userProfile)        ← auto recalculates
        │
        ▼
avatar updates instantly     ← no manual code needed


── left-menu ──────────────────────────────

onAppSelect() called
        │
        ▼
activeApp.set(app)           ← signal updates
        │
        ▼
activeSections computed()    ← auto recalculates
        │
        ▼
drawer renders new sections  ← screen updates
        
