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
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    // Fetch authorized teams (workspaces)
    const teamsResponse = await fetch('https://api.clickup.com/api/v2/team', {
      method: 'GET',
      headers: {
        'Authorization': accessToken,
        'Content-Type': 'application/json'
      }
    });

    const teamsData = await teamsResponse.json();

    if (!teamsResponse.ok) {
      console.error('ClickUp teams fetch error:', teamsData);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch workspaces',
        details: teamsData.err || teamsData.error || 'Unknown error'
      });
    }

    // Fetch spaces for each team
    const workspacesWithSpaces = await Promise.all(
      (teamsData.teams || []).map(async (team) => {
        try {
          const spacesResponse = await fetch(
            `https://api.clickup.com/api/v2/team/${team.id}/space?archived=false`,
            {
              method: 'GET',
              headers: {
                'Authorization': accessToken,
                'Content-Type': 'application/json'
              }
            }
          );

          const spacesData = await spacesResponse.json();

          return {
            id: team.id,
            name: team.name,
            color: team.color || '#7B68EE',
            avatar: team.avatar || null,
            spaces: spacesData.spaces || []
          };
        } catch (error) {
          console.error(`Error fetching spaces for team ${team.id}:`, error);
          return {
            id: team.id,
            name: team.name,
            color: team.color || '#7B68EE',
            avatar: team.avatar || null,
            spaces: []
          };
        }
      })
    );

    return res.json({
      success: true,
      workspaces: workspacesWithSpaces
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
