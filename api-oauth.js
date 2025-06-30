require('dotenv').config();

const { google } = require('googleapis');
const request = require('request');

// Legacy API key support
const gauthkey = process.env.GSHEETS_API_KEY || 'ENTER_API_KEY_HERE';

// OAuth 2.0 client setup
let oauth2Client;

function initializeOAuth() {
  let clientId, clientSecret;
  
  // Check if running in Electron mode
  if (global.electronOAuth) {
    const config = global.electronOAuth.getOAuthConfig();
    clientId = config.clientId;
    clientSecret = config.clientSecret;
  } else {
    clientId = process.env.GOOGLE_CLIENT_ID;
    clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }

  if (clientId && clientSecret) {
    oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:3005/oauth/callback'
    );
  }
}

// Initialize OAuth on module load
initializeOAuth();

module.exports = function (req, res, next) {
  try {
    const params = req.query;
    const id = params.id;
    const sheet = params.sheet;
    const query = params.q;
    const useIntegers = params.integers || true;
    const showRows = params.rows || true;
    const showColumns = params.columns || true;
    const oauthToken = params.oauth_token;
    const api_key = params.api_key || gauthkey;

    console.log('--- Incoming API Request Debug ---');
    console.log(`Sheet ID: ${id}, Sheet Tab: ${sheet}`);
    console.log('- query param oauth_token present:', !!oauthToken);
    console.log('- Electron desktop mode detected:', !!global.electronOAuth);
    if (global.electronOAuth) {
      const status = global.electronOAuth.getOAuthStatus();
      console.log(`  • Electron OAuth configured: ${status.configured}`);
      console.log(`  • Electron OAuth hasAuth: ${status.hasAuth}`);
    }
    console.log('- API key provided:', !!api_key);

    if (!id) {
      return res.status(400).json('You must provide a sheet ID');
    }
    if (!sheet) {
      return res.status(400).json('You must provide a sheet name');
    }

    // Choose authentication method
    if (oauthToken) {
      // Use OAuth authentication
      handleOAuthRequest(req, res, {
        id, sheet, query, useIntegers, showRows, showColumns, oauthToken
      });
    } else if (global.electronOAuth) {
      // Try to use Electron OAuth token
      handleElectronOAuthRequest(req, res, {
        id, sheet, query, useIntegers, showRows, showColumns
      });
    } else if (api_key) {
      // Use API key authentication (legacy)
      handleAPIKeyRequest(req, res, {
        id, sheet, query, useIntegers, showRows, showColumns, api_key
      });
    } else {
      return res.status(400).json({
        error: 'Authentication required',
        message: 'Provide either oauth_token or api_key parameter'
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

async function handleElectronOAuthRequest(req, res, params) {
  const { id, sheet, query, useIntegers, showRows, showColumns } = params;

  try {
    // Get OAuth token from Electron
    const tokenData = await global.electronOAuth.getOAuthToken();
    if (!tokenData || !tokenData.token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No OAuth token available. Please authenticate first.'
      });
    }

    // Use the token for the request
    return await handleOAuthRequest(req, res, {
      id, sheet, query, useIntegers, showRows, showColumns, oauthToken: tokenData.token
    });

  } catch (error) {
    console.error('Electron OAuth error:', error);
    return res.status(500).json({
      error: 'Failed to get OAuth token from Electron',
      message: error.message
    });
  }
}

async function handleOAuthRequest(req, res, params) {
  const { id, sheet, query, useIntegers, showRows, showColumns, oauthToken } = params;

  try {
    // Set up OAuth client with the provided token
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: oauthToken });

    // Initialize Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Get spreadsheet metadata
    const metadataResponse = await sheets.spreadsheets.get({
      spreadsheetId: id
    });

    const spreadsheetTitle = metadataResponse.data.properties?.title || 'Unknown Sheet';

    // Get sheet values
    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: sheet
    });

    const data = valuesResponse.data;
    const responseObj = {
      title: spreadsheetTitle
    };

    if (data && data.values) {
      const { rows, columns } = processSheetData(data.values, query, useIntegers, req.query);
      
      if (showColumns) {
        responseObj.columns = columns;
      }
      if (showRows) {
        responseObj.rows = rows;
      }
    }

    return res.status(200).json(responseObj);

  } catch (error) {
    console.error('OAuth API error:', error);
    
    if (error.code === 401) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'OAuth token is invalid or expired. Please re-authenticate.'
      });
    }
    
    if (error.code === 403) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied. Check your OAuth permissions.'
      });
    }

    return res.status(error.code || 500).json({
      error: error.message || 'Failed to fetch spreadsheet data',
      details: error.errors || []
    });
  }
}

function handleAPIKeyRequest(req, res, params) {
  const { id, sheet, query, useIntegers, showRows, showColumns, api_key } = params;

  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${id}?key=${api_key}`;
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${sheet}?key=${api_key}`;

  // First, get the spreadsheet metadata
  request(metadataUrl, function (metadataError, metadataResponse, metadataBody) {
    if (metadataError || metadataResponse.statusCode !== 200) {
      console.error('Error fetching spreadsheet metadata:', metadataError);
      const errorData = metadataBody ? JSON.parse(metadataBody) : { 
        message: 'Failed to fetch spreadsheet metadata' 
      };
      return res.status(metadataResponse.statusCode || 500).json(errorData.error || errorData);
    }

    const metadataJson = JSON.parse(metadataBody);
    const spreadsheetTitle = metadataJson.properties ? metadataJson.properties.title : 'Unknown Sheet';

    // Then get the values
    request(valuesUrl, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        const data = JSON.parse(response.body);
        const responseObj = {
          title: spreadsheetTitle
        };

        if (data && data.values) {
          const { rows, columns } = processSheetData(data.values, query, useIntegers, req.query);
          
          if (showColumns) {
            responseObj.columns = columns;
          }
          if (showRows) {
            responseObj.rows = rows;
          }
        }

        return res.status(200).json(responseObj);
      } else {
        const errorData = JSON.parse(response.body);
        return res.status(response.statusCode).json(errorData.error);
      }
    });
  });
}

function processSheetData(values, query, useIntegers, params) {
  const rows = [];
  const columns = {};
  
  if (!values || values.length === 0) {
    return { rows, columns };
  }

  const headings = values[0];

  for (let i = 1; i < values.length; i++) {
    const entry = values[i];
    const newRow = {};
    let queried = !query;

    for (let j = 0; j < entry.length; j++) {
      const name = headings[j];
      let value = entry[j];

      if (query) {
        if (value && value.toLowerCase().indexOf(query.toLowerCase()) > -1) {
          queried = true;
        }
      }

      // Check for column-specific filters
      if (Object.keys(params).indexOf(name) > -1) {
        queried = false;
        if (value && value.toLowerCase() === params[name].toLowerCase()) {
          queried = true;
        }
      }

      // Convert to number if requested and possible
      if (useIntegers === true && !isNaN(value)) {
        value = Number(value);
      }

      newRow[name] = value;

      if (queried === true) {
        if (!columns.hasOwnProperty(name)) {
          columns[name] = [];
          columns[name].push(value);
        } else {
          columns[name].push(value);
        }
      }
    }

    if (queried === true) {
      rows.push(newRow);
    }
  }

  return { rows, columns };
} 