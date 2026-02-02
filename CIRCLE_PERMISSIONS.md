# Circle.so API Permissions

This document outlines the required permissions for the Circle.so Admin API v2 integration.

## Required API Token

**Token Type:** Admin API v2

**How to Obtain:**
1. Log into your Circle.so community as an admin
2. Navigate to: **Settings → Developers → Tokens**
3. Create a new token and select **"Admin V2"** as the type
4. Copy the generated token

## Required Permissions

The API token needs the following permissions to support BOCC backend functionality:

### Community Members
- **Read community members** - Required to search for existing members by email
- **Create/Invite community members** - Required to automatically invite new attendees after check-in

### Future Requirements (Epic 3: Engagement Rewards)
- **Read member custom fields** - Required to read `checkinCount` field
- **Write member custom fields** - Required to update `checkinCount` after each check-in

## Environment Variable Configuration

Add the following environment variable to your Netlify deployment:

```
CIRCLE_API_TOKEN=<your-admin-v2-token>
```

**Important Security Notes:**
- Use the **minimum required permissions** (Admin V2 with member read/write only)
- **Never** use a full admin token or secret key
- **Never** commit the token to version control
- Store the token **only** in Netlify environment variables
- Rotate the token periodically for security

## API Endpoints Used

- `GET /api/admin/v2/community_members` - Search for existing members
- `POST /api/admin/v2/community_members` - Create/invite new members
- Future: `PATCH /api/admin/v2/community_members/:id` - Update member custom fields

## Rate Limits

Circle.so API v2 has rate limits. Follow these best practices:
- Cache member lookups when possible
- Batch operations where supported
- Implement exponential backoff for retry logic
- Monitor API usage via Circle.so dashboard

## Testing

Test the API integration with:
- A test Circle.so community (if available)
- Use `debug: "1"` flag in check-in requests to mark test data
- Verify API token has correct permissions before deploying to production

## References

- [Circle.so Admin API Documentation](https://api.circle.so/apis/admin-api)
- [Circle.so API Quick Start](https://api.circle.so/apis/admin-api/quick-start)
- [Circle.so Developer Portal](https://api.circle.so/)
