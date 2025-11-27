// Temporary token storage (in-memory, expires after 5 minutes)
const tokens = new Map();

// Clean up expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of tokens.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) { // 5 minutes
      tokens.delete(state);
    }
  }
}, 60 * 1000);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { state } = req.query;

  if (!state) {
    return res.status(400).json({ error: 'Missing state parameter' });
  }

  // POST: Store token
  if (req.method === 'POST') {
    const { access_token, user } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    // Store token with state as key
    tokens.set(state, {
      access_token,
      user,
      timestamp: Date.now()
    });

    return res.json({ success: true });
  }

  // GET: Retrieve token
  if (req.method === 'GET') {
    const data = tokens.get(state);

    if (!data) {
      return res.json({ success: false, message: 'Token not found or expired' });
    }

    // Delete token after retrieval (one-time use)
    tokens.delete(state);

    return res.json({
      success: true,
      access_token: data.access_token,
      user: data.user
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
