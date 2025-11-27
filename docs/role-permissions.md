# AutoVolt — Role Permissions

This document lists the default permissions assigned to each role in AutoVolt.

Source: `backend/models/User.js` (pre-save defaults)

> Permission keys:
> - canManageAdmins
> - canManageUsers
> - canConfigureDevices
> - canControlDevices
> - canViewAllReports
> - canViewAssignedReports
> - canApproveRequests
> - canScheduleAutomation
> - canRequestDeviceControl
> - canMonitorSecurity
> - canViewPublicDashboard
> - canApproveExtensions
> - canRequestExtensions
> - emergencyOverride

## Permissions table (defaults)

| Role / Permission | canManageAdmins | canManageUsers | canConfigureDevices | canControlDevices | canViewAllReports | canViewAssignedReports | canApproveRequests | canScheduleAutomation | canRequestDeviceControl | canMonitorSecurity | canViewPublicDashboard | canApproveExtensions | canRequestExtensions | emergencyOverride |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| super-admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| dean        | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| hod         | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| admin       | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| faculty     | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| teacher     | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| student     | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| security    | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| guest       | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |


## Notes
- This table reflects the role defaults applied when a user document is created or saved (see `backend/models/User.js`).
- The `RolePermissions` model and admin UI may override these defaults at runtime — check `/api/role-permissions` endpoints for live overrides.
- Frontend gating is performed by `src/hooks/usePermissions.ts` which maps `user.role` and `user.permissions` into booleans consumed by components.

## How to produce a PDF
A small Node script is included under `scripts/` that can generate a PDF from the data file.

1. Install dependencies (run in project root):

```powershell
cd C:\Users\IOT\Downloads\aims_smart_class\new-autovolt
npm install pdfkit
```

2. Run the generator script:

```powershell
node scripts\generate-role-permissions-pdf.js
```

The generated file will be `docs/role-permissions.pdf`.


If you'd like, I can also create the PDF here and add it to the repo, but that requires running the script in your environment (I can run it if you want me to attempt it here).