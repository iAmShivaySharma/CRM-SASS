import { Worker } from 'bullmq'
import { Resend } from 'resend'
import { getQueueConnection } from '../connection'

const resend = new Resend(process.env.RESEND_API_KEY)

const emailWorker = new Worker(
  'email',
  async job => {
    const { to, subject, html, from, replyTo } = job.data

    const result = await resend.emails.send({
      from: from || process.env.EMAIL_FROM_ADDRESS || 'noreply@yourdomain.com',
      to,
      subject,
      html,
      ...(replyTo && { replyTo }),
    })

    return { messageId: result.data?.id }
  },
  {
    connection: getQueueConnection(),
    concurrency: 10,
    limiter: {
      max: 50,
      duration: 1000,
    },
  }
)

export default emailWorker
