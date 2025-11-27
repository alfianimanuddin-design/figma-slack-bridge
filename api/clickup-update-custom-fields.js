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
    const { accessToken, taskId, customFields } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    if (!taskId) {
      return res.status(400).json({ error: 'Missing task ID' });
    }

    if (!customFields || !Array.isArray(customFields)) {
      return res.status(400).json({ error: 'Missing or invalid custom fields' });
    }

    // First, get the task details to retrieve custom field IDs
    const taskResponse = await fetch(
      `https://api.clickup.com/api/v2/task/${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!taskResponse.ok) {
      const taskError = await taskResponse.json();
      console.error('ClickUp task fetch error:', taskError);
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch task details',
        details: taskError.err || taskError.error || 'Unknown error'
      });
    }

    const taskData = await taskResponse.json();

    // Map custom field names to IDs
    const existingCustomFields = taskData.custom_fields || [];
    const customFieldUpdates = [];

    for (const field of customFields) {
      const existingField = existingCustomFields.find(
        f => f.name.toLowerCase() === field.name.toLowerCase()
      );

      if (existingField) {
        // Prepare update based on field type
        let updateValue;

        if (existingField.type === 'date') {
          // For date fields, convert to timestamp (milliseconds)
          const date = new Date(field.value);
          updateValue = { value: date.getTime() };
        } else if (existingField.type === 'url') {
          // For URL fields
          updateValue = { value: field.value };
        } else if (existingField.type === 'short_text' || existingField.type === 'text') {
          // For text fields
          updateValue = { value: field.value };
        } else {
          // Default: try to set the value directly
          updateValue = { value: field.value };
        }

        customFieldUpdates.push({
          id: existingField.id,
          ...updateValue
        });
      } else {
        console.warn(`Custom field "${field.name}" not found in task`);
      }
    }

    if (customFieldUpdates.length === 0) {
      return res.json({
        success: true,
        message: 'No matching custom fields found to update',
        task: taskData
      });
    }

    // Update the custom fields
    const updateResponse = await fetch(
      `https://api.clickup.com/api/v2/task/${taskId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          custom_fields: customFieldUpdates
        })
      }
    );

    const updateData = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error('ClickUp custom fields update error:', updateData);
      return res.status(400).json({
        success: false,
        error: 'Failed to update custom fields',
        details: updateData.err || updateData.error || 'Unknown error'
      });
    }

    return res.json({
      success: true,
      task: updateData,
      updatedFields: customFieldUpdates.length
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
