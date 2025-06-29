# Quick Start Guide

## Get Running in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Frontend
```bash
npm run build
```

### 3. Start the Server
```bash
npm start
```

**That's it!** Open `http://localhost:5005` in your browser.

## Try it with a Sample Sheet

Use this sample Google Sheet ID to test:
```
1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

Or paste this URL:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
```

## For Your Own Sheets

1. Make your Google Sheet **public** (Share → Anyone with the link → Viewer)
2. Copy the Sheet ID from the URL
3. Paste it into the web interface

## Optional: Add Your Google API Key

For better performance and private sheets:

1. Get a [Google Sheets API key](https://developers.google.com/sheets/api/guides/authorizing#APIKey)
2. Edit `api.js` line 1:
   ```javascript
   var gauthkey = 'YOUR_API_KEY_HERE';
   ```

## Development Mode

```bash
# Terminal 1
npm start

# Terminal 2  
npm run dev
```

Visit `http://localhost:3000` for hot reloading during development. 