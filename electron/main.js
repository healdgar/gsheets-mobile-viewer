const { app, Menu, Tray, dialog, shell, nativeImage, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');
const { google } = require('googleapis');
const express = require('express');
const os = require('os');

// Initialize secure storage
const store = new Store({
  encryptionKey: 'gsx2json-oauth-secure-key-2024'
});

// OAuth 2.0 configuration
const OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || store.get('googleClientId'),
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || store.get('googleClientSecret'),
  redirectUri: 'http://localhost:3005/oauth/callback',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
};

let tray;
let serverProcess;
let oauthServer;
let serverPort = 5005;

// OAuth client setup
let oauth2Client;

function initializeOAuth() {
  if (OAUTH_CONFIG.clientId && OAUTH_CONFIG.clientSecret) {
    oauth2Client = new google.auth.OAuth2(
      OAUTH_CONFIG.clientId,
      OAUTH_CONFIG.clientSecret,
      OAUTH_CONFIG.redirectUri
    );

    // Check for stored refresh token
    const refreshToken = store.get('oauth.refreshToken');
    if (refreshToken) {
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
    }
  }
}

function getLocalIpAddress() {
  const networks = os.networkInterfaces();
  for (const name of Object.keys(networks)) {
    for (const net of networks[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

async function createTray() {
  try {
    // Start OAuth callback server
    if (!oauthServer) {
      startOAuthServer();
    }
    
    // Start the Express server and wait for it to be ready
    await startServer();
    
    // Create system tray icon
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    
    const localIp = getLocalIpAddress();
    const serverUrl = `http://${localIp}:${serverPort}`;
    
    // Create context menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'GSX2JSON Server',
        type: 'normal',
        enabled: false
      },
      { type: 'separator' },
      {
        label: `Server: ${serverUrl}`,
        type: 'normal',
        click: () => {
          shell.openExternal(serverUrl);
        }
      },
      {
        label: 'Copy URL to Clipboard',
        type: 'normal',
        click: () => {
          require('electron').clipboard.writeText(serverUrl);
          dialog.showMessageBox({
            type: 'info',
            title: 'URL Copied',
            message: `Server URL copied to clipboard:\n${serverUrl}`,
            buttons: ['OK']
          });
        }
      },
      {
        label: 'Open in Browser',
        type: 'normal',
        click: () => {
          shell.openExternal(serverUrl);
        }
      },
      { type: 'separator' },
      {
        label: 'Configure OAuth',
        type: 'normal',
        click: () => {
          showOAuthConfigDialog();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        type: 'normal',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.setToolTip('GSX2JSON Server - Mobile Table Viewer');
    
    // Show notification that server is ready
    dialog.showMessageBox({
      type: 'info',
      title: 'GSX2JSON Server Started',
      message: `Server is running and accessible at:\n\n${serverUrl}\n\nVisit this URL from any device on your network to use the mobile table viewer.`,
      buttons: ['OK', 'Open in Browser'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 1) {
        shell.openExternal(serverUrl);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    dialog.showErrorBox(
      'Server Error', 
      `Failed to start the GSX2JSON server:\n\n${error.message}\n\nPlease check the console for more details.`
    );
    app.quit();
  }
}

function showOAuthConfigDialog() {
  dialog.showMessageBox({
    type: 'info',
    title: 'OAuth Configuration',
    message: 'To configure OAuth for accessing private Google Sheets:\n\n1. Visit the Google Cloud Console\n2. Create OAuth 2.0 credentials\n3. Add them via the web interface\n\nWould you like to open the configuration page?',
    buttons: ['Cancel', 'Open Config Page'],
    defaultId: 1
  }).then((result) => {
    if (result.response === 1) {
      const localIp = getLocalIpAddress();
      shell.openExternal(`http://${localIp}:${serverPort}`);
    }
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev) {
      try {
        // Require the Express server in the same process so we share globals
        process.env.PORT = process.env.PORT || String(serverPort);
        require(path.join(__dirname, '..', 'app.js'));
        console.log(`Express server started on port ${serverPort} (same process)`);
        resolve();
      } catch (err) {
        console.error('Failed to start embedded server:', err);
        reject(err);
      }
    } else {
      // In development mode, assume webpack dev server is running separately
      resolve();
    }
  });
}

function startOAuthServer() {
  const app = express();
  
  app.get('/oauth/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #fff2f2;">
            <h1 style="color: #dc3545;">❌ OAuth Error</h1>
            <p style="font-size: 16px; color: #666;">Error: ${error}</p>
            <p>Please try again or check your OAuth configuration.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          </body>
        </html>
      `);
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      // Store refresh token securely
      if (tokens.refresh_token) {
        store.set('oauth.refreshToken', tokens.refresh_token);
      }
      store.set('oauth.accessToken', tokens.access_token);
      store.set('oauth.expiryDate', tokens.expiry_date);

      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f8ff;">
            <h1 style="color: #28a745;">✅ Authentication Successful!</h1>
            <p style="font-size: 18px; margin: 20px 0;">You have successfully connected to Google Sheets.</p>
            <p style="color: #666;">You can now close this window and return to the app to access private spreadsheets.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);

      // Show success notification
      dialog.showMessageBox({
        type: 'info',
        title: 'OAuth Authentication Successful',
        message: 'You have successfully authenticated with Google. You can now access private spreadsheets.',
        buttons: ['OK']
      });

    } catch (error) {
      console.error('OAuth token exchange error:', error);
      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #fff2f2;">
            <h1 style="color: #dc3545;">❌ OAuth Error</h1>
            <p style="font-size: 16px; color: #666;">Failed to exchange authorization code for tokens.</p>
            <p>Error details: ${error.message}</p>
            <p>Please check your OAuth configuration and try again.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          </body>
        </html>
      `);
    }
  });

  oauthServer = app.listen(3005, () => {
    console.log('OAuth callback server running on port 3005');
  });
}

// Helper functions for OAuth (called from Express routes)
function getOAuthToken() {
  if (!oauth2Client) {
    return null;
  }

  try {
    return oauth2Client.getAccessToken();
  } catch (error) {
    console.error('Error getting OAuth token:', error);
    return null;
  }
}

function getOAuthStatus() {
  const refreshToken = store.get('oauth.refreshToken');
  const accessToken = store.get('oauth.accessToken');
  
  return {
    hasAuth: !!(refreshToken || accessToken),
    configured: !!(OAUTH_CONFIG.clientId && OAUTH_CONFIG.clientSecret)
  };
}

function setOAuthConfig(clientId, clientSecret) {
  try {
    store.set('googleClientId', clientId);
    store.set('googleClientSecret', clientSecret);
    
    OAUTH_CONFIG.clientId = clientId;
    OAUTH_CONFIG.clientSecret = clientSecret;
    
    initializeOAuth();
    
    return { success: true };
  } catch (error) {
    console.error('Error setting OAuth config:', error);
    return { success: false, error: error.message };
  }
}

function getOAuthConfig() {
  return {
    clientId: store.get('googleClientId') || '',
    clientSecret: store.get('googleClientSecret') || '',
    hasConfig: !!(store.get('googleClientId') && store.get('googleClientSecret'))
  };
}

// Make OAuth functions globally available for the Express server
global.electronOAuth = {
  getOAuthToken,
  getOAuthStatus,
  setOAuthConfig,
  getOAuthConfig
};

// App event handlers
app.whenReady().then(() => {
  initializeOAuth();
  createTray();
});

// Prevent the app from quitting when all windows are closed (since we have no windows)
app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', () => {
  // Clean up
  if (serverProcess) {
    serverProcess.kill();
  }
  if (oauthServer) {
    oauthServer.close();
  }
}); 