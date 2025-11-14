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

    // Helper function to delay between requests to avoid rate limiting
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Fetch all channels (public and private) from Slack API with pagination
    let allChannels = [];
    let cursor = '';
    let pageCount = 0;

    do {
      pageCount++;

      // Add delay between requests to avoid rate limiting (except for first request)
      if (pageCount > 1) {
        await delay(1000); // Wait 1 second between requests
      }

      // Build URL with pagination parameters
      // types: public_channel,private_channel to get both public and private channels
      // exclude_archived: true to only get active channels
      const url = cursor
        ? `https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200&cursor=${encodeURIComponent(cursor)}`
        : 'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200';

      console.log(`Fetching channels page ${pageCount}...`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!data.ok) {
        console.error('Slack API error:', data);
        return res.status(400).json({
          success: false,
          error: 'Slack API error',
          details: data.error || 'Unknown error',
          slackResponse: data
        });
      }

      if (!data.channels) {
        break;
      }

      allChannels = allChannels.concat(data.channels);
      cursor = data.response_metadata?.next_cursor || '';

      console.log(`Got ${data.channels.length} channels (total so far: ${allChannels.length})`);

    } while (cursor);

    console.log(`Fetched ${allChannels.length} total channels from ${pageCount} page(s)`);

    // Format channels
    const channels = allChannels
      .filter(channel => {
        // Only include channels that are not archived
        return !channel.is_archived;
      })
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        is_private: channel.is_private || false,
        is_channel: channel.is_channel,
        is_group: channel.is_group,
        is_im: channel.is_im,
        num_members: channel.num_members || 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const outputData = {
      channels: channels,
      lastUpdated: new Date().toISOString(),
      totalChannels: channels.length
    };

    return res.json({
      success: true,
      data: outputData
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
