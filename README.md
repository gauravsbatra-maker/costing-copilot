# Costing Copilot

Milestone 1 reads the first visible Excel tab in browser memory; no workbook is sent to Convex or OpenAI. Excel formulas use the last saved values, with unreadable cells flagged.

Milestone 2 adds a pasted WhatsApp brief. A Convex action sends only this text as user input to OpenAI, using OPENAI_API_KEY from Convex environment variables, and returns editable requirements with source text. Missing or unsupported fields are flagged. No pricing or saving is added. Requirements and edits disappear on refresh. Convex stores only an operational call-limit row with up to 30 recent timestamps; this is a deployment-wide rolling-hour limit, including failed attempts.

Run `npm install`, `npx convex dev --once`, then `npm run dev`; open the address printed by Vite. Set OPENAI_API_KEY in the development Convex dashboard before reading briefs. No keys belong in local files or chat.

Checks: `npm test`, `npm run build`, then `TEST_BASE_URL=http://127.0.0.1:5173 npm run test:e2e` (substitute the running app’s port). The browser brief test sends a made-up brief through the real development action and OpenAI; backend tests simulate provider replies to check failure cases and the 30-call limit without spending AI calls. Tests never use client files. Existing Convex settings and hosting remain in place.
