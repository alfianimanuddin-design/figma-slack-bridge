export default async function handler(req, res) {
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
    const { channel, payload } = req.body;
    const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN; // From environment variable

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
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: result.error });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
