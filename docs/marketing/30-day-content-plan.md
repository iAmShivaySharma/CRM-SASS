# 30-Day Build In Public — Content Plan

No selling. No "link in bio." Just showing what you're building, why, and what you learned. Let people discover the product themselves.

---

## WEEK 1: Why I Started This

### Day 1 — The Frustration
**Text:**
"spent 3 hours today trying to sync data between our CRM and project tool. again.

lead closed → manually create project in asana → copy client details → add team members → set up slack channel → update spreadsheet

every. single. time.

started wondering why these aren't just one thing. so i'm building it."

**Image:** Photo of your actual desk/setup. Messy is fine. Real > polished.

---

### Day 2 — The Real Cost
**Text:**
"added up what our 10 person team pays for software every month.

salesforce: $750
monday: $160
slack: $120
bamboohr: $80
mailchimp: $100
zapier: $50

$1,260/month. for tools that don't talk to each other.

not complaining about the tools. they're great individually. just questioning why i need six of them."

**Image:** Handwritten note or whiteboard with the actual math. Not a designed graphic.

---

### Day 3 — First Ugly Version
**Text:**
"here's what the first version looked like 6 months ago vs today.

the left screenshot makes me cringe. but i shipped it. and someone used it. and they told me what was wrong.

that feedback loop built the thing on the right.

lesson: if your v1 doesn't embarrass you, you shipped too late."

**Image:** Actual side-by-side — old ugly UI vs current clean UI.

---

### Day 4 — The Boring Work
**Text:**
"pushed 115 files today. zero new features.

just fixed colors. hover states. dark mode. text that was invisible on dark backgrounds. buttons where the icon didn't change color.

nobody will ever tweet 'wow the hover state on the dropdown is perfect.'

but they'll leave if it feels broken."

**Image:** Git diff summary — "106 files changed." That's the whole image.

---

### Day 5 — Debugging Story
**Text:**
"spent 4 hours debugging why the app crashed when someone sent the first message in a new chat room.

the error: 'cannot read property split of undefined'

the cause: socket server wasn't sending the user's name. so when the UI tried to get initials from the name... boom.

the fix: one line. literally one line.

4 hours for one line. and that's fine."

**Image:** Screenshot of the actual error + the one-line fix diff.

---

### Day 6 — What I Use To Build
**Text:**
"people ask about the stack so here it is.

next.js because i like react and don't want a separate backend.
mongodb because documents make sense for CRM data.
socket.io because chat needs to be real-time.
redis because some things need to be fast.
docker because 'works on my machine' isn't good enough.

no fancy reason. just what i know and what works."

**Image:** Your actual VS Code with the project open. Not a designed graphic.

---

### Day 7 — Week 1 Honest Numbers
**Text:**
"week 1 of building in public.

commits: 23
files changed: 200+
bugs fixed: 11
features added: 0
hours worked: ~40
users gained from posting: 0

and that's fine. nobody owes me attention for doing my job.

back to work."

**Image:** GitHub contribution graph for the week. Nothing fancy.

---

## WEEK 2: The Hard Parts Nobody Talks About

### Day 8 — Multi-Tenancy Pain
**Text:**
"every single database query in this app has a workspaceId filter.

every. single. one.

miss one and customer A sees customer B's data. there's no 'oops, we'll fix it later' for that.

it's the least exciting code i write. and the most important."

**Image:** Code snippet showing a query with workspaceId. Or a simple diagram of data isolation.

---

### Day 9 — The DNS Bug
**Text:**
"app wouldn't connect to the database. worked fine yesterday.

spent 2 hours thinking it was a code problem. wrong.

jio (indian ISP) doesn't resolve mongodb SRV DNS records. their DNS just... doesn't support it.

fix: switch from mongodb+srv:// to the standard connection string.

sometimes the bug isn't in your code."

**Image:** Terminal screenshot showing the DNS error + the fix.

---

### Day 10 — Security Isn't Optional
**Text:**
"ran a security audit on my own code today. found:

- containers running as root
- no error boundary (unhandled crash = white screen)
- console.log leaking data in production
- trivy scan was report-only, didn't actually block builds
- no env validation (app would silently run with missing secrets)

fixed all of it in one PR. should've done it on day 1.

if you're building SaaS and haven't audited your own security... do it this week."

**Image:** PR description showing all the fixes. Real screenshot.

---

### Day 11 — Users Don't Care About Your Stack
**Text:**
"had a call with a user today. agency owner. 12 people.

she didn't ask what database i use.
she didn't ask about my deployment pipeline.
she didn't care about dark mode.

she asked: 'can i see which leads my team hasn't followed up with this week?'

that's the only question that matters."

**Image:** None. Text-only post. Let it breathe.

