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
    const { accessToken, teamId, spaceId, listId } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Missing team ID' });
    }

    let tasks = [];

    // Fetch tasks based on the scope provided
    if (listId) {
      // Fetch tasks from a specific list
      const response = await fetch(
        `https://api.clickup.com/api/v2/list/${listId}/task?archived=false&include_closed=false`,
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
        console.error('ClickUp tasks fetch error:', data);
        return res.status(400).json({
          success: false,
          error: 'Failed to fetch tasks',
          details: data.err || data.error || 'Unknown error'
        });
      }

      tasks = data.tasks || [];

    } else if (spaceId) {
      // Fetch all lists in the space, then get tasks from each list
      const listsResponse = await fetch(
        `https://api.clickup.com/api/v2/space/${spaceId}/list?archived=false`,
        {
          method: 'GET',
          headers: {
            'Authorization': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const listsData = await listsResponse.json();

      if (!listsResponse.ok) {
        console.error('ClickUp lists fetch error:', listsData);
        return res.status(400).json({
          success: false,
          error: 'Failed to fetch lists',
          details: listsData.err || listsData.error || 'Unknown error'
        });
      }

      // Fetch tasks from all lists in parallel
      const allTasksPromises = (listsData.lists || []).map(async (list) => {
        try {
          const response = await fetch(
            `https://api.clickup.com/api/v2/list/${list.id}/task?archived=false&include_closed=false`,
            {
              method: 'GET',
              headers: {
                'Authorization': accessToken,
                'Content-Type': 'application/json'
              }
            }
          );

          const data = await response.json();
          return data.tasks || [];
        } catch (error) {
          console.error(`Error fetching tasks for list ${list.id}:`, error);
          return [];
        }
      });

      const allTasksArrays = await Promise.all(allTasksPromises);
      tasks = allTasksArrays.flat();

    } else {
      // Fetch tasks from the entire team
      const response = await fetch(
        `https://api.clickup.com/api/v2/team/${teamId}/task?archived=false&include_closed=false`,
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
        console.error('ClickUp tasks fetch error:', data);
        return res.status(400).json({
          success: false,
          error: 'Failed to fetch tasks',
          details: data.err || data.error || 'Unknown error'
        });
      }

      tasks = data.tasks || [];
    }

    // Format tasks for easier consumption
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description || '',
      status: task.status?.status || 'No Status',
      url: task.url,
      list: {
        id: task.list?.id || '',
        name: task.list?.name || ''
      },
      folder: {
        id: task.folder?.id || '',
        name: task.folder?.name || ''
      },
      space: {
        id: task.space?.id || '',
        name: task.space?.name || ''
      },
      assignees: (task.assignees || []).map(a => ({
        id: a.id,
        username: a.username,
        email: a.email
      })),
      priority: task.priority || null,
      dueDate: task.due_date || null,
      tags: task.tags || []
    }));

    return res.json({
      success: true,
      tasks: formattedTasks,
      count: formattedTasks.length
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
