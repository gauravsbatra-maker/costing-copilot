# Plan
## Previous milestone: 3 — map and cost confirmed requirements
- Keep milestone 2 extraction unchanged.
- Read Overall WIP in browser, preserving two-row headers, line quantities and source rows.
- Review meal source rows; map named requirements to the 10 historical heads.
- Ask for each head’s driving headcount when function counts differ; high tea always follows lunch.
- Calculate pre-GST costs in code only. Unmatched or unreadable costs remain To quote.
- Explicitly confirmed accommodation may use reviewed brief rooms × room rate × nights, labelled as a client-brief source; no additional season increase on that quoted rate.
- No export, login, brief or sheet storage. Real inputs stay outside the repo.
- Verified calculations, all 37 checks, and the full local flow on the supplied brief and costing sheet; raw output captured outside the repo.
- User approved commit, push and deployment; verify the live costing flow after deployment.
## Previous milestone: 4 — show cost ranges
- Keep milestones 1–3 calculations and extraction unchanged; existing amounts remain midpoints.
- Show midpoint ± the brief’s stated variance for every priced head, line and pre-GST total; preserve all source lines.
- If variance is missing or unreadable, ask for a percentage and block costing until supplied (0–100%, including zero).
- Keep To quote lines excluded; no login, storage, export or contingency added.
- Pre-fill editable headcounts and cost bases from the user’s rules, show reasons, and let Confirm all accept the displayed choices and generate the costing.
- Review preparation separates stated guest counts from explanatory figures and expands only an explicitly repeated daily schedule. City stays unconfirmed and visible; no city is guessed.
- Build and all 35 code checks passed; range tests cover percentages, rounding, source preservation and unchanged midpoints.
- Local browser verification is pending: the user’s local server is running on port 5173, but this restricted session denied Chrome launch. The saved browser check includes the missing-variance question and stale-range clearing.
- Real Tara sheet calculations checked against the saved wedding-brief reading and previous reviewed choices; raw output and the no-edit Confirm all browser script are outside the repo in /private/tmp. This is not a fresh full-flow verification.
- Await full local browser proof and user confirmation before commit, push or deploy.
## Previous milestone: 5 — flag assumptions, missing information and uncertain costs
- Add “Check before you send” above the pre-GST total, with plain-language entries naming the affected cost heads.
- Explain displayed headcounts, cost bases, pre-filled fields and schedules, meal-row matching, season increases, brief-room pricing and range choices.
- Show missing information and uncertain costs first; group assumptions by shared rule and affected heads, with all original details behind a “Show all assumptions” toggle that starts closed.
- List missing or unclear reviewed fields and every unpriced or unsourced cost; preserve sources, pre-fill behaviour, city inputs and all other heads’ calculations.
- Add an empty “Guests the past transfers covered” field. Only transfers use sheet cost × out-of-town guests ÷ this past count, keeping existing seasonal and range percentages. Missing or invalid counts leave transfers To quote and appear in the checklist; transfers never use the historical event guest count as their divisor.
- All 40 code tests, all 8 browser tests and the build passed. Chrome verification used the saved reviewed brief and original costing sheet, checked empty and filled transfer counts and clearing the field, and confirmed every other head and source unchanged at desktop and phone widths. Real inputs and captured output remain outside the repo.
- User approved committing and pushing the proposal clean-up, checklist and transfer-count correction. Deployment was not requested.
## Previous milestone: 6 — explain and apply contingency
- Add editable “Contingency %” inputs under each proposal head: 10% for Guests Transfer and 0% elsewhere.
- Show each reserve and its reason separately under the affected head and in “Assumptions and choices”. Increase both ends of that head’s existing range; add rounded reserves to the original pre-GST total.
- Keep source prices, source rows, line ranges, pre-fill, city inputs and the transfer past-guest field unchanged. To quote heads receive no priced reserve; invalid percentages flag missing information and hide the numeric total.
- All 42 code tests, all 8 browser tests and the build passed. Chrome verification used the saved reviewed brief and original sheet with the past-transfer count filled, checked the new reserve and total at desktop and phone widths, and restored the previous figures by setting contingency to zero. Real inputs and captured output remain outside the repo.
- User approved committing and pushing milestone 6 contingency changes. Deployment was not requested.
## Previous milestone: 7 — edit proposal lines in place
- Add editable quantity, unit cost and contingency to every proposal line, keeping the original calculation and source rows as the reset baseline.
- Recalculate line prices, head ranges and the pre-GST total in browser code from the existing proposal; no additional AI call or file read. Mark edited lines and offer Reset to sheet for each line.
- Preserve pre-filled review choices, city and past-transfer inputs, and the checklist layout. Keep individual contingency choices visible in its existing assumptions list.
- All 43 code tests, all 8 browser tests and the build passed. Chrome verification used the saved reviewed brief and original sheet with the past-transfer count filled, changed transfer contingency to 20%, and restored the original 10% total through Reset at desktop and phone widths. Real inputs and captured output remain outside the repo.
- User approved committing and pushing milestone 7 line-editing changes. Deployment was not requested.
## Previous milestone: 8 — review confirmed scope, assumptions and costs
- Add Review proposal on the costed screen and a separate read-only page with Scope, Assumptions and Costs, ending with the existing pre-GST total.
- Use the confirmed city, dates and function guest counts. Read the stated event type from the brief for the review page and combine it with the reviewed day count; ignore historical benchmark event types. Only a missing event type shows “Not stated in brief” and a review-page missing-information item. Existing review and costing screens stay unchanged.
- Reuse the current checklist items and closed assumptions toggle. Show one cost row per head with its existing range, midpoint, actual source rows, per-line contingency percentages when different, and the same edited status.
- Back to edit retains the existing screen and all inputs and edits. No calculation changes, AI calls, file reads, storage, export, deliverables or timelines added.
- All 44 code tests, all 10 browser tests and the build passed, including stated and missing event types. Chrome verification on the saved reviewed wedding brief and original Tara sheet with 60 past-transfer guests confirmed the Event line, unchanged midpoint, identical existing checklist items, exact return-to-edit state, and no sideways scrolling at 390px. Real inputs and captured page text remain outside the repo.
- User approved committing and pushing milestone 8 review-page changes. Deployment was not requested.
## Passed milestone: 9 — credible costing in under five minutes
- User reported a new brief plus the costing sheet took 3 min 49 sec end to end, with the tool midpoint about 4.5% from the project head’s estimate and inside the ±10% line. Full evidence is recorded in PRODUCT.md; no brief or sheet is stored in the repo.
- Label-only corrections show “Food & beverage (minimum guarantee)” and “Guest rooms” in the costed and review views, preserving original source text and every number. All 45 code tests, 10 browser tests and the build passed; Chrome checked the unchanged amounts and phone width.
- User approved committing and pushing the milestone 9 evidence together with the label changes. Deployment was not requested.
## Parked
None.
