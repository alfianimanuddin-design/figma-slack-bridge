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

    console.log('Existing custom fields:', existingCustomFields.map(f => ({ name: f.name, type: f.type, id: f.id })));
    console.log('Fields to update:', customFields);

    for (const field of customFields) {
      const existingField = existingCustomFields.find(
        f => f.name.toLowerCase() === field.name.toLowerCase()
      );

      if (existingField) {
        console.log(`Processing field "${field.name}" (type: ${existingField.type})`);

        // Prepare update based on field type
        let updateValue;

        if (existingField.type === 'date') {
          // For date fields, convert to timestamp (milliseconds)
          const date = new Date(field.value);
          updateValue = { value: date.getTime() };
          console.log(`Date field: ${field.value} -> ${date.getTime()}`);
        } else if (existingField.type === 'drop_down') {
          // For dropdown fields, find the option with the matching name
          const options = existingField.type_config?.options || [];
          console.log(`Dropdown options:`, options.map(o => o.name));
          const matchingOption = options.find(
            opt => opt.name.toLowerCase() === field.value.toLowerCase()
          );

          if (matchingOption) {
            // Use the option's orderindex or id
            updateValue = { value: matchingOption.orderindex };
            console.log(`Dropdown match found: "${field.value}" -> orderindex ${matchingOption.orderindex}`);
          } else {
            console.warn(`Option "${field.value}" not found in dropdown "${field.name}"`);
            continue; // Skip this field if option not found
          }
        } else if (existingField.type === 'url') {
          // For URL fields
          updateValue = { value: field.value };
          console.log(`URL field: ${field.value}`);
        } else if (existingField.type === 'short_text' || existingField.type === 'text') {
          // For text fields
          updateValue = { value: field.value };
          console.log(`Text field: ${field.value}`);
        } else {
          // Default: try to set the value directly
          updateValue = { value: field.value };
          console.log(`Unknown field type "${existingField.type}": ${field.value}`);
        }

        const fieldUpdate = {
          id: existingField.id,
          ...updateValue
        };
        customFieldUpdates.push(fieldUpdate);
        console.log(`Added to updates:`, fieldUpdate);
      } else {
        console.warn(`Custom field "${field.name}" not found in task`);
      }
    }

    if (customFieldUpdates.length === 0) {
      console.log('No custom field updates to apply');
      return res.json({
        success: true,
        message: 'No matching custom fields found to update',
        task: taskData
      });
    }

    console.log('Sending to ClickUp API:', JSON.stringify(customFieldUpdates, null, 2));

    // Update custom fields one by one using dedicated endpoint
    const results = [];
    const errors = [];

    for (const fieldUpdate of customFieldUpdates) {
      try {
        console.log(`Updating field ${fieldUpdate.id} with value:`, fieldUpdate.value);

        const updateResponse = await fetch(
          `https://api.clickup.com/api/v2/task/${taskId}/field/${fieldUpdate.id}`,
          {
            method: 'POST',
            headers: {
              'Authorization': accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              value: fieldUpdate.value
            })
          }
        );

        const updateData = await updateResponse.json();

        if (!updateResponse.ok) {
          console.error(`Failed to update field ${fieldUpdate.id}:`, updateData);
          errors.push({
            fieldId: fieldUpdate.id,
            error: updateData.err || updateData.error || 'Unknown error'
          });
        } else {
          console.log(`Successfully updated field ${fieldUpdate.id}`);
          results.push({
            fieldId: fieldUpdate.id,
            success: true
          });
        }
      } catch (error) {
        console.error(`Error updating field ${fieldUpdate.id}:`, error);
        errors.push({
          fieldId: fieldUpdate.id,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      console.error('Some fields failed to update:', errors);
      return res.status(400).json({
        success: false,
        error: 'Failed to update some custom fields',
        results: results,
        errors: errors
      });
    }

    console.log('Successfully updated all custom fields');
    return res.json({
      success: true,
      updatedFields: results.length,
      results: results
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
