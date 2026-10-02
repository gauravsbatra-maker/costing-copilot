# Gather: home get-together planner

Approved by the user on 2 October 2026.

First user: the builder, planning their next get-together at home.
Core action: enter event details and guest count, receive an editable checklist, then track deadlines, completion and spending in one saved plan.

## First version
- Food, beverages, alcohol, decoration, music, housekeeping, invitation & RSVP, giveaways, manpower, crockery, cutlery and glassware.
- Suggested tasks, quantities and deadlines, editable by the host.
- Overall INR budget, estimated costs from quantities and unit prices, actual spending and overdue tasks.
- Outlet links from Swiggy/Zomato, manually entered real prices and a last-checked date. No invented or automatically fetched prices.
- Invitation link shared through WhatsApp. Guests RSVP on a public invitation page without signing in; hosts may add and correct replies.
- No host sign-in. A random private host link grants editing access. Host saves this link; no email recovery.
- Convex stores plans, tasks and replies and hosts the React/Vite app.

## Later
Vendor bookings, payments, automatic outlet price integrations, recovery email and automated WhatsApp messaging.

## Failure handling and first check
Validate dates, quantities, money and guest details. Suggestions are editable and never presented as verified prices. Save changes on Convex, show failures, and distinguish public invitations from private editing links. Losing the private link can lose access; explain this clearly.
Test with the builder's next event: does the shared checklist replace scattered notes and WhatsApp messages? Then invite two friends to try it.
