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
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Missing Slack bot token' });
    }

    // Fetch users from Slack API
    const response = await fetch('https://slack.com/api/users.list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.ok) {
      return res.status(500).json({
        error: 'Slack API error',
        details: data.error
      });
    }

    if (!data.members || data.members.length === 0) {
      return res.json({
        success: true,
        users: [],
        totalUsers: 0
      });
    }

    // Filter and format users (same logic as CLI script)
    const users = data.members
      .filter(member => {
        // Exclude deleted users, bots, and slackbot
        return !member.deleted &&
               !member.is_bot &&
               member.id !== 'USLACKBOT';
      })
      .map(member => ({
        id: member.id,
        name: member.real_name || member.name,
        username: member.name,
        email: member.profile.email || '',
        role: member.profile.title || 'Team Member'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Create teams object
    const teams = {
      design: [],
      product: [],
      engineering: [],
      all: users.map(u => u.id)
    };

    const outputData = {
      users: users,
      teams: teams,
      lastUpdated: new Date().toISOString(),
      totalUsers: users.length
    };

    return res.json({
      success: true,
      data: outputData
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
}