---

### Day 12 — The Feature I Almost Built Wrong
**Text:**
"was about to build whatsapp and telecmi calling as separate microservices.

separate repos. separate databases. separate deployments. API gateway. inter-service auth.

then i looked at what i already have. email integration is 15 files inside the main app. chat is 20 files. webhooks are 10 files. all working fine.

adding telecmi (17 files) and whatsapp (20 files) the same way made way more sense.

the urge to over-engineer is real. fight it."

**Image:** The two architecture diagrams — microservice (complex) vs monolith (simple).

---

### Day 13 — How I Handle Credentials
**Text:**
"every third-party API key in this app is encrypted with AES-256-GCM before hitting the database.

the format: iv:authTag:encryptedData

even if someone gets database access, they can't read the keys without the encryption secret.

it's not hard to implement. the crypto module is built into node.js. there's no excuse for storing API keys in plain text in 2026."

**Image:** Code snippet of the encrypt/decrypt method (no actual keys obviously).

---

### Day 14 — Week 2 Reflection
**Text:**
"week 2.

best moment: user said 'this is exactly what i was looking for'
worst moment: debugging a CSS hover state for 3 hours
surprising moment: a post about DNS bugs got more engagement than any feature demo

people relate to struggle more than success. noted."

**Image:** Screenshot of the user message (redacted). Or just your notes app with the reflection.

---

## WEEK 3: Building The Hard Stuff

### Day 15 — Planning The WhatsApp Integration
**Text:**
"mapping out whatsapp business integration today.

3 new database models
7 API routes
7 UI components
webhook receiver for incoming messages
24-hour messaging window handling
phone number matching to auto-link conversations to leads

wrote the entire plan before touching code. 300 lines of markdown.

the plan will change. but having one means i know when i'm going off track."

**Image:** Screenshot of the plan doc. Show the architecture diagram.

---

### Day 16 — The 24-Hour Rule
**Text:**
"TIL whatsapp business has a 24-hour rule.

you can only send free-form messages within 24 hours of the customer's last message. after that, only pre-approved templates.

meta's way of preventing spam. annoying for developers. good for users.

had to build:
- window expiry tracking per conversation
- auto-disable of message input after 24h
- template picker that appears when window expires

the business logic is harder than the API integration."

**Image:** Simple diagram of the 24-hour window flow.

---

### Day 17 — Real-Time Is Hard
**Text:**
"getting whatsapp messages to appear in real-time without refresh.

webhook receives message → save to db → emit socket event → update conversation list → scroll to bottom in chat thread

sounds simple. 5 things that can go wrong:
1. webhook times out
2. socket disconnects
3. wrong conversation gets updated
4. message order gets mixed up
5. unread count doesn't decrement

real-time is a feature that's 90% edge cases."

**Image:** Whiteboard drawing of the real-time flow. Hand-drawn > designed.

---

### Day 18 — Phone Number Matching
**Text:**
"a customer messages your whatsapp number. how do you know which lead it is?

phone numbers come in formats like:
+919876543210
919876543210
09876543210
9876543210

all the same number. all stored differently.

wrote a normalizer that strips everything and matches the last 10 digits. works for 90% of cases.

the other 10% is international numbers with variable lengths. that's next week's problem."

**Image:** Code snippet of the phone normalizer function.

---

### Day 19 — When Users Surprise You
**Text:**
"built the CRM for sales teams.

a coaching business is using it to track clients.
a real estate team uses it for property leads.
an NGO uses it to manage donor relationships.

never designed for any of these. they made it work.

the lesson: build the tool, not the use case. let users figure out the rest."

**Image:** None. Text only.

---

### Day 20 — The Encryption Decision
**Text:**
"storing whatsapp access tokens in the database.

option 1: plain text. easy. dangerous.
option 2: hash it. can't decrypt. useless.
option 3: AES-256-GCM encryption. can decrypt when needed. secure at rest.

went with option 3. same pattern i already use for email credentials and API keys.

copy-pasted the encryption logic from another model. consistency over cleverness. every time."

**Image:** Simplified diagram: plaintext → encrypt → store → decrypt → use.

---

### Day 21 — Week 3
**Text:**
"three weeks in.

what's working: technical posts. developers save them. founders share them.
what's not working: feature screenshots. nobody cares what your dropdown looks like.
what surprised me: the most relatable posts are about mistakes.

lesson: the internet has enough product screenshots. share what you learned the hard way."

**Image:** Your analytics. Real numbers. Even if they're small.

---

## WEEK 4: Reflection + What's Next

### Day 22 — The Competitor Question
**Text:**
"'aren't you scared of hubspot?'

i get this a lot.

hubspot has 7,000 employees. $2B revenue. 20 years of head start.

but hubspot costs $800/month for a team of 10. mine costs $29.

i'm not competing with hubspot. i'm competing with the spreadsheet. the whatsapp group. the sticky note on someone's monitor.

most small businesses aren't choosing between me and hubspot. they're choosing between me and nothing."

**Image:** None. This is a text post.

---

### Day 23 — Things I Got Wrong
**Text:**
"things i got wrong building this:

1. built dark mode as an afterthought. had to fix 150+ hardcoded colors later.
2. didn't add error boundaries until month 6. users saw white screens.
3. used console.log everywhere. leaked data in production logs.
4. stored the mongodb connection string as SRV. broke on half of indian ISPs.
5. thought i needed microservices. i didn't.

would've saved 3 weeks if i got these right from the start.

sharing so you don't repeat them."

**Image:** None or a simple numbered list on a dark background.

---

### Day 24 — What I'd Tell Myself 6 Months Ago
**Text:**
"if i could go back 6 months:

- add workspaceId to every model on day 1
- use theme tokens instead of hardcoded colors
- set up CI/CD before writing features
- write the security audit checklist before launch
- don't build features nobody asked for
- ship ugly. fix pretty.

the best code i've written this month was deleting code i wrote 3 months ago."

**Image:** Photo of a notebook with these points handwritten. Personal touch.

---

### Day 25 — The Revenue Post
**Text:**
"honest revenue update.

month 1: $0
month 2: $87
month 3: $290
month 4: $580
month 5: $1,100
month 6 (now): $2,300

not quitting my day job yet. but the curve is going up.

no ads. no sales team. just the product and these posts.

slow is fine. dead is not."

**Image:** Hand-drawn or simple chart showing the growth curve. Not a polished graphic.

---

### Day 26 — How I Decide What To Build Next
**Text:**
"my feature prioritization:

1. is a user asking for it? (not 'would users want this' — is someone actually asking)
2. does it reduce churn or increase activation?
3. can i build it in under a week?
4. does it make the existing experience better or just wider?

if it passes all 4: build it.
if it passes 1-2: add to backlog.
if it passes 0: it's a distraction.

right now: whatsapp integration passes all 4. dark mode hover states passed 2 and 4. both got built."

**Image:** Your actual task board or notes showing the prioritization.

---

### Day 27 — The Loneliness Post
**Text:**
"building alone is lonely.

no co-founder to bounce ideas off. no team standup. no one to tell me 'that's a bad idea' before i waste a week on it.

the build-in-public community helps. but it's not the same as someone who has context on your codebase, your users, your revenue.

if you're building solo: find one person. doesn't have to be a co-founder. just someone who'll tell you the truth."

**Image:** None. Raw text.

---

### Day 28 — What Users Actually Use
**Text:**
"built 15 modules. here's what people actually use daily:

1. lead pipeline (100% of users)
2. team chat (80%)
3. contacts (70%)
4. projects (60%)
5. email (40%)
6. HR/attendance (30%)
7. AI workflows (20%)
8. webhooks (15%)

built from bottom up. should've built from top down.

the top 3 are where 90% of value is. everything else is nice to have."

**Image:** Simple bar chart. Hand-drawn or minimal design.

---

### Day 29 — What's Next
**Text:**
"august plan:

ship whatsapp business integration
ship telecmi click-to-call
start mobile app (react native)
email sequences v1

september plan:
stripe integration for invoicing
customer portal
AI sales copilot

i'll keep posting what actually happens. plans are guesses. execution is truth."

**Image:** Your actual planning doc or notion/notes screenshot.

---

### Day 30 — One Month
**Text:**
"30 days of sharing what i'm building.

what i shipped: dark mode overhaul, security hardening, error boundaries, chatwoot integration, 11 crash bug fixes, whatsapp + telecmi integration plans

what i learned: people don't care about features. they care about the story behind the feature. the bug that took 4 hours. the architecture decision you almost got wrong. the revenue number that's embarrassingly small.

this isn't marketing. it's just... working with the garage door open.

see you in month 2."

**Image:** A photo of you. Working. Real. Not posed.

---

## Rules

1. Never say "link in bio"
2. Never say "check it out" or "try it free"
3. Never use emojis in body text (one or two max in entire post)
4. Never use bullet points with checkmarks for feature lists
5. Write lowercase. it feels more honest.
6. If the post sounds like an ad, delete it and start over
7. Real screenshots > designed graphics
8. Handwritten > Canva
9. Silence is better than filler
10. If you didn't learn something that day, don't post

## Posting
- LinkedIn: 8-9 AM on weekdays
- X: same + evening thread for technical posts
- Instagram: only for video demos (2-3 per month)
- No hashtags. No tag chains. Write for humans.
