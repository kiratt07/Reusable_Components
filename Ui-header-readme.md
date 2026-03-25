What It Looks Like
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]  BNP Paribas - Client Engagement & Financial Security  🔔  ?  [SA] │
└─────────────────────────────────────────────────────────────┘
Folder Structure
ui-header/
├── public_api.ts              → Front door — always import from here
├── header.types.ts            → Data structure definitions
├── header-config.token.ts     → Makes config swappable without code changes
├── header-config.json         → Default branding (logo, company name)
├── jwt-decoder.service.ts     → Reads JWT token and gets user name
├── ui-header.component.ts     → Main component logic
├── ui-header.component.html   → What you see on screen
├── ui-header.component.spec.ts→ Tests
├── icons/                     → Image files
└── style/
    ├── _variables.scss        → All sizes, colours, fonts in one place
    └── ui-header.component.scss → How everything looks
How To Use It
Step 1 — Import the component:
import { UiHeaderComponent } from './Components/ui-header/ui-header.component';

@Component({
  imports: [UiHeaderComponent],
  template: `<ui-header [authToken]="token" />`
})
export class AppComponent {
  token = ''; // pass your JWT token here
}
Step 2 — Add to your template:
<ui-header [authToken]="yourJwtToken" />
That's it! 🎉
How The Avatar Works
You pass a JWT token → component reads it → shows user initials:
JWT Token → "name: Shreya Agarwal" → Shows "SA" in avatar
JWT Token → "name: John Doe"       → Shows "JD" in avatar
No token  →                        → Shows "?"  in avatar
The component tries these in order to find the name:
name field in token
firstName + lastName fields
preferred_username field
email field
Shows ? if nothing found
How To Change The Branding
Open header-config.json and update:
{
  "companyName": "BNP Paribas",
  "companySubtitle": "Client Engagement & Financial Security",
  "logoPath": "header-icons/header-logo.png"
}
No code changes needed — just update the JSON! ✅
How To Change Colors / Sizes
Open style/_variables.scss:
$c-primary    : #00915A;   // ← change header background colour
$header-height: 50px;      // ← change header height
$avatar-size  : 32px;      // ← change avatar size
One change here updates the entire component automatically! ✅
Files Explained Simply
File
What it does
public_api.ts
The front door — controls what others can use
header.types.ts
Defines the shape of data (like a form template)
header-config.token.ts
Makes the config pluggable — any team can swap it
header-config.json
The actual branding data
jwt-decoder.service.ts
Reads the login token and finds the user's name
ui-header.component.ts
The brain — connects everything together
ui-header.component.html
The face — what you see on screen
_variables.scss
All design values in one place
ui-header.component.scss
How everything looks
Running Tests
ng test
Common Questions
Q: Where does the JWT token come from?
A: Your auth system (Keycloak, Azure AD etc.) provides it after login. Pass it to the component via [authToken].
Q: Can I use this in a different app?
A: Yes! Just copy the folder, update header-config.json with your branding, and use <ui-header [authToken]="token" />.
Q: What if I don't have a token yet?
A: Pass an empty string token = '' — the avatar will show ? until a real token is provided.
