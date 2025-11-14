# Figma Slack Bridge Server

This is the backend server for the Figma "Commit to Slack" plugin. It acts as a proxy between Figma and Slack APIs to handle authentication and API requests.

## 🚀 Deployed URL

Production: `https://figma-slack-bridge.vercel.app`

## 📁 Project Structure

```
figma-slack-bridge/
├── api/
│   ├── send-to-slack.js          # Sends messages to Slack webhooks
│   ├── fetch-slack-users.js      # Fetches users from Slack workspace
│   └── fetch-slack-channels.js   # Fetches channels from Slack workspace
├── package.json
├── vercel.json
└── README.md
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ installed
- Vercel CLI (optional, for local testing)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/alfianimanuddin-design/figma-slack-bridge.git
   cd figma-slack-bridge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run locally with Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   vercel dev
   ```
   The server will run at `http://localhost:3000`

4. **Update Figma Plugin to use local server**

   In the Figma plugin's `ui.html`, change the `SERVER_URL` constant:

   ```javascript
   // For local development
   const SERVER_URL = 'http://localhost:3000';

   // For production (default)
   // const SERVER_URL = 'https://figma-slack-bridge.vercel.app';
   ```

### Testing API Endpoints

#### 1. Test Server Health
```bash
curl https://figma-slack-bridge.vercel.app/api/send-to-slack
```

Expected response:
```json
{
  "status": "Figma Slack Bridge is running",
  "timestamp": "2024-01-15T12:34:56.789Z"
}
```

#### 2. Fetch Slack Users
```bash
curl -X POST https://figma-slack-bridge.vercel.app/api/fetch-slack-users \
  -H "Content-Type: application/json" \
  -d '{"token": "xoxb-your-token-here"}'
```

#### 3. Fetch Slack Channels
```bash
curl -X POST https://figma-slack-bridge.vercel.app/api/fetch-slack-channels \
  -H "Content-Type: application/json" \
  -d '{"token": "xoxb-your-token-here"}'
```

#### 4. Send to Slack
```bash
curl -X POST https://figma-slack-bridge.vercel.app/api/send-to-slack \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "payload": {
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "Test message"
          }
        }
      ]
    }
  }'
```

## 🚢 Deployment

### Deploy to Vercel

1. **First time setup**
   ```bash
   vercel login
   vercel
   ```
   Follow the prompts to link your project.

2. **Deploy changes**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

   Vercel will automatically deploy when you push to GitHub (if connected).

3. **Manual deployment**
   ```bash
   vercel --prod
   ```

### Environment Variables

No environment variables are required. The server is stateless and uses:
- Slack Bot Tokens (provided by users in the plugin)
- Webhook URLs (configured by users)

## 📡 API Endpoints

### `GET /api/send-to-slack`
Health check endpoint.

**Response:**
```json
{
  "status": "Figma Slack Bridge is running",
  "timestamp": "ISO-8601 timestamp"
}
```

### `POST /api/send-to-slack`
Sends a message to Slack via webhook.

**Request Body:**
```json
{
  "webhookUrl": "https://hooks.slack.com/services/...",
  "payload": {
    "blocks": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "slackResponse": "ok"
}
```

### `POST /api/fetch-slack-users`
Fetches all users from a Slack workspace.

**Request Body:**
```json
{
  "token": "xoxb-your-bot-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "teams": {...},
    "lastUpdated": "ISO-8601 timestamp",
    "totalUsers": 42
  }
}
```

**Required Scopes:**
- `users:read`
- `users:read.email`

### `POST /api/fetch-slack-channels`
Fetches all channels from a Slack workspace.

**Request Body:**
```json
{
  "token": "xoxb-your-bot-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "channels": [...],
    "lastUpdated": "ISO-8601 timestamp",
    "totalChannels": 15
  }
}
```

**Required Scopes:**
- `channels:read`
- `groups:read`

## 🔒 Security

- **No data storage**: The server doesn't store any tokens or user data
- **CORS enabled**: Allows requests from Figma plugin
- **Proxy pattern**: Acts as a secure bridge between Figma and Slack
- **No authentication**: Users provide their own Slack tokens

## 🐛 Debugging

### Enable Verbose Logging

Check Vercel deployment logs:
```bash
vercel logs
```

Or view in Vercel Dashboard:
`https://vercel.com/your-username/figma-slack-bridge/logs`

### Common Issues

1. **CORS errors**
   - Ensure `Access-Control-Allow-Origin: *` is set in all endpoints

2. **Slack API errors**
   - Check token has required scopes
   - Verify token starts with `xoxb-`

3. **Timeout errors**
   - Vercel functions have 10s timeout on Hobby plan
   - For large workspaces, consider pagination

## 📝 Development Notes

### Changing Server URL in Plugin

**For Development:**
```javascript
const SERVER_URL = 'http://localhost:3000';
```

**For Production:**
```javascript
const SERVER_URL = 'https://figma-slack-bridge.vercel.app';
```

**For Custom Deployment:**
```javascript
const SERVER_URL = 'https://your-custom-domain.com';
```

### Testing Changes

1. Make changes to API files
2. Test locally with `vercel dev`
3. Test with Figma plugin pointing to localhost
4. Commit and push to deploy to production
5. Update plugin to use production URL

## 📄 License

MIT

## 👥 Contributors

- Alfian Imanuddin

## 🔗 Related

- [Figma Plugin Repository](../README.md)
- [Slack API Documentation](https://api.slack.com)
- [Vercel Documentation](https://vercel.com/docs)
