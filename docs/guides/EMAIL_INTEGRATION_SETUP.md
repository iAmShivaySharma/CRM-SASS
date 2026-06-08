# Email Integration Setup Guide

This guide will help you set up the email integration feature that allows users to connect their Gmail, Outlook, and custom SMTP/IMAP accounts to the CRM.

## Prerequisites

- Node.js 18+ installed
- MongoDB running
- Access to Google Cloud Console (for Gmail)
- Access to Microsoft Azure Portal (for Outlook)

## Environment Variables Setup

### 1. Generate Encryption Keys

Generate the required encryption keys for secure credential storage:

```bash
# For email credential encryption
node -e "console.log('EMAIL_ENCRYPTION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# For API key encryption (if not already set)
node -e "console.log('API_KEY_ENCRYPTION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to .env File

Add these variables to your `.env` file:

```bash
# Email Integration Encryption
EMAIL_ENCRYPTION_SECRET=your_generated_64_character_hex_key

# Google OAuth (Gmail Integration)
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback/google

# Microsoft OAuth (Outlook Integration)
MICROSOFT_OAUTH_CLIENT_ID=your_microsoft_client_id
MICROSOFT_OAUTH_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback/microsoft
```

## Google Cloud Console Setup (Gmail Integration)

### 1. Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID for reference

### 2. Enable APIs

1. Navigate to **APIs & Services** > **Library**
2. Search for and enable these APIs:
   - **Gmail API**
   - **Google OAuth2 API**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have Google Workspace)
3. Fill in the required information:
   - **App name**: Your CRM Name
   - **User support email**: Your support email
   - **Developer contact information**: Your email
4. Add these scopes in the **Scopes** section:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users (if in testing mode)

### 4. Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: CRM Gmail Integration
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback/google` (development)
     - `https://yourdomain.com/auth/callback/google` (production)
5. Copy the **Client ID** and **Client Secret** to your `.env` file

## Microsoft Azure Setup (Outlook Integration)

### 1. Register Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: CRM Outlook Integration
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web platform with `http://localhost:3000/auth/callback/microsoft`

### 2. Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission** > **Microsoft Graph**
3. Choose **Delegated permissions** and add:
   - `Mail.Read`
   - `Mail.Send`
   - `Mail.ReadWrite`
   - `User.Read`
4. Click **Grant admin consent** if you're an admin

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and set expiration
4. Copy the **Value** (not the Secret ID) to your `.env` file

### 4. Note Application Details

- Copy the **Application (client) ID** to your `.env` file as `MICROSOFT_OAUTH_CLIENT_ID`

## Database Setup

### 1. Seed Email Templates

Run the email templates seeding script:

```bash
npm run db:seed-email-templates
```

This creates default email templates that users can use for common scenarios.

### 2. Update Main Seed Script (Optional)

If you want to include email templates in your main seed script, add this to `scripts/seed-mongodb.ts`:

```typescript
import { seedEmailTemplates } from './seed-email-templates'

// Add this line in your main seeding function
await seedEmailTemplates()
```

## Production Configuration

### 1. Update Redirect URIs

For production, update your OAuth redirect URIs in both Google and Microsoft consoles:

- Google: `https://yourdomain.com/auth/callback/google`
- Microsoft: `https://yourdomain.com/auth/callback/microsoft`

### 2. Environment Variables

Update your production `.env` file:

```bash
GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/callback/google
MICROSOFT_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/callback/microsoft
```

### 3. SSL/HTTPS

Ensure your application is served over HTTPS in production as OAuth providers require secure redirect URIs.

## Testing the Integration

### 1. Start the Application

```bash
npm run dev
```

### 2. Navigate to Email Section

1. Log into your CRM
2. Go to the **Email** section in the sidebar
3. Click **Add Email Account**

### 3. Test OAuth Flows

1. Try connecting a Gmail account
2. Try connecting an Outlook account
3. Verify that accounts appear in the account list
4. Test sending an email through the compose interface

### 4. Test SMTP/IMAP Setup

For custom email providers:
1. Click **Add Email Account** > **Custom SMTP/IMAP**
2. Enter your email server details
3. Test the connection

## Common SMTP/IMAP Settings

### Gmail (Custom Setup)
- SMTP: smtp.gmail.com:587 (TLS)
- IMAP: imap.gmail.com:993 (SSL)
- Requires app password instead of regular password

### Outlook/Hotmail
- SMTP: smtp-mail.outlook.com:587 (TLS)
- IMAP: outlook.office365.com:993 (SSL)

### Yahoo Mail
- SMTP: smtp.mail.yahoo.com:587 (TLS)
- IMAP: imap.mail.yahoo.com:993 (SSL)

## Security Considerations

### 1. Credential Encryption

- All email credentials are encrypted using AES-256-GCM
- Encryption keys should be kept secure and never committed to version control

### 2. OAuth Token Management

- Access tokens are automatically refreshed when expired
- Refresh tokens are securely stored and encrypted

### 3. Rate Limiting

- Email API calls are subject to provider rate limits
- The system handles rate limiting gracefully

## Troubleshooting

### Common Issues

1. **OAuth Error: redirect_uri_mismatch**
   - Ensure redirect URIs in your OAuth configuration match exactly
   - Check for trailing slashes and protocol (http vs https)

2. **Gmail API Quota Exceeded**
   - Gmail has daily API quotas
   - Consider upgrading to paid tier for higher limits

3. **SMTP Authentication Failed**
   - For Gmail, use app passwords instead of regular passwords
   - Ensure "Less secure app access" is enabled (if applicable)

4. **Missing Scopes**
   - Ensure all required scopes are added to your OAuth consent screen
   - Users may need to re-authorize if scopes change

### Debugging

Enable debug logging by setting:

```bash
LOG_LEVEL=debug
```

Check application logs for detailed error messages during OAuth flows and email operations.

## Feature Limitations

### Current Version

- **Supported Providers**: Gmail, Outlook, Custom SMTP/IMAP
- **Email Sync**: Manual and scheduled sync (no real-time push notifications yet)
- **Attachments**: Basic attachment support
- **Threading**: Email threading support for Gmail

### Future Enhancements

- Real-time email notifications via webhooks
- Advanced email filtering and rules
- Email templates with rich formatting
- Bulk email operations
- Email analytics and tracking

## Support

For issues with email integration:

1. Check the application logs
2. Verify environment variables are set correctly
3. Test OAuth flows in browser developer tools
4. Consult provider documentation for API limits and requirements

## API Documentation

The email integration exposes these API endpoints:

- `GET /api/email/accounts` - List email accounts
- `POST /api/email/accounts` - Create email account
- `GET /api/email/oauth/{provider}` - Initiate OAuth flow
- `POST /api/email/send` - Send email
- `GET /api/email/messages` - List messages
- `POST /api/email/accounts/{id}/sync` - Sync account

See the individual route files for detailed API documentation.