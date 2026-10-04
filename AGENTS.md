# AGENTS.md
## 1. How the product works
Interface: a simple web app where a project head uploads a client brief (WhatsApp text or PDF) and one recent Excel costing sheet to generate a first-pass costing.
Business logic: the app reads the costing sheet with plain code (never AI), reads the brief with AI, structures the requirements into cost heads, maps them against the uploaded historical costing, and produces a defensible cost range with the source of each number visible. Every number shown comes from the sheet or from the project head's corrections; the AI never invents a figure. The project head can review and correct the result.
Database: after login only, the product remembers the uploaded brief and costing sheet, the structured requirements, mapped cost heads, generated costing, assumptions, contingencies, user corrections and the saved project state. Without login nothing is stored.
Third party: OpenAI API for reading and structuring the brief and suggesting the mapping to cost heads. The key OPENAI_API_KEY lives only in Convex environment variables, server side, never in the browser. Convex handles the database, backend functions, sign-in (Convex Auth) and hosting.
Not in v1: live vendor pricing, vendor integrations, voice notes, email ingestion, approved rate-sheet libraries, proposal export, negotiation workflows, approvals, client communication, or full end-to-end project management.
When I report a bug, I'll name the part. Look there first, and tell me if you think I named the wrong one.
## 2. How we work
- Read IDEA_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md before anything else, and DESIGN.md before any screen work.
- Before writing code, tell me in two or three sentences what you think I'm after, then your plan. Wait for my yes. Don't guess.
- One milestone at a time, working end to end. Nothing outside it.
- If I ask for something new mid-milestone, add it to a parked list in PLAN.md and carry on.
- Never say done until you've seen it work and told me how to check it on my phone.
- When I report a bug, find the cause before changing anything. Fix only that.
- When we add something new, write tests so what already works doesn't break.
- Build and test only in the web app.
- After I confirm a milestone works: commit, push, and add one line to PROGRESS.md.
- Never put a key or password in code, in a VITE_ variable or in a committed file.
- Never save an uploaded Excel or brief file inside the project folder.
## 3. Shipping
Live link: (fill after first deploy)
Repo: [read the GitHub address from this folder's git remote and write it here], public
Deploy: npm run deploy. A push never deploys by itself. After I say a milestone works: commit, push, then deploy.
Keys: OPENAI_API_KEY lives in Convex environment variables, set for dev and for prod. Never in code, a VITE_ variable or a committed file. Never ask me to paste it into chat.
.gitignore covers .env.local.
Real people's data (briefs, costing sheets, names) never goes in the repo, not even as a test file. Tests use made-up examples.
