# ui-header

Pixel-perfect Angular 19 standalone header component for the CEFS application.

## Figma Specs Implemented

| Element | Figma Value |
|---------|------------|
| Header height | 50px |
| Header width | 1600px (fluid 100%) |
| Logo size | 46 × 46px |
| Left padding | 16px |
| Text block height | 29px (Y: 8.5 — vertically centred) |
| Bell / Help icons | 32 × 32px tap target |
| Avatar circle | 32 × 32px white |
| Avatar margins | top: 10px, bottom: 8px, right: 25px |
| Right section gap | 16px |

---

## Usage

```html
<!-- In any parent template -->
<ui-header [authToken]="myJwtToken" />
```

```typescript
// In parent component
import { UiHeaderComponent } from '@cefs/ui-header';

@Component({
  imports: [UiHeaderComponent],
  template: `<ui-header [authToken]="token()" />`
})
export class AppComponent {
  token = signal('');
}
```

---

## Override Branding (Optional)

By default the component reads from `header-config.json`. To override at runtime:

```typescript
// app.config.ts
import { HEADER_CONFIG } from '@cefs/ui-header';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: HEADER_CONFIG,
      useValue: {
        companyName: 'My Bank',
        companySubtitle: 'Digital Division',
        logoPath: 'assets/my-logo.png'
      }
    }
  ]
};
```

---

## CSS Theming (Override colours without rebuild)

```css
/* In host application global styles */
ui-header {
  --ui-header-bg-start: #005a8e;      /* Override gradient start */
  --ui-header-bg-end:   #0070b0;      /* Override gradient end */
  --ui-header-avatar-bg:   #fff;
  --ui-header-avatar-text: #003366;
}
```

---

## File Structure

```
ui-header/
├── index.ts                      ← Public API (import from here only)
├── header.types.ts               ← Shared interfaces
├── header-config.token.ts        ← InjectionToken for branding config
├── header-config.json            ← Default config values
├── jwt-decoder.service.ts        ← JWT → UserProfile (isolated, testable)
├── _variables.scss               ← Design tokens (all Figma values)
├── ui-header.component.ts        ← Component logic (Angular 19 signals)
├── ui-header.component.html      ← Template (pixel-matched to Figma)
├── ui-header.component.scss      ← Styles (pixel-matched to Figma)
└── ui-header.component.spec.ts   ← Unit tests (component + service)
```

---

## Auth Token

Pass any valid JWT. The component automatically extracts the user's name using this priority:

1. `name` claim
2. `firstName` + `lastName`
3. `preferred_username` (Keycloak)
4. `email`
5. Falls back to `?` avatar — never crashes

The token is re-decoded reactively whenever the input changes (e.g. silent refresh).
