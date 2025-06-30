require('dotenv').config();

// Google Sheets API key is loaded from environment variable GSHEETS_API_KEY.
// Create a .env file in project root with GSHEETS_API_KEY=YOUR_KEY_HERE
const gauthkey = process.env.GSHEETS_API_KEY || 'ENTER_API_KEY_HERE'; // https://developers.google.com/sheets/api/guides/authorizing#APIKey
var request = require('request');

// Helper: extract pure Sheet ID
function extractSheetId(raw) {
  if (!raw) return raw;
  const m = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m && m[1]) return m[1];
  if (raw.startsWith('http')) {
    try {
      const u = new URL(raw);
      const parts = u.pathname.split('/');
      const idx = parts.indexOf('d');
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    } catch {}
  }
  return raw;
}

module.exports = function (req, res, next) {
    try {
        var params = req.query,
            api_key = params.api_key || gauthkey,
            rawId = params.id,
            id = extractSheetId(rawId),
            sheet = params.sheet,
            query = params.q,
            useIntegers = params.integers || true,
            showRows = params.rows || true,
            showColumns = params.columns || true,
            metadataUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '?key=' + api_key,
            valuesUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/' + sheet + '?key=' + api_key;
        
        // Debug logging
        console.log('Debug Info:');
        console.log('- Default API key from file:', gauthkey);
        console.log(`- Sheet ID raw: ${rawId} → parsed: ${id}`);
        console.log('- API key from params:', params.api_key);
        console.log('- Final API key being used:', api_key);
        
        if (!id) {
            return res.status(400).json('You must provide a sheet ID');
        }
        if (!sheet) {
            return res.status(400).json('You must provide a sheet name');
        }

        // First, get the spreadsheet metadata to get the title
        request(metadataUrl, function (metadataError, metadataResponse, metadataBody) {
            if (metadataError || metadataResponse.statusCode !== 200) {
                console.error('Error fetching spreadsheet metadata:', metadataError);
                var errorData = metadataBody ? JSON.parse(metadataBody) : { message: 'Failed to fetch spreadsheet metadata' };
                return res.status(metadataResponse.statusCode || 500).json(errorData.error || errorData);
            }

            var metadataJson = JSON.parse(metadataBody);
            var spreadsheetTitle = metadataJson.properties ? metadataJson.properties.title : 'Unknown Sheet';

            // Then get the values
            request(valuesUrl, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    var data = JSON.parse(response.body);
                    var responseObj = {
                        title: spreadsheetTitle // Add the spreadsheet title to the response
                    };
                    var rows = [];
                    var columns = {};

                    if (data && data.values) {
                        var headings = data.values[0]

                        for (var i = 1; i < data.values.length; i++) {
                            var entry = data.values[i];
                            var newRow = {};
                            var queried = !query;
                            for (var j = 0; j < entry.length; j++) {
                                var name = headings[j];
                                var value = entry[j];
                                if (query) {
                                    if (value.toLowerCase().indexOf(query.toLowerCase()) > -1) {
                                        queried = true;
                                    }
                                }
                                if (Object.keys(params).indexOf(name) > -1) {
                                    queried = false;
                                    if (value.toLowerCase() === params[name].toLowerCase()) {
                                        queried = true;
                                    }
                                }
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
                        if (showColumns === true) {
                            responseObj['columns'] = columns;
                        }
                        if (showRows === true) {
                            responseObj['rows'] = rows;
                        }
                        return res.status(200).json(responseObj);
                    } else {     
                        var data = JSON.parse(response.body);
                        return res.status(response.statusCode).json(data.error);    
                    }
                } else {
                    var data = JSON.parse(response.body);
                    return res.status(response.statusCode).json(data.error);
                }
            });
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};