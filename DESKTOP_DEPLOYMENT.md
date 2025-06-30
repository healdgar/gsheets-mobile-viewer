# Desktop App Deployment with OAuth

This guide explains how to deploy the Google Sheets Mobile Viewer as a desktop application with OAuth support for accessing private Google Sheets.

## 🖥️ Desktop App Features

- **Standalone Desktop Application**: No browser required, runs as a native app
- **OAuth 2.0 Authentication**: Access private Google Sheets securely
- **Secure Token Storage**: Credentials stored using Electron's secure storage
- **Auto-refresh Tokens**: Long-term access without re-authentication
- **Cross-platform**: Works on Windows, macOS, and Linux

## 📋 Prerequisites

1. **Node.js & npm** (already installed)
2. **Google Cloud Console Account** (for OAuth setup)
3. **Google Sheets API enabled** in your Google Cloud project

## 🔧 Setup Instructions

### Step 1: Install Desktop Dependencies

```bash
npm install
```

This will install all the new desktop dependencies including:
- `electron` - Desktop app framework
- `electron-builder` - App packaging and distribution
- `googleapis` - Google APIs client library
- `electron-store` - Secure credential storage

### Step 2: Google Cloud Console Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com)**

2. **Create a new project** (or select existing):
   - Click "New Project"
   - Enter a project name (e.g., "Sheets Mobile Viewer")
   - Click "Create"

3. **Enable the Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - Choose "External" user type
     - Fill in required fields (App name, User support email, Developer email)
     - Add your email to test users
   - For Application type, select **"Desktop application"**
   - Enter a name (e.g., "Sheets Viewer Desktop")
   - Click "Create"

5. **Copy Your Credentials**:
   - You'll see a dialog with Client ID and Client Secret
   - **Save these values** - you'll need them in the app

### Step 3: Build and Run Desktop App

#### Development Mode (with hot reload):
```bash
npm run electron-dev
```

#### Production Mode:
```bash
# Build the React app and run Electron
npm run desktop
```

#### Create Distributable Package:
```bash
# Create installer/package for your platform
npm run build-desktop
```

The packaged app will be in the `build/` directory.

## 🔐 OAuth Configuration

When you first open the desktop app:

1. **The OAuth Manager will appear** with configuration options
2. **Click "Configure OAuth"** 
3. **Enter your credentials**:
   - Paste the **Client ID** from Google Cloud Console
   - Paste the **Client Secret** from Google Cloud Console
4. **Click "Save Configuration"**
5. **Click "Connect to Google"** to authenticate
6. **Your browser will open** for OAuth flow
7. **Grant permissions** to access your Google Sheets
8. **Return to the app** - you're now authenticated!

## 📱 Using Private Sheets

Once authenticated with OAuth:

1. **Paste any Google Sheet URL** (public or private)
2. **The app will automatically use OAuth** instead of API keys
3. **Access your private sheets** without making them public
4. **Enjoy full mobile viewer functionality** with your private data

## 🔒 Security Features

- **Secure Token Storage**: Credentials encrypted and stored locally
- **Automatic Token Refresh**: No need to re-authenticate frequently  
- **Local-only Storage**: No credentials sent to external servers
- **Minimal Permissions**: Only requests Google Sheets read access

## 🎯 Distribution

### For Personal Use:
- Run `npm run build-desktop`
- Install the generated package from `build/` directory

### For Team/Organization:
- Set up code signing certificates for your platform
- Configure `electron-builder` in `package.json` for signing
- Build signed packages for distribution

### Platform-Specific Builds:
```bash
# Windows (from any platform)
npm run build-desktop -- --win

# macOS (requires macOS or paid service)
npm run build-desktop -- --mac

# Linux
npm run build-desktop -- --linux
```

## 🚀 Advanced Configuration

### Environment Variables

Create a `.env` file for default OAuth configuration:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### Custom App Icons

Replace the placeholder icons in `electron/assets/`:
- `icon.png` - Linux (512x512 PNG)
- `icon.icns` - macOS (ICNS format)
- `icon.ico` - Windows (ICO format)

### Auto-updater Setup

For production apps, configure auto-updates in `electron/main.js`:
```javascript
const { autoUpdater } = require('electron-updater');
// Configure update server and checking logic
```

## 🐛 Troubleshooting

### OAuth Issues:
- Ensure redirect URI is exactly: `http://localhost:3005/oauth/callback`
- Check that Google Sheets API is enabled
- Verify OAuth consent screen is configured
- Try clearing stored credentials and re-authenticating

### Build Issues:
- Clear `node_modules` and `package-lock.json`, then `npm install`
- Ensure all dependencies are installed
- Check Node.js version compatibility

### Permission Issues:
- On macOS: Allow app in Security & Privacy settings
- On Windows: Allow through Windows Defender if needed

## 📞 Support

For issues with the desktop app deployment:
1. Check this troubleshooting guide
2. Review console logs in the app (View > Developer Tools)
3. Ensure Google Cloud setup matches the instructions exactly

## 🎉 Success!

Once set up, you'll have a powerful desktop app that can:
- ✅ Access any Google Sheet (public or private)
- ✅ Work offline with cached data
- ✅ Provide secure OAuth authentication
- ✅ Offer the full mobile viewer experience
- ✅ Run without needing a browser 