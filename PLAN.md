# Plan
## Active milestone: 2 — paste and structure a brief
- Add a brief box above the existing Excel upload and editable requirements with source text.
- One Convex action sends only the brief as user input to OpenAI, with a 1,500-token reply cap and no saved responses.
- Enforce at most 30 attempts per rolling hour across the deployment using an internal, atomic Convex counter. Store timestamps only.
- Mark absent or unsupported values Missing; mark contradictions Unclear, in amber. Ask which headcount drives each named cost head when the benchmark differs.
- Keep Excel parsing and readback unchanged. No pricing, calculations, login, brief storage, PDF support or later milestones.
- Test with made-up data, check the web app, provide full test output and laptop testing steps.
## Parked
None.
