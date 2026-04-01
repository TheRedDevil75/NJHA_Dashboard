# Debug Log — NJHCC Dashboard

This file tracks all bugs discovered and their resolution status.

---

## Bug #1 — Reporter Activity chart counts users instead of hospitals
**Date**: 2026-04-01  
**Status**: Resolved  
**Severity**: High  
**Area**: Backend  

### Description
The `/api/admin/data/reporter-activity` endpoint counted individual USER-role reporters as the denominator, but the admin dashboard should show hospital-level tracking: "X of Y hospitals submitted."

### Root Cause
`apps/api/src/routes/admin/data.ts` lines 98-141 queried `prisma.user.findMany` with `role: 'USER'` and grouped by assigned hospital, counting individual user submissions. The denominator was `reporters.length` (user count) instead of active hospital count.

### Steps to Reproduce
1. Create 1 admin user, 1 reporter user assigned to 1 hospital
2. Submit data as the reporter
3. View Admin Dashboard — donut shows "0 of 1 reporters submitted" or incorrect counts

### Fix Applied
Rewrote the endpoint to query `prisma.hospital.findMany({ where: { isActive: true } })` as the total, and use `prisma.submission.findMany` with `distinct: ['hospitalId']` to find which hospitals submitted. Response shape changed from `{ submitted, notSubmitted, byHospital: [{ name, submitted, notSubmitted }] }` to `{ submitted, notSubmitted, byHospital: [{ name, hasSubmitted }] }`.

### Files Modified
- `apps/api/src/routes/admin/data.ts`
- `apps/web/src/api/client.ts`
- `apps/web/src/pages/admin/AdminDashboard.tsx`

### Notes
The frontend `ReporterActivity` interface and API client type were updated to match the new response shape.

---

## Bug #2 — Donut chart cut off at the top
**Date**: 2026-04-01  
**Status**: Resolved  
**Severity**: Medium  
**Area**: Frontend  

### Description
The donut chart in `ReporterActivityChart.tsx` was visually clipped at the top edge.

### Root Cause
`ResponsiveContainer` height was set to 200px, but Recharts also renders a `Legend` component below the pie. The pie with `outerRadius={88}` plus the legend exceeded 200px, causing the top of the pie to be cut off. Additionally, `cy="50%"` centered the pie vertically in the full 200px, not accounting for the legend space.

### Steps to Reproduce
1. Navigate to Admin Dashboard
2. Observe the Reporter Activity donut chart — the top arc is clipped

### Fix Applied
Increased `ResponsiveContainer` height from 200 to 240, and shifted the pie center from `cy="50%"` to `cy="45%"` to give the legend room at the bottom without clipping the top.

### Files Modified
- `apps/web/src/components/ReporterActivityChart.tsx`

### Notes
None.

---

## Bug #3 — Confusing "Pending" column label in hospital breakdown table
**Date**: 2026-04-01  
**Status**: Resolved  
**Severity**: Low  
**Area**: Frontend  

### Description
The hospital breakdown table had columns "Submitted" (numeric) and "Pending" (numeric or "All in"), which was confusing since at the hospital level each hospital either submitted or did not.

### Root Cause
The table was designed for user-level tracking (multiple reporters per hospital), showing counts. With hospital-level tracking, each hospital has a binary submitted/not-submitted state, so numeric columns and the "Pending" label were misleading.

### Steps to Reproduce
1. Navigate to Admin Dashboard
2. Look at the hospital breakdown table in the Reporter Activity section
3. The "Pending" column label is unclear

### Fix Applied
Replaced the two-column layout ("Submitted" count + "Pending" count) with a single "Status" column showing "Done" (green) or "Not In" (amber) per hospital. Updated the `HospitalRow` interface from `{ name, submitted, notSubmitted }` to `{ name, hasSubmitted }`.

### Files Modified
- `apps/web/src/components/ReporterActivityChart.tsx`

### Notes
Also updated section heading from "Reporter Activity" to "Hospital Activity" and tooltip/label text from "reporters" to "hospitals" throughout the component.

---
