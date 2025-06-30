# GSX2JSON - Google Sheets **Mobile Viewer**

## Why you'll love it

Send anyone a Google Sheet ID (or full URL) and this project spins up a gorgeous, touch-friendly **mobile viewer**:

* 📱   Full-screen, swipeable cell-by-cell explorer
* 👆   Smart gesture navigation (swipe ← / → only, scroll ↑ / ↓)
* 📝   Full markdown support with line breaks from Google Sheets
* 🔍   Instant filter + row-identifier selection before launch
* 🕶️   Solid background optimized for readability
* 💾  Remembers your last five sheets for 1-click access
* 🔐  Works with public or private sheets (API-key/OAuth ready)

> The original GSX2JSON service that returns JSON is still here — now it powers the viewer under the hood.  If you only need raw JSON jump to **"Programmatic API"** below.

---

## Quick Start (Mobile Viewer)

1. `npm install`
2. Add your Google Sheets API key to **.env**
   ```bash
   echo "GSHEETS_API_KEY=YOUR_KEY" > .env
   ```
3. `npm run build && npm start`
4. Open **http://localhost:5005**
5. Paste any Sheet URL or ID → Pick a sheet tab → *(optional)* set filter / row-identifier → **Open Mobile View**

---

## Screenshots

| Load screen | Configuration | 
|-------------|---------------|
| ![loading](/loading.png) | ![viewer](viewer.png) |

---

## Features in depth

### Mobile Viewer
* **Enhanced Content Rendering**: Full markdown support with `markdown-it` library
* **Smart Line Breaks**: Preserves line breaks and `<br>` tags from Google Sheets
* **Optimized Navigation**: Left-right swipe for column/row navigation, vertical scroll for long content
* **Left-Aligned Display**: Content is left-justified for better readability
* **Opaque Background**: Solid background for improved text contrast and readability
* **Responsive Design**: Flexible font sizing with `clamp()` so even huge cells fit
* **Mobile-First**: Safe-area aware on iOS Safari with optimized touch controls

### Recent-sheet history
* Cookie-based list (max 5) with titles fetched from Spreadsheet metadata
* One-click load / ✕ remove

### Configuration step
* Choose **Row Identifier** column (used in contextual breadcrumbs)
* Free-text **Filter** to show only matching rows

---

## Advanced: Programmatic JSON API

The Express backend exposes the simplified GSX2JSON endpoint:

```http
GET /sheets-viewer/api?id=<SHEET_ID>&sheet=<SHEET_NAME>&api_key=<YOUR_KEY>
```

(For backward-compatibility `/api` continues to work.)

Returns:
```json
{
  "title": "My Sheet",
  "columns": { ... },
  "rows": [ ... ]
}
```
Full parameter list & examples are in **docs/API.md**.

---

## 🖥️ Desktop Server for Mobile Access

Deploy as a **headless desktop server** that provides mobile network access:

```bash
npm run desktop        # Run headless server with system tray
npm run dist          # Build distributable packages
```

**Perfect for:**
* 📱 **Mobile Network Access** - Access from any device on your home/office network
* 🏠 **Home/Small Office** - Share spreadsheet viewing across devices
* 🔐 **Private Sheets** - OAuth 2.0 support with secure local token storage
* 💻 **System Tray Integration** - Easy control and URL copying
* 🌐 **Local Network IP** - Automatically shows shareable network address

**How it works:**
1. Run `npm run desktop` on your computer
2. App shows your network URL (e.g., `http://192.168.1.100:5005`)
3. Visit that URL from your phone/tablet on the same network
4. Enjoy the full mobile viewer experience!

+### 🔐 Google OAuth quick-start
+
+1. In Google Cloud Console → APIs & Services → **OAuth consent screen**, keep the app in **Testing** mode.
+2. Under **Test users** click **Add users** → enter the Gmail account(s) you'll sign in with.
+3. Enable the **Google Sheets API** for your project.
+4. Create **OAuth 2.0 Credentials → Web application**.
+5. Add this redirect URI:
+
+   ```
+   http://localhost:3005/oauth/callback
+   ```
+
+6. Copy the **Client ID** and **Client Secret** into the viewer's **Configure OAuth** panel.
+
+That's it – click **Connect to Google** and the viewer will open the OAuth window.  Tokens are stored securely and refreshed automatically, so you only need to sign in once.
+
**📖 Full Setup:** See [`DESKTOP_DEPLOYMENT.md`](DESKTOP_DEPLOYMENT.md) for OAuth configuration and distribution instructions.

## Roadmap
* ✅ OAuth flow for private sheets (token instead of API key) - **COMPLETED!**
* Dark-mode automatic theme
* Offline cache / PWA wrapper

---

## License
MIT © 2025 Alex J. Wall — includes portions of the original gsx2json by **Nick Moreton**
