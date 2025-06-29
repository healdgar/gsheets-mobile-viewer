# GSX2JSON - Google Spreadsheet to JSON API service with Mobile Viewer

## About

One useful feature of Google Spreadsheets is the ability to access the data as JSON by using a particular feed URL. However, this is a bit fiddly to do, and the resulting JSON is pretty unreadable, with usable data buried deep inside objects.

This API connects to your spreadsheet and sanitizes the data, providing simple, readable JSON for you to use in your app. **NEW**: Now includes a mobile-friendly web interface for viewing spreadsheet data!

## Features

- 📊 **JSON API**: Clean, readable JSON from Google Sheets
- 📱 **Mobile Viewer**: Optimized mobile interface for viewing spreadsheet data
- 👆 **Touch Controls**: Swipe gestures and touch navigation
- ⌨️ **Keyboard Navigation**: Arrow keys and shortcuts for desktop
- 🔗 **Easy Sharing**: Paste Google Sheets URLs directly
- 🎯 **Cell Focus**: Navigate large spreadsheets cell by cell

## Install

1. Get [Google API key](https://developers.google.com/sheets/api/guides/authorizing#APIKey) and add to api.js (line 1).
2. You must also enable the Google Sheets API and set up a service account.
3. Make sure your Google Sheet is set to be shared to 'anyone with the link'.
4. Run `npm install`.
5. **Build the frontend**: `npm run build`
6. **Start the server**: `npm start` or `node app`

The app will be available at `http://localhost:5005`

## Development Mode

For development with hot reloading:

```bash
# Terminal 1: Start the API server
npm start

# Terminal 2: Start the development server  
npm run dev
```

Visit `http://localhost:3000` for development (proxies API calls to port 5005).

## Web Interface Usage

### 1. Open the Web App
Navigate to `http://localhost:5005` in your browser.

### 2. Enter Sheet Information
- **Google Sheet ID or URL**: Paste the full Google Sheets URL or just the Sheet ID
- **Sheet Name**: Name of the specific sheet tab (default: "Sheet1")
- **API Key**: Your Google API key (optional if set in api.js)

### 3. View Data
- See a preview table of your data
- Click "📱 Open Mobile View" for the mobile interface

### 4. Mobile Navigation
**Desktop:**
- Arrow keys to navigate between cells
- ESC to close mobile viewer

**Mobile/Touch:**
- Swipe left/right for columns
- Swipe up/down for rows
- Tap navigation buttons
- View adjacent cell previews

## API Usage

You can still access the JSON API directly using the `/api` endpoint:

```
http://localhost:5005/api?id=SPREADSHEET_ID&sheet=SHEET_NAME
```

### Parameters

**id (required):** The ID of your document. This is the big long alpha-numeric code in the middle of your document URL.

**sheet (optional):** The name of the individual sheet you want to get data from. Defaults to the first sheet.

**api_key (optional):** The API key set up in your Google developer account. Can be set in api.js instead.

**q (optional):** A simple query string. This is case insensitive and will add any row containing the string in any cell to the filtered result.

**integers (optional - default: true)**: Setting 'integers' to false will return numbers as a string.

**rows (optional - default: true)**: Setting 'rows' to false will return only column data.

**columns (optional - default: true)**: Setting 'columns' to false will return only row data.

## Example Response

There are two sections to the returned data - Columns (containing the names of each column), and Rows (containing each row of data as an object).

```json
{
  "columns": {
    "Name": ["Nick", "Chris", "Barry"],
    "Age": ["21", "27", "67"]
  },
  "rows": [
    {
      "Name": "Nick",
      "Age": "21"
    },
    {
      "Name": "Chris",
      "Age": "27"
    },
    {
      "Name": "Barry",
      "Age": "67"
    }
  ]
}
```

## Project Structure

```
gsx2json/
├── src/                          # React frontend source
│   ├── components/
│   │   └── MobileTableViewer.js  # Mobile table viewer component
│   ├── App.js                    # Main React application
│   ├── index.js                  # React entry point
│   └── index.html                # HTML template
├── dist/                         # Built frontend files (generated)
├── api.js                        # Google Sheets API handler
├── app.js                        # Express server
├── webpack.config.js             # Webpack configuration
└── package.json                  # Dependencies and scripts
```

## Troubleshooting

### Common Issues

**"You must provide a sheet ID"**
- Make sure you're providing a valid Google Sheet ID or URL

**"Failed to fetch data"**
- Check that the sheet is publicly accessible
- Verify your API key if using one
- Make sure the sheet name is correct

**Build errors**
- Run `npm install` to ensure all dependencies are installed
- Try deleting `node_modules` and running `npm install` again

### Making Sheets Public

1. Open your Google Sheet
2. Click "Share" in the top right  
3. Click "Change to anyone with the link"
4. Set permissions to "Viewer"
5. Copy the link
