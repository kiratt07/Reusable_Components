What It Looks Like
Closed:                    Open:
┌──────┐                   ┌──────┬──────────────┐
│  🛡️  │                   │  🛡️  │ SIT        < │
│  SI  │                   │  SI  │──────────────│
│      │                   │      │ Operations   │
│  🧳  │                   │  🧳  │   My Metrics │
│      │                   │      │   Alert Queue│
│  📊  │                   │  📊  │──────────────│
│      │                   │      │ Insights     │
│  >   │                   │      │   KPI        │
└──────┘                   └──────┴──────────────┘
Folder Structure
left-menu/
├── public_api.ts              → Front door — always import from here
├── left-menu.types.ts         → Data structure definitions
├── nav-config.token.ts        → Makes config swappable without code changes
├── nav-config.json            → All apps, sections and menu items
├── left-menu.component.ts     → Main component logic
├── left-menu.component.html   → What you see on screen
├── left-menu.component.spec.ts→ Tests
├── icons/                     → App icon images
│   ├── SIT.png
│   ├── ClearAlert.png
│   ├── Dashboard.png
│   └── Audit.png
└── style/
    ├── _variables.scss        → All sizes, colours, fonts in one place
    └── left-menu.component.scss → How everything looks
How To Use It
Step 1 — Import the component:
import { LeftMenuComponent } from './Components/left-menu/left-menu.component';
import { SectionItem } from './Components/left-menu/left-menu.types';

@Component({
  imports: [LeftMenuComponent],
  template: `<app-left-menu (itemSelected)="onNavigate($event)" />`
})
export class AppComponent {
  onNavigate(item: SectionItem): void {
    console.log('Navigate to:', item.itemRedirect);
    // Add your routing here
  }
}
Step 2 — Add to your template:
<app-left-menu (itemSelected)="onNavigate($event)" />
That's it! 🎉
How Navigation Works
User clicks "My Metrics"
        │
        ▼
Component sets it as active (highlights it)
        │
        ▼
Emits (itemSelected) event to parent
        │
        ▼
Parent decides where to navigate
The component tells you what was clicked — you decide what to do with it!
How To Add/Change Apps
Open nav-config.json:
{
  "apps": [
    {
      "appId": "cefs-ui-si",
      "displayName": "SI",
      "icon": "sidebar-icons/SIT.png",
      "isDefault": true,
      "defaultItemId": "my-metrics",
      "subMenu": {
        "displayName": "SIT",
        "sections": [
          {
            "sectionDisplayName": "Operations",
            "sectionItems": [
              {
                "itemName": "My Metrics",
                "itemId": "my-metrics",
                "itemRedirect": "/operations/my-metrics"
              }
            ]
          }
        ]
      }
    }
  ]
}
To add a new app — add a new object inside apps array.
To add a new menu item — add inside sectionItems array.
No code changes needed — just update the JSON! ✅
How To Change Colors / Sizes
Open style/_variables.scss:
$c-primary            : #025C39;  // ← brand green colour
$sidebar-width-closed : 54px;     // ← icon column width
$drawer-width-open    : 208px;    // ← drawer width when open
$menu-item-height     : 42px;     // ← height of each menu item
One change here updates the entire component automatically! ✅
Files Explained Simply
File
What it does
public_api.ts
The front door — controls what others can use
left-menu.types.ts
Defines the shape of data (like a form template)
nav-config.token.ts
Makes the config pluggable — any team can swap it
nav-config.json
All the navigation data — apps, sections, items
left-menu.component.ts
The brain — handles clicks and state
left-menu.component.html
The face — what you see on screen
_variables.scss
All design values in one place
left-menu.component.scss
How everything looks
Component Behaviour
Action
What Happens
Click app icon
Opens drawer for that app
Click same icon again
Closes the drawer
Click different app icon
Switches to that app's menu
Click < button
Closes the drawer
Click > button
Opens the default app
Click menu item
Highlights it + tells parent
Page loads
Auto-opens default app silently
Running Tests
ng test
Common Questions
Q: Can I add more apps?
A: Yes! Just add a new entry in nav-config.json — no code changes needed.
Q: How does routing work?
A: The component emits (itemSelected) with the clicked item. You handle routing in the parent using item.itemRedirect.
Q: Can I use this in a different app?
A: Yes! Copy the folder, update nav-config.json with your navigation structure, and use <app-left-menu (itemSelected)="onNavigate($event)" />.
Q: What is isDefault: true for?
A: It tells the component which app to highlight automatically when the page first loads.
