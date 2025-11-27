# Telegram Bot Configuration Guide

## Alert Distribution Policy

### User Restrictions
- **Multiple authorized users** can be registered for Telegram alerts
- **Authorized roles only**: `super-admin`, `dean`, `hod`, `admin`, `security`
- Other roles (faculty, teacher, student, guest) **cannot register**

### Alert Distribution Rules
1. **Administrators** (`super-admin`, `dean`, `hod`, `admin`) receive **ALL alerts**:
   - Device offline alerts
   - Security notifications
   - System maintenance alerts
   - Energy conservation alerts
   - All administrative notifications

2. **Security personnel** receive **limited alerts**:
   - Security-related notifications
   - **Evening lights alerts (lights turned on after 5pm)** with detailed location info:
     - Specific classroom name
     - Floor number
     - Device name
     - How long past schedule
     - Action required
   - Energy conservation alerts

3. **Multiple users** across all authorized roles can receive alerts

## Current Setup: Polling Mode (Recommended)

The Telegram bot is configured to use **polling mode** instead of webhooks for the following reasons:

### Why Polling Mode?
- ✅ **Reliable**: No dependency on external services (ngrok, public URLs)
- ✅ **Simple**: Works immediately without additional setup
- ✅ **Stable**: No expiration issues like ngrok tunnels
- ✅ **Local Network Friendly**: Perfect for 172.16.3.171 network setup

### Why Not Webhooks?
- ❌ **Requires Public URL**: Needs ngrok or similar service
- ❌ **Can Expire**: Ngrok tunnels expire frequently
- ❌ **Additional Setup**: More complex configuration
- ❌ **Network Dependencies**: Requires internet connectivity for webhooks

## Configuration

### Environment Variables (.env)
```bash
# Required
TELEGRAM_BOT_TOKEN=8495154084:AAG0HO2-eWqoKy00bCzQWPsD3rUZ8jFOZr4

# Optional (leave empty for polling mode)
# TELEGRAM_WEBHOOK_URL=https://your-public-url.com/api/telegram/webhook
```

### Current Status
- **Mode**: Polling (automatic updates every 10 seconds)
- **Webhook URL**: Not configured (intentionally)
- **Status**: ✅ Working reliably

## Testing the Bot

1. Find your bot on Telegram (search using the bot token)
2. Send `/start` to begin
3. Register with `/register your-email@university.edu`
   - **Note**: Only admin and security personnel emails will be accepted
   - Multiple authorized users can register
4. Use commands like `/status`, `/devices`, `/help`

### Expected Behavior
- **Admin users**: Will receive all alert types
- **Security users**: Will receive only security and evening lights alerts
- **Unauthorized roles**: Registration will be rejected with clear error message

### Security Alert Example
When lights are left on after 5 PM, security personnel will receive alerts like:

```
🚨 Evening Security Alert

Location: LH_19g (Floor 1)
Device: Computer_Lab_Light_1
Status: LIGHTS STILL ON after 5:00 PM
Time: 15 minutes past schedule

Action Required: Please investigate and turn off lights to save energy and ensure security.

Total Active Switches: Check dashboard for complete list.
```

## Future Webhook Setup (Optional)

If you want to use webhooks later for better performance:

1. Get a stable public URL (ngrok, Cloudflare Tunnel, etc.)
2. Add to `.env`:
   ```bash
   TELEGRAM_WEBHOOK_URL=https://your-stable-public-url.com/api/telegram/webhook
   ```
3. Restart the server

## Troubleshooting

### Registration Issues
- **"Role not authorized"**: Only admin and security roles can register
- **"Already registered"**: Each user can only have one Telegram registration

### Alert Distribution Issues
- **Not receiving expected alerts**: Check your role and subscription settings
- **Admins not getting all alerts**: Ensure role is correctly set in user profile
- **Security not getting evening alerts**: Verify security role and energy_alerts subscription

### Technical Issues
- **Bot not responding**: Check server logs for polling errors
- **Webhook issues**: Remove `TELEGRAM_WEBHOOK_URL` from .env to force polling
- **Multiple instances**: Ensure only one server instance is running

## Benefits of Current Setup

- No more expired ngrok URLs
- Reliable operation on local networks
- Automatic conflict resolution
- Simple maintenance</content>
<parameter name="filePath">c:\Users\IOT\Downloads\aims_smart_class\new-autovolt\TELEGRAM_BOT_SETUP.md