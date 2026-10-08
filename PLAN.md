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
## Active milestone: 4 — show cost ranges
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
## Parked
None.
