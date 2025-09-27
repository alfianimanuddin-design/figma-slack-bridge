// api/send-to-slack.js
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Server running' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhookUrl, payload } = req.body;
    
    if (!webhookUrl || !payload) {
      return res.status(400).json({ error: 'Missing webhookUrl or payload' });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      const errorText = await response.text();
      return res.status(400).json({ 
        success: false, 
        error: `Slack webhook failed: ${errorText}` 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
