# VisualInventory Auth Auth System Design

## Overview

Single URL app with no login UI → session + feature flags stored in `firms.enabled_features` JSONB
2. All data scoped via single login screen
3. Role-based access:
   - master_admin: Full access to   - store_owner: Limited access (can toggle features per - staff: Can toggle features assigned by master_admin
   - staff: Read-only,   - No admin/analytics

## Auth Flow

```mermaid
graph LR
    A[Login Page] --> validate --> redirect to /billing
    A[Protected Route] checks feature flags
    A[FirmSwitcher] for admin to switch between firms
    A[Logout] button in header

## DB Schema

```mermaid
classDiagram
    direction: LR
    A[Users table] --[ ]--> [Auth]
    A[firm_users table] -- [ ]
```

## API Endpoints

- `POST /api/auth/login` - email/password login
- `post /api/auth/me` - refresh token, get user profile
- `post /api/users/firm-users` - Get firms for user can access to
- `post /api/users/logout` - Logout

```

