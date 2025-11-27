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
    const { accessToken, taskId, status } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    if (!taskId) {
      return res.status(400).json({ error: 'Missing task ID' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Missing status' });
    }

    // Update task status via ClickUp API
    const response = await fetch(
      `https://api.clickup.com/api/v2/task/${taskId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: status
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('ClickUp task update error:', data);
      return res.status(400).json({
        success: false,
        error: 'Failed to update task status',
        details: data.err || data.error || 'Unknown error'
      });
    }

    return res.json({
      success: true,
      task: data
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
