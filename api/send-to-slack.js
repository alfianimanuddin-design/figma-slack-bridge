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
      const { webhookUrl, payload } = req.body;

      if (!webhookUrl || !payload) {
        return res.status(400).json({ error: 'Missing webhookUrl or payload' });
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return res.json({ success: true, message: 'Successfully sent to Slack' });
      } else {
        const errorText = await response.text();
        return res.status(500).json({ error: 'Failed to send to Slack', details: errorText });
      }

    } catch (error) {
      return res.status(500).json({ error: 'Server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
