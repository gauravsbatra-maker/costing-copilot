# Gather

A home get-together planner built with React, Vite, TypeScript and Convex.

Live app: https://befitting-snake-688.convex.site

Verified on 2 October 2026: frontend build, two budget checks and two browser checks pass. Browser checks were repeated against the live production site, including phone layout, saved task completion, cost totals, guest replies and host-link permissions. WhatsApp invitation content and links were checked; no messages or orders were sent.

## Use the app
Create a gathering with a date, guest count and INR budget. Save the private host link: anyone holding this link can edit the plan, and there is no sign-in or recovery email.

Edit tasks in all 12 categories, set quantities and due dates, enter unit prices and total actual spending, and tick off finished work. Completed tasks record when they were finished and show whether they were on time. Zero prices are valid for items you already own; blank prices are excluded from known estimates.

Outlet prices are entered manually. A Swiggy/Zomato link and checked date record their source; prices are not fetched automatically. Include delivery charges and taxes in actual spending.

Share the separate guest invitation through WhatsApp. Guests open its page and RSVP without signing in. WhatsApp messages are opened for the host to send; the app does not send messages itself. Hosts can add and correct replies. Replies from the same browser update rather than duplicate; a different browser may create a separate reply. Guests cannot see tasks, budgets or other guests' replies.

## Develop
`npm install`

Use the existing Convex deployment in `.env.local`; do not commit environment files.

Run `npx convex dev` and `npm run dev` in separate terminals. Vite reads `CONVEX_URL` locally, or `VITE_CONVEX_URL` when supplied by the hosting command.

## Check
- `npm test`: quantities, entered prices, actual spending and budget arithmetic.
- `npm run build`: TypeScript checks and frontend build.
- `npm run test:e2e`: Chrome checks creation, saved edits, completion timing, RSVPs, corrections and link permissions. Uses installed Google Chrome.
- For live checks set `TEST_BASE_URL` to the hosted `.convex.site` address and `TEST_CONVEX_URL` to its matching `.convex.cloud` backend.

Browser tests create clearly labelled test gatherings. They do not send WhatsApp messages or place orders.

## Deploy
`npm run deploy`

Convex Static Hosting builds the frontend with the production backend URL, deploys Convex functions, and uploads the static app. A GitHub push does not deploy.

Vendor bookings, payments and automatic price feeds are outside the first version.
