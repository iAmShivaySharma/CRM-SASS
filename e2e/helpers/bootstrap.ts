import { execFileSync } from 'child_process'
import { API_URL, AUTH_CONTAINER, TEST_USER } from './env'

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

function confirmEmailInDb(email: string) {
  const script = `const m=require("mongoose");m.connect(process.env.MONGODB_URI).then(async()=>{const r=await m.connection.db.collection("users").updateOne({email:${JSON.stringify(email)}},{$set:{emailConfirmed:true,emailConfirmedAt:new Date()},$unset:{emailVerificationOtp:1,emailVerificationExpires:1}});console.log(r.matchedCount);process.exit(0)})`
  return execFileSync('docker', ['exec', AUTH_CONTAINER, 'node', '-e', script], { encoding: 'utf8' }).trim()
}

export function resetDailyState(email: string) {
  const script = `const m=require("mongoose");m.connect(process.env.MONGODB_URI).then(async()=>{const db=m.connection.db;const u=await db.collection("users").findOne({email:${JSON.stringify(email)}});if(!u){console.log(0);process.exit(0)}const d=new Date();d.setHours(0,0,0,0);const r=await db.collection("attendances").deleteMany({userId:{$in:[u._id,String(u._id)]},date:{$gte:d}});console.log(r.deletedCount);process.exit(0)})`
  return execFileSync('docker', ['exec', AUTH_CONTAINER, 'node', '-e', script], { encoding: 'utf8' }).trim()
}

export async function ensureTestUser() {
  const login = await post('/api/auth/login', { email: TEST_USER.email, password: TEST_USER.password })
  if (login.status === 200) return 'existing'

  const signup = await post('/api/auth/signup', TEST_USER)
  if (signup.status !== 201 && signup.status !== 400) {
    throw new Error(`signup failed: ${signup.status} ${JSON.stringify(signup.data)}`)
  }

  const matched = confirmEmailInDb(TEST_USER.email)
  if (matched !== '1') throw new Error(`could not confirm e2e user in db (matched=${matched})`)

  const retry = await post('/api/auth/login', { email: TEST_USER.email, password: TEST_USER.password })
  if (retry.status !== 200) throw new Error(`login after bootstrap failed: ${retry.status} ${JSON.stringify(retry.data)}`)
  return 'created'
}
