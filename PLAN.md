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
## Active milestone: 6 — explain and apply contingency
- Add editable “Contingency %” inputs under each proposal head: 10% for Guests Transfer and 0% elsewhere.
- Show each reserve and its reason separately under the affected head and in “Assumptions and choices”. Increase both ends of that head’s existing range; add rounded reserves to the original pre-GST total.
- Keep source prices, source rows, line ranges, pre-fill, city inputs and the transfer past-guest field unchanged. To quote heads receive no priced reserve; invalid percentages flag missing information and hide the numeric total.
- All 42 code tests, all 8 browser tests and the build passed. Chrome verification used the saved reviewed brief and original sheet with the past-transfer count filled, checked the new reserve and total at desktop and phone widths, and restored the previous figures by setting contingency to zero. Real inputs and captured output remain outside the repo.
- User approved committing and pushing milestone 6 contingency changes. Deployment was not requested.
## Parked
None.
