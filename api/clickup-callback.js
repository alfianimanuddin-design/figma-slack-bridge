export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let code;

    // Handle both GET (OAuth redirect) and POST (manual code exchange)
    if (req.method === 'GET') {
      code = req.query.code;
    } else if (req.method === 'POST') {
      code = req.body.code;
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const clientId = process.env.CLICKUP_CLIENT_ID;
    const clientSecret = process.env.CLICKUP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'ClickUp OAuth credentials not configured'
      });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.clickup.com/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('ClickUp token exchange error:', tokenData);
      return res.status(400).json({
        success: false,
        error: 'Failed to exchange authorization code',
        details: tokenData.error || tokenData.err || 'Unknown error'
      });
    }

    // Fetch user information
    const userResponse = await fetch('https://api.clickup.com/api/v2/user', {
      method: 'GET',
      headers: {
        'Authorization': tokenData.access_token,
        'Content-Type': 'application/json'
      }
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error('ClickUp user fetch error:', userData);
    }

    // For GET requests (OAuth redirect), return an HTML page
    if (req.method === 'GET') {
      const state = req.query.state;

      // Store token on server for plugin to retrieve
      const storeResponse = await fetch(`${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/clickup-token-exchange?state=${state}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: tokenData.access_token,
          user: userData.user || null
        })
      }).catch(err => console.error('Error storing token:', err));

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>ClickUp Authorization Complete</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              backdrop-filter: blur(10px);
            }
            .checkmark {
              font-size: 64px;
              margin-bottom: 1rem;
            }
            h1 { margin: 0 0 1rem 0; }
            p { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✓</div>
            <h1>Authorization Successful!</h1>
            <p>You can close this window and return to Figma.</p>
          </div>
          <script>
            // Try to send token data to the opener window (Figma plugin)
            if (window.opener) {
              try {
                window.opener.postMessage({
                  type: 'clickup-auth-success',
                  data: ${JSON.stringify({
                    access_token: tokenData.access_token,
                    user: userData.user || null,
                    state: state
                  })}
                }, '*');
              } catch (e) {
                console.log('Could not post message to opener:', e);
              }
            }
            // Auto-close after 2 seconds
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
        </html>
      `;
      return res.status(200).send(html);
    }

    // For POST requests, return JSON
    return res.json({
      success: true,
      access_token: tokenData.access_token,
      user: userData.user || null
    });

  } catch (error) {
    console.error('OAuth callback error:', error);

    // For GET requests, show error page
    if (req.method === 'GET') {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authorization Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              backdrop-filter: blur(10px);
            }
            .error-icon {
              font-size: 64px;
              margin-bottom: 1rem;
            }
            h1 { margin: 0 0 1rem 0; }
            p { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">✗</div>
            <h1>Authorization Failed</h1>
            <p>${error.message}</p>
            <p>Please try again or contact support.</p>
          </div>
        </body>
        </html>
      `;
      return res.status(500).send(html);
    }

    // For POST requests, return JSON error
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  }
}
