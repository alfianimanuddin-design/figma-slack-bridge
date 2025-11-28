/**
 * Privacy-focused analytics endpoint
 *
 * Tracks anonymous usage metrics to help improve the plugin.
 * No PII (Personally Identifiable Information) is collected or stored.
 *
 * Events tracked:
 * - plugin_opened
 * - clickup_connected
 * - clickup_disconnected
 * - clickup_config_saved
 * - message_posted
 */

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
    const { event, properties } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    // Log to Vercel logs for now (can be extended to use analytics service)
    console.log('[Analytics]', {
      event,
      timestamp: properties?.timestamp || new Date().toISOString(),
      session_id: properties?.session_id,
      plugin_version: properties?.plugin_version,
      properties: {
        // Only log non-PII properties
        folder_count: properties?.folder_count,
        has_clickup_task: properties?.has_clickup_task,
        has_figma_link: properties?.has_figma_link,
        acknowledgment_count: properties?.acknowledgment_count,
        cc_count: properties?.cc_count
      }
    });

    // Future: Send to analytics service (PostHog, Mixpanel, etc.)
    // Example: await sendToPostHog(event, properties);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Analytics] Error:', error);
    // Silently fail to not impact user experience
    return res.status(200).json({ success: true });
  }
}
