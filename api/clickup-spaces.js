export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, teamId } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Missing team ID' });
    }

    // Fetch spaces from ClickUp API
    const response = await fetch(
      `https://api.clickup.com/api/v2/team/${teamId}/space?archived=false`,
      {
        method: 'GET',
        headers: {
          'Authorization': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('ClickUp spaces fetch error:', data);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch spaces',
        details: data.err || data.error || 'Unknown error'
      });
    }

    return res.json({
      success: true,
      spaces: data.spaces || []
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  }
}
