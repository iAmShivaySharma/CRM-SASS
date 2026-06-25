import emailWorker from './workers/emailWorker'
import notificationWorker from './workers/notificationWorker'
import activityWorker from './workers/activityWorker'
import webhookWorker from './workers/webhookWorker'

export function initializeWorkers() {
  return [emailWorker, notificationWorker, activityWorker, webhookWorker]
}

export async function shutdownWorkers() {
  await Promise.all([
    emailWorker.close(),
    notificationWorker.close(),
    activityWorker.close(),
    webhookWorker.close(),
  ])
}
