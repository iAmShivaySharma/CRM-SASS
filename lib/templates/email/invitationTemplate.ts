import { InvitationEmailData } from '@/lib/services/emailService'

export function getInvitationEmailTemplate(data: InvitationEmailData) {
  const subject = `You're invited to join ${data.workspaceName} workspace`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workspace Invitation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .content p {
            margin-bottom: 15px;
        }
        .invitation-details {
            background: #f3f4f6;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .invitation-details h3 {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 16px;
        }
        .invitation-details p {
            margin: 5px 0;
            color: #6b7280;
        }
        .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            text-align: center;
            margin: 20px 0;
        }
        .cta-button:hover {
            background: #2563eb;
        }
        .alternative-link {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            color: #6b7280;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .message-box {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .message-box p {
            margin: 0;
            color: #1e40af;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚀 CRM Workspace</div>
            <h1 class="title">You're invited to join a workspace!</h1>
        </div>

        <div class="content">
            <p>Hi there!</p>
            <p><strong>${data.inviterName}</strong> has invited you to join the <strong>${data.workspaceName}</strong> workspace.</p>

            <div class="invitation-details">
                <h3>📋 Invitation Details</h3>
                <p><strong>Workspace:</strong> ${data.workspaceName}</p>
                <p><strong>Role:</strong> ${data.roleName}</p>
                <p><strong>Invited by:</strong> ${data.inviterName}</p>
            </div>

            ${data.message ? `
            <div class="message-box">
                <p><strong>Personal message:</strong> "${data.message}"</p>
            </div>
            ` : ''}

            <p>Click the button below to accept the invitation and join the workspace:</p>

            <div style="text-align: center;">
                <a href="${data.acceptUrl}" class="cta-button">Accept Invitation</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
                If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <div class="alternative-link">
                ${data.acceptUrl}
            </div>

            <p style="font-size: 14px; color: #ef4444;">
                ⚠️ This invitation will expire in 7 days. Please accept it soon to avoid having to request a new invitation.
            </p>
        </div>

        <div class="footer">
            <p>This email was sent to ${data.email} because you were invited to join a workspace.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p style="margin-top: 15px;">
                <strong>CRM Workspace</strong><br>
                Helping teams manage their customer relationships better.
            </p>
        </div>
    </div>
</body>
</html>`

  const text = `
You're invited to join ${data.workspaceName} workspace!

Hi there!

${data.inviterName} has invited you to join the ${data.workspaceName} workspace.

Invitation Details:
- Workspace: ${data.workspaceName}
- Role: ${data.roleName}
- Invited by: ${data.inviterName}

${data.message ? `Personal message: "${data.message}"` : ''}

To accept this invitation, visit the following link:
${data.acceptUrl}

⚠️ This invitation will expire in 7 days. Please accept it soon to avoid having to request a new invitation.

This email was sent to ${data.email} because you were invited to join a workspace.
If you didn't expect this invitation, you can safely ignore this email.

CRM Workspace - Helping teams manage their customer relationships better.
`

  return { html, text, subject }
}

export default getInvitationEmailTemplate