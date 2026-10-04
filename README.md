# Costing sheet reader

Milestone 1 only: select an Excel workbook and inspect the first visible tab’s cost heads, line items and pre-GST figures. Files stay in browser memory; nothing is sent to Convex or saved. Formulas use the values last saved by Excel; missing values are shown as “could not read”.

Run `npm install`, then `npm run dev`, and open http://127.0.0.1:5173. Run `npm test`, `npm run build` and `npm run test:e2e` to check the reader (start the app before browser tests). The existing Convex connection and hosting settings remain in place.
