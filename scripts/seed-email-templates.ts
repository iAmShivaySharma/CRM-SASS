import { connectToMongoDB } from '@/lib/mongodb'
import { EmailTemplate } from '@/lib/mongodb/models'

const defaultTemplates = [
  {
    name: 'Welcome Email',
    subject: 'Welcome to {{workspace_name}}!',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to {{workspace_name}}!</h1>
        <p>Hi {{recipient_name}},</p>
        <p>We're excited to have you on board! This email confirms that your account has been created successfully.</p>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>{{sender_name}}</p>
      </div>
    `,
    bodyText: `
      Welcome to {{workspace_name}}!

      Hi {{recipient_name}},

      We're excited to have you on board! This email confirms that your account has been created successfully.

      If you have any questions, feel free to reach out to our support team.

      Best regards,
      {{sender_name}}
    `,
    category: 'welcome',
    isSystem: true,
    variables: [
      { name: 'workspace_name', description: 'Name of the workspace', required: true },
      { name: 'recipient_name', description: 'Name of the email recipient', required: true },
      { name: 'sender_name', description: 'Name of the email sender', required: true }
    ]
  },
  {
    name: 'Follow-up Email',
    subject: 'Following up on our conversation',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Following up on our conversation</h2>
        <p>Hi {{recipient_name}},</p>
        <p>I wanted to follow up on our recent conversation about {{topic}}.</p>
        <p>{{custom_message}}</p>
        <p>Please let me know if you have any questions or if there's anything else I can help you with.</p>
        <p>Best regards,<br>{{sender_name}}</p>
      </div>
    `,
    bodyText: `
      Following up on our conversation

      Hi {{recipient_name}},

      I wanted to follow up on our recent conversation about {{topic}}.

      {{custom_message}}

      Please let me know if you have any questions or if there's anything else I can help you with.

      Best regards,
      {{sender_name}}
    `,
    category: 'follow-up',
    isSystem: true,
    variables: [
      { name: 'recipient_name', description: 'Name of the email recipient', required: true },
      { name: 'topic', description: 'Topic of the previous conversation', required: true },
      { name: 'custom_message', description: 'Custom message content', required: false },
      { name: 'sender_name', description: 'Name of the email sender', required: true }
    ]
  },
  {
    name: 'Meeting Request',
    subject: 'Meeting Request: {{meeting_topic}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Meeting Request</h2>
        <p>Hi {{recipient_name}},</p>
        <p>I would like to schedule a meeting to discuss {{meeting_topic}}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Meeting Details:</strong><br>
          📅 Date: {{meeting_date}}<br>
          ⏰ Time: {{meeting_time}}<br>
          ⏱️ Duration: {{meeting_duration}}<br>
          📍 Location: {{meeting_location}}
        </div>
        <p>{{custom_message}}</p>
        <p>Please let me know if this time works for you or if you'd prefer to reschedule.</p>
        <p>Best regards,<br>{{sender_name}}</p>
      </div>
    `,
    bodyText: `
      Meeting Request

      Hi {{recipient_name}},

      I would like to schedule a meeting to discuss {{meeting_topic}}.

      Meeting Details:
      Date: {{meeting_date}}
      Time: {{meeting_time}}
      Duration: {{meeting_duration}}
      Location: {{meeting_location}}

      {{custom_message}}

      Please let me know if this time works for you or if you'd prefer to reschedule.

      Best regards,
      {{sender_name}}
    `,
    category: 'meeting',
    isSystem: true,
    variables: [
      { name: 'recipient_name', description: 'Name of the email recipient', required: true },
      { name: 'meeting_topic', description: 'Topic of the meeting', required: true },
      { name: 'meeting_date', description: 'Date of the meeting', required: true },
      { name: 'meeting_time', description: 'Time of the meeting', required: true },
      { name: 'meeting_duration', description: 'Duration of the meeting', required: false },
      { name: 'meeting_location', description: 'Location of the meeting', required: false },
      { name: 'custom_message', description: 'Custom message content', required: false },
      { name: 'sender_name', description: 'Name of the email sender', required: true }
    ]
  },
  {
    name: 'Thank You Email',
    subject: 'Thank you for your time',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Thank you!</h2>
        <p>Hi {{recipient_name}},</p>
        <p>Thank you for taking the time to {{reason}}. I really appreciate your {{appreciation_detail}}.</p>
        <p>{{custom_message}}</p>
        <p>I look forward to {{next_steps}}.</p>
        <p>Best regards,<br>{{sender_name}}</p>
      </div>
    `,
    bodyText: `
      Thank you!

      Hi {{recipient_name}},

      Thank you for taking the time to {{reason}}. I really appreciate your {{appreciation_detail}}.

      {{custom_message}}

      I look forward to {{next_steps}}.

      Best regards,
      {{sender_name}}
    `,
    category: 'thank-you',
    isSystem: true,
    variables: [
      { name: 'recipient_name', description: 'Name of the email recipient', required: true },
      { name: 'reason', description: 'Reason for thanking', required: true },
      { name: 'appreciation_detail', description: 'Specific detail being appreciated', required: false },
      { name: 'custom_message', description: 'Custom message content', required: false },
      { name: 'next_steps', description: 'Next steps or future plans', required: false },
      { name: 'sender_name', description: 'Name of the email sender', required: true }
    ]
  },
  {
    name: 'Project Update',
    subject: 'Project Update: {{project_name}}',
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Project Update: {{project_name}}</h2>
        <p>Hi {{recipient_name}},</p>
        <p>I wanted to provide you with an update on the {{project_name}} project.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Progress Summary</h3>
          <p><strong>Status:</strong> {{project_status}}</p>
          <p><strong>Completion:</strong> {{completion_percentage}}%</p>
          <p><strong>Next Milestone:</strong> {{next_milestone}}</p>
        </div>

        <p>{{update_details}}</p>

        <p>If you have any questions or concerns, please don't hesitate to reach out.</p>

        <p>Best regards,<br>{{sender_name}}</p>
      </div>
    `,
    bodyText: `
      Project Update: {{project_name}}

      Hi {{recipient_name}},

      I wanted to provide you with an update on the {{project_name}} project.

      Progress Summary:
      Status: {{project_status}}
      Completion: {{completion_percentage}}%
      Next Milestone: {{next_milestone}}

      {{update_details}}

      If you have any questions or concerns, please don't hesitate to reach out.

      Best regards,
      {{sender_name}}
    `,
    category: 'project',
    isSystem: true,
    variables: [
      { name: 'recipient_name', description: 'Name of the email recipient', required: true },
      { name: 'project_name', description: 'Name of the project', required: true },
      { name: 'project_status', description: 'Current status of the project', required: true },
      { name: 'completion_percentage', description: 'Percentage of project completion', required: false },
      { name: 'next_milestone', description: 'Next project milestone', required: false },
      { name: 'update_details', description: 'Detailed update information', required: false },
      { name: 'sender_name', description: 'Name of the email sender', required: true }
    ]
  }
]

export async function seedEmailTemplates() {
  try {
    await connectToMongoDB()

    console.log('🌱 Seeding email templates...')

    for (const template of defaultTemplates) {
      const existing = await EmailTemplate.findOne({
        name: template.name,
        isSystem: true
      })

      if (!existing) {
        await EmailTemplate.create({
          ...template,
          isActive: true,
          stats: {
            timesUsed: 0
          }
        })
        console.log(`✅ Created template: ${template.name}`)
      } else {
        console.log(`⏭️  Template already exists: ${template.name}`)
      }
    }

    console.log('🎉 Email templates seeding completed!')
  } catch (error) {
    console.error('❌ Error seeding email templates:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedEmailTemplates().then(() => {
    console.log('✅ Email templates seeded successfully')
    process.exit(0)
  }).catch((error) => {
    console.error('❌ Failed to seed email templates:', error)
    process.exit(1)
  })
}