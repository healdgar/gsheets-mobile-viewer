var api = require('./api-oauth');

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

var app = express();

var port = process.env.PORT || 5005;

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// get api
app.get('/api', api);

// OAuth configuration routes for desktop app
app.get('/oauth/config', function(req, res) {
  // Check if running in Electron
  if (global.electronOAuth) {
    const config = global.electronOAuth.getOAuthConfig();
    res.json({
      googleClientId: config.clientId,
      redirectUri: 'http://localhost:3005/oauth/callback',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      hasConfig: config.hasConfig
    });
  } else {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      redirectUri: 'http://localhost:3005/oauth/callback',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      hasConfig: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
  }
});

// OAuth status route
app.get('/oauth/status', function(req, res) {
  if (global.electronOAuth) {
    const status = global.electronOAuth.getOAuthStatus();
    res.json(status);
  } else {
    res.json({
      hasAuth: false,
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
  }
});

// OAuth configuration update route
app.post('/oauth/config', function(req, res) {
  const { clientId, clientSecret } = req.body;
  
  if (global.electronOAuth) {
    const result = global.electronOAuth.setOAuthConfig(clientId, clientSecret);
    res.json(result);
  } else {
    res.status(400).json({ success: false, error: 'Not running in desktop mode' });
  }
});

// OAuth login redirect route  
app.get('/oauth/login', function(req, res) {
  if (global.electronOAuth) {
    try {
      const config = global.electronOAuth.getOAuthConfig();
      
      if (!config.hasConfig) {
        return res.status(400).json({ error: 'OAuth not configured. Please set up credentials first.' });
      }
      
      // Build OAuth URL
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: 'http://localhost:3005/oauth/callback',
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent'
      });
      
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      
      // Redirect to Google OAuth
      res.redirect(oauthUrl);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: 'Not running in desktop mode' });
  }
});

// Get OAuth token route
app.get('/oauth/token', async function(req, res) {
  if (global.electronOAuth) {
    try {
      const tokenData = await global.electronOAuth.getOAuthToken();
      if (tokenData && tokenData.token) {
        res.json({ token: tokenData.token });
      } else {
        res.status(401).json({ error: 'No valid OAuth token available' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to get OAuth token', details: error.message });
    }
  } else {
    res.status(400).json({ error: 'Not running in desktop mode' });
  }
});

// Health check endpoint
app.get('/health', function(req, res) {
  let oauthConfigured = false;
  
  if (global.electronOAuth) {
    const config = global.electronOAuth.getOAuthConfig();
    oauthConfigured = config.hasConfig;
  } else {
    oauthConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    oauthConfigured: oauthConfigured,
    electronMode: !!global.electronOAuth
  });
});

// Serve the React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// error handler
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(400).send(err.message);
});

app.listen(port, function() {
  console.log('GSX2JSON with Mobile Viewer listening on port ' + port);
  console.log('Visit http://localhost:' + port + ' to use the app');
});
