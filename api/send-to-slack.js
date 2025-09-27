export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET requests (for health checks)
  if (req.method === 'GET') {
    return res.json({ 
      status: 'Figma Slack Bridge is running!',
      endpoint: '/api/send-to-slack',
      timestamp: new Date().toISOString()
    });
  }

  // Handle POST requests
  if (req.method === 'POST') {
    try {
      const { channel, payload } = req.body;
      const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

      if (!SLACK_BOT_TOKEN) {
        return res.status(500).json({ error: 'Slack bot token not configured' });
      }

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel || 'design-updates',
          blocks: payload.blocks
        })
      });

      const result = await response.json();

      if (result.ok) {
        return res.json({ success: true, message: 'Successfully sent to Slack' });
      } else {
        return res.status(500).json({ 
          error: 'Failed to send to Slack', 
          details: result.error 
        });
      }

    } catch (error) {
      return res.status(500).json({ 
        error: 'Server error', 
        details: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
