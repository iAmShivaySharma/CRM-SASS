# 📧 Complete Email Module Guide

A comprehensive guide for developers and users to set up and use the CRM email integration system.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Developer Setup](#developer-setup)
3. [External Service Configuration](#external-service-configuration)
4. [User Guide](#user-guide)
5. [Troubleshooting](#troubleshooting)
6. [API Reference](#api-reference)

---

## 🔍 Overview

The CRM Email Module allows users to:
- **Connect multiple email accounts** (Gmail, Outlook, Custom SMTP/IMAP)
- **Send emails directly from CRM** with contact/lead context
- **Use email templates** for consistent communications
- **Sync emails automatically** to maintain conversation history
- **Link emails to CRM records** (leads, contacts, projects, tasks)

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User's Email  │    │   CRM System    │    │  Email Provider │
│    Accounts     │◄──►│  (Your App)     │◄──►│ (Gmail/Outlook) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │    Database     │
                       │ (Email Storage) │
                       └─────────────────┘
```

---

## 🛠️ Developer Setup

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ MongoDB running
- ✅ CRM application already set up
- ✅ Google Cloud Console access (for Gmail)
- ✅ Microsoft Azure Portal access (for Outlook)

### Step 1: Install Dependencies

The required packages are already installed:
```bash
# Core email libraries
npm install nodemailer googleapis @microsoft/microsoft-graph-client imap mailparser

# Type definitions
npm install @types/nodemailer @types/imap
```

### Step 2: Environment Variables

Add these to your `.env` file:

```bash
# 🔐 Email Encryption (Generate new keys)
EMAIL_ENCRYPTION_SECRET=your_64_character_hex_key

# 🔑 Google OAuth (Gmail Integration)
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback/google

# 🔑 Microsoft OAuth (Outlook Integration)
MICROSOFT_OAUTH_CLIENT_ID=your_microsoft_client_id
MICROSOFT_OAUTH_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback/microsoft

# 📧 Resend (System Emails - Already configured)
RESEND_API_KEY=re_your_resend_api_key
```

**Generate Encryption Key:**
```bash
node -e "console.log('EMAIL_ENCRYPTION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Database Setup

Seed email templates:
```bash
npm run db:seed-email-templates
```

### Step 4: Verify Installation

Start your development server:
```bash
npm run dev
```

Navigate to: `http://localhost:3000/email`

You should see the email interface with an "Add Email Account" option.

---

## 🌐 External Service Configuration

### Google Cloud Console (Gmail Integration)

#### 1. Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Note your project ID

#### 2. Enable APIs
Navigate to **APIs & Services > Library** and enable:
- ✅ Gmail API
- ✅ Google OAuth2 API

#### 3. Configure OAuth Consent Screen
Go to **APIs & Services > OAuth consent screen**:

**Basic Information:**
- User Type: `External`
- App name: `Your CRM Name`
- User support email: `your-support@email.com`
- Developer contact: `your-dev@email.com`

**Scopes (Add these):**
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

**Test Users (for development):**
- Add your Gmail addresses for testing

#### 4. Create OAuth Credentials
Go to **APIs & Services > Credentials**:

1. Click **Create Credentials > OAuth client ID**
2. Application type: `Web application`
3. Name: `CRM Gmail Integration`
4. **Authorized redirect URIs:**
   - Development: `http://localhost:3000/auth/callback/google`
   - Production: `https://yourdomain.com/auth/callback/google`

5. Copy **Client ID** and **Client Secret** to your `.env` file

### Microsoft Azure Portal (Outlook Integration)

#### 1. Register Application
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory > App registrations**
3. Click **New registration**

**Configuration:**
- Name: `CRM Outlook Integration`
- Supported account types: `Accounts in any organizational directory and personal Microsoft accounts`
- Redirect URI: `Web` with `http://localhost:3000/auth/callback/microsoft`

#### 2. Configure API Permissions
In your app registration, go to **API permissions**:

1. Click **Add a permission > Microsoft Graph**
2. Choose **Delegated permissions**
3. Add these permissions:
   - ✅ `Mail.Read`
   - ✅ `Mail.Send`
   - ✅ `Mail.ReadWrite`
   - ✅ `User.Read`

4. Click **Grant admin consent** (if you're admin)

#### 3. Create Client Secret
1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description and set expiration
4. Copy the **Value** (not Secret ID) to your `.env` file

#### 4. Note Application Details
- Copy **Application (client) ID** as `MICROSOFT_OAUTH_CLIENT_ID`

### Production Configuration

**Update redirect URIs for production:**
- Google: `https://yourdomain.com/auth/callback/google`
- Microsoft: `https://yourdomain.com/auth/callback/microsoft`

**Update .env for production:**
```bash
GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/callback/google
MICROSOFT_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/callback/microsoft
```

---

## 👥 User Guide

### Getting Started

#### 1. Access Email Module
1. Log into your CRM
2. Click **📧 Email** in the sidebar
3. You'll see the email interface

#### 2. Connect Your First Email Account

**Option A: Gmail via OAuth**
1. Click **Add Email Account**
2. Select **Gmail**
3. Click **Connect with Google**
4. Authorize the CRM to access your Gmail
5. Your Gmail account is now connected!

**Option B: Outlook via OAuth**
1. Click **Add Email Account**
2. Select **Outlook**
3. Click **Connect with Microsoft**
4. Authorize the CRM to access your Outlook
5. Your Outlook account is now connected!

**Option C: Custom SMTP/IMAP**
1. Click **Add Email Account**
2. Select **Custom SMTP/IMAP**
3. Fill in your email server details:
   ```
   Display Name: My Work Email
   Email Address: you@company.com

   SMTP Settings:
   Host: smtp.company.com
   Port: 587
   Security: TLS
   Username: you@company.com
   Password: your_password

   IMAP Settings (for receiving):
   Host: imap.company.com
   Port: 993
   Security: SSL
   Username: you@company.com
   Password: your_password
   ```

### Using Email Features

#### Composing Emails

**Basic Email:**
1. Click **Compose** button
2. Fill in recipient, subject, message
3. Click **Send**

**Using Templates:**
1. Click **Compose**
2. Click **Use Template**
3. Select from available templates:
   - Welcome Email
   - Follow-up Email
   - Meeting Request
   - Thank You Email
   - Project Update
4. Template auto-fills with contact/lead data
5. Review and edit as needed
6. Click **Send**

**From Lead/Contact Context:**
1. Go to any Lead or Contact page
2. Click **Send Email** button
3. Email compose opens with recipient pre-filled
4. Template variables auto-populate with lead/contact data

#### Managing Email Accounts

**Set Default Account:**
1. Go to Email module
2. Click **⋮** menu on account
3. Select **Set as Default**

**Sync Emails:**
1. Click **⋮** menu on account
2. Select **Sync Now**
3. Recent emails will be imported

**Account Settings:**
1. Click **⋮** menu on account
2. Select **Settings**
3. Configure:
   - Sync frequency (5-1440 minutes)
   - Email signature
   - Auto-reply settings

#### Email Organization

**Folders:**
- **Inbox**: Received emails
- **Sent**: Emails you've sent
- **Drafts**: Unsent email drafts
- **Starred**: Important emails
- **Archive**: Archived emails
- **Trash**: Deleted emails

**Linking to CRM:**
1. Open any email
2. Click **Link to CRM**
3. Choose:
   - Lead
   - Contact
   - Project
   - Task
4. Email is now linked and shows in CRM record

**Email Actions:**
- ⭐ **Star/Unstar**: Mark important emails
- 📁 **Move**: Change folder
- 🔗 **Link**: Connect to CRM records
- ↩️ **Reply**: Respond to email
- ↪️ **Forward**: Forward to others
- 🗑️ **Delete**: Move to trash

### Email Templates

#### Using Templates

**Template Variables:**
Templates use `{{variable_name}}` format. Common variables:
- `{{recipient_name}}` - Contact's name
- `{{company_name}}` - Contact's company
- `{{sender_name}}` - Your name
- `{{workspace_name}}` - Your CRM workspace
- `{{meeting_date}}` - Meeting date
- `{{project_name}}` - Project name

**Auto-Fill Magic:**
When you use a template from a lead/contact page, the CRM automatically fills in available information from the contact's record.

#### Creating Custom Templates

1. Compose an email with your desired content
2. Use variables like `{{contact_name}}` for dynamic content
3. Click **Save as Template**
4. Name your template and select category
5. Template is now available for future use

### Common SMTP/IMAP Settings

**Gmail (with App Password):**
```
SMTP: smtp.gmail.com:587 (TLS)
IMAP: imap.gmail.com:993 (SSL)
Note: Use App Password, not regular password
```

**Outlook/Hotmail:**
```
SMTP: smtp-mail.outlook.com:587 (TLS)
IMAP: outlook.office365.com:993 (SSL)
```

**Yahoo Mail:**
```
SMTP: smtp.mail.yahoo.com:587 (TLS)
IMAP: imap.mail.yahoo.com:993 (SSL)
```

**Office 365:**
```
SMTP: smtp.office365.com:587 (TLS)
IMAP: outlook.office365.com:993 (SSL)
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. OAuth "redirect_uri_mismatch" Error
**Problem:** OAuth fails with redirect URI error

**Solution:**
- Check redirect URI in Google/Microsoft console matches exactly
- Ensure no trailing slashes: `http://localhost:3000/auth/callback/google`
- Check http vs https protocol

#### 2. Gmail "Authentication Failed"
**Problem:** Cannot connect Gmail account

**Solutions:**
- Use App Password instead of regular password
- Enable 2-factor authentication first
- Generate App Password in Google Account settings
- Ensure Gmail API is enabled in Google Console

#### 3. SMTP "Connection Refused"
**Problem:** Custom SMTP setup fails

**Solutions:**
- Verify SMTP server settings with email provider
- Check firewall/network restrictions
- Try different ports (587, 465, 25)
- Verify TLS/SSL settings

#### 4. Emails Not Syncing
**Problem:** Recent emails don't appear in CRM

**Solutions:**
- Click "Sync Now" manually
- Check sync settings (may be disabled)
- Verify OAuth tokens haven't expired
- Check API rate limits

#### 5. Template Variables Not Working
**Problem:** `{{variable_name}}` doesn't get replaced

**Solutions:**
- Ensure variable name matches exactly (case-sensitive)
- Check that CRM record has the required data
- Verify template variable is defined in template settings

### Debug Mode

Enable detailed logging:
```bash
# Add to .env
LOG_LEVEL=debug
```

Check browser console and server logs for detailed error messages.

### Getting Help

1. **Check Logs**: Application logs show detailed error messages
2. **Test OAuth**: Use browser developer tools to inspect OAuth flows
3. **Verify Settings**: Double-check all environment variables
4. **Provider Docs**: Consult Gmail/Outlook API documentation for limits

---

## 📚 API Reference

### Key Endpoints

**Email Accounts:**
```http
GET    /api/email/accounts              # List accounts
POST   /api/email/accounts              # Create account
PUT    /api/email/accounts/{id}         # Update account
DELETE /api/email/accounts/{id}         # Delete account
POST   /api/email/accounts/{id}/sync    # Sync emails
POST   /api/email/accounts/{id}/test    # Test connection
```

**Email Messages:**
```http
GET    /api/email/messages              # List messages
GET    /api/email/messages/{id}         # Get message
PUT    /api/email/messages/{id}         # Update message
DELETE /api/email/messages/{id}         # Delete message
```

**Email Operations:**
```http
POST   /api/email/send                  # Send email
GET    /api/email/oauth/{provider}      # Start OAuth flow
```

### React Hooks (for developers)

```typescript
// Get email accounts
const { data: accounts } = useGetEmailAccountsQuery()

// Send email
const [sendEmail] = useSendEmailMutation()

// Get messages
const { data: messages } = useGetEmailMessagesQuery({
  accountId: 'account-id',
  folder: 'inbox'
})
```

---

## 🚀 Next Steps

### For Developers

1. **Set up OAuth credentials** in Google/Microsoft consoles
2. **Add environment variables** to `.env`
3. **Run email template seeding** script
4. **Test integration** with personal email accounts
5. **Deploy with production OAuth settings**

### For Users

1. **Connect your email accounts** using OAuth or SMTP
2. **Import existing email templates** or create custom ones
3. **Start sending personalized emails** directly from CRM
4. **Link emails to leads/contacts** for better relationship tracking
5. **Set up email sync** for automatic conversation history

### Advanced Features (Coming Soon)

- 📊 **Email Analytics**: Open rates, click tracking
- 🤖 **AI Email Suggestions**: Smart content recommendations
- 📅 **Email Scheduling**: Send emails at optimal times
- 🔄 **Email Sequences**: Automated follow-up campaigns
- 📱 **Mobile App**: Email access on mobile devices

---

## 🎯 Success Metrics

After setup, you should be able to:

✅ **Connect multiple email accounts** (Gmail, Outlook, Custom)
✅ **Send emails from CRM** with contact context
✅ **Use email templates** with auto-filled variables
✅ **Sync emails automatically** from connected accounts
✅ **Link emails to CRM records** for relationship tracking
✅ **Access email history** within lead/contact profiles

**Performance Benchmarks:**
- Email sending: < 3 seconds
- OAuth connection: < 30 seconds
- Email sync: < 60 seconds for 50 emails
- Template rendering: < 1 second

---

**Need Help?** Check the troubleshooting section or review the server logs for detailed error messages. The email module is designed to work seamlessly with your existing CRM workflow!