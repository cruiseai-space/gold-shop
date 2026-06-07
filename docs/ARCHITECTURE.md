# Architecture

## 1. Repository Structure

```
swarna-ledger/
├── client/                          # React (Vite) frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── api/                     # HTTP layer
│   │   │   ├── client.js            # Axios instance with JWT interceptor
│   │   │   ├── purchases.js         # Purchase API calls
│   │   │   ├── rates.js             # Rate API calls
│   │   │   ├── logs.js              # Audit log API calls
│   │   │   └── users.js             # User management API calls
│   │   │
│   │   ├── components/              # Shared, reusable UI
│   │   │   ├── ui/                  # Primitives
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Toast.jsx        # Sonner-style toast
│   │   │   │   ├── Skeleton.jsx
│   │   │   │   ├── Table.jsx        # Base table primitives
│   │   │   │   └── ConfirmDialog.jsx
│   │   │   └── layout/
│   │   │       ├── AppShell.jsx     # Sidebar + main area
│   │   │       ├── Sidebar.jsx      # Nav + user info
│   │   │       ├── Topbar.jsx       # Page title + actions
│   │   │       └── ProtectedRoute.jsx
│   │   │
│   │   ├── features/                # Domain slices
│   │   │   ├── auth/
│   │   │   │   ├── AuthProvider.jsx  # Context + token storage
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── useAuth.js
│   │   │   │   └── auth.test.js
│   │   │   │
│   │   │   ├── purchases/
│   │   │   │   ├── PurchasesPage.jsx       # Table + toolbar
│   │   │   │   ├── PurchaseTable.jsx       # Data table
│   │   │   │   ├── PurchaseRow.jsx         # Single row
│   │   │   │   ├── PurchaseFormDrawer.jsx  # Slide-in form (add/edit)
│   │   │   │   ├── PurchaseDetailModal.jsx # Read-only detail view
│   │   │   │   ├── PendingBadge.jsx        # Owe/Settled/Overpaid
│   │   │   │   ├── usePurchases.js         # TanStack Query hooks
│   │   │   │   └── purchases.test.js
│   │   │   │
│   │   │   ├── rates/
│   │   │   │   ├── RatesPanel.jsx          # Today's rate entry
│   │   │   │   ├── RateHistoryTable.jsx
│   │   │   │   ├── useRates.js
│   │   │   │   └── rates.test.js
│   │   │   │
│   │   │   ├── logs/
│   │   │   │   ├── LogsPage.jsx
│   │   │   │   ├── LogsTable.jsx
│   │   │   │   ├── LogDetailModal.jsx
│   │   │   │   ├── useLogs.js
│   │   │   │   └── logs.test.js
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── SettingsPage.jsx        # Owner-only
│   │   │       ├── UserTable.jsx
│   │   │       ├── InviteUserModal.jsx
│   │   │       └── useUsers.js
│   │   │
│   │   ├── hooks/                   # App-wide hooks
│   │   │   ├── useToast.js
│   │   │   ├── useConfirm.js
│   │   │   └── useDebounce.js
│   │   │
│   │   ├── utils/                   # Pure functions
│   │   │   ├── goldCalc.js          # Core calculation functions
│   │   │   ├── goldCalc.test.js     # TDD — test first
│   │   │   ├── formatters.js        # INR, grams, percent formatters
│   │   │   ├── formatters.test.js
│   │   │   └── validators.js        # Shared field validators
│   │   │
│   │   ├── constants/
│   │   │   ├── roles.js             # OWNER, STAFF, VIEWER
│   │   │   ├── routes.js            # APP_ROUTES map
│   │   │   └── queryKeys.js         # TanStack Query key factory
│   │   │
│   │   ├── styles/
│   │   │   ├── tokens.css           # All CSS custom properties
│   │   │   └── global.css           # Resets, base styles
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── router.jsx               # React Router v6 config
│   │
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                          # Node.js Express backend
│   ├── src/
│   │   ├── routes/                  # Express routers (thin — only routing)
│   │   │   ├── index.js             # Mount all routers
│   │   │   ├── auth.routes.js
│   │   │   ├── purchases.routes.js
│   │   │   ├── rates.routes.js
│   │   │   ├── logs.routes.js
│   │   │   └── users.routes.js
│   │   │
│   │   ├── controllers/             # Request/response handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── purchases.controller.js
│   │   │   ├── rates.controller.js
│   │   │   ├── logs.controller.js
│   │   │   └── users.controller.js
│   │   │
│   │   ├── services/                # Business logic + DB access
│   │   │   ├── supabase.js          # Supabase client (service role)
│   │   │   ├── purchases.service.js
│   │   │   ├── rates.service.js
│   │   │   ├── logs.service.js
│   │   │   ├── users.service.js
│   │   │   └── goldCalc.service.js  # Server-side calc validation
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js   # Verify JWT, attach req.user
│   │   │   ├── rbac.middleware.js   # requireRole(OWNER), etc.
│   │   │   ├── validate.middleware.js # Joi/Zod schema validation
│   │   │   ├── auditLog.middleware.js # Auto-log mutating requests
│   │   │   └── error.middleware.js  # Central error handler
│   │   │
│   │   ├── utils/
│   │   │   ├── asyncHandler.js      # Wrap async route handlers
│   │   │   ├── ApiError.js          # Custom error class
│   │   │   └── goldCalc.js          # Shared calc (mirrors client/utils)
│   │   │
│   │   └── tests/
│   │       ├── setup.js             # Vitest global setup
│   │       ├── helpers.js           # Test factories, mock JWT
│   │       ├── purchases.test.js
│   │       ├── rates.test.js
│   │       ├── logs.test.js
│   │       ├── auth.test.js
│   │       ├── rbac.test.js
│   │       └── goldCalc.service.test.js
│   │
│   ├── index.js                     # Express app entry
│   ├── vitest.config.js
│   └── package.json
│
├── supabase/                        # DB layer
│   ├── migrations/
│   │   ├── 001_init_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_audit_log_trigger.sql
│   │   └── 004_seed_roles.sql
│   ├── seed.sql                     # Dev seed data
│   └── config.toml                  # Supabase CLI config
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Run tests on every PR
│       └── deploy.yml               # Deploy to Railway on main push
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 2. Data Flow — Add Purchase Entry

```
User fills PurchaseFormDrawer
        │
        ▼
[goldCalc.js] calculates:
  pureWeight, pureValue, pendingAmount (live preview)
        │
        ▼
[react-hook-form] validates all fields
        │
        ▼
[api/purchases.js] POST /api/purchases
        │
        ▼ (with Authorization: Bearer <JWT>)
[auth.middleware.js] verifies JWT → attaches req.user
        │
        ▼
[rbac.middleware.js] requireRole(STAFF | OWNER)
        │
        ▼
[validate.middleware.js] Joi schema → 400 if invalid
        │
        ▼
[purchases.controller.js] extracts body, calls service
        │
        ▼
[purchases.service.js]
  1. Re-calculates server-side (never trust client math)
  2. INSERT into purchases table
  3. Returns created row
        │
        ▼ (auto-triggered via auditLog.middleware.js)
[logs.service.js] INSERT into audit_logs
        │
        ▼
[React Query] invalidates ['purchases'] query key
        │
        ▼
PurchaseTable re-fetches and renders updated data
Toast: "Purchase added successfully"
```

---

## 3. Data Flow — Authentication

```
LoginPage → POST /api/auth/login
  Server verifies credentials via Supabase Auth
  Server issues signed JWT (7d expiry)
  Client stores JWT in httpOnly cookie (preferred) OR
    localStorage (if Railway CORS makes cookies hard)
  AuthProvider reads token on mount, sets user context
  ProtectedRoute checks auth context → redirect to /login if missing
```

---

## 4. Component Patterns

### Form Pattern (PurchaseFormDrawer)
```jsx
// Pattern: controlled form with live preview
const { register, handleSubmit, watch, formState } = useForm({
  resolver: zodResolver(purchaseSchema),
  defaultValues: { grossWeight: '', touchPercent: '', cashGiven: '' }
});

// Watch fields for live calculation
const [grossWeight, touchPercent, marketRate] = watch([
  'grossWeight', 'touchPercent', 'marketRate'
]);

const calc = useMemo(() =>
  computeGoldPurchase({ grossWeight, touchPercent, marketRate }),
  [grossWeight, touchPercent, marketRate]
);
```

### Data Fetching Pattern (TanStack Query)
```js
// usePurchases.js
export const usePurchases = (filters) => useQuery({
  queryKey: queryKeys.purchases.list(filters),
  queryFn: () => api.purchases.list(filters),
  staleTime: 30_000,
});

export const useCreatePurchase = () => useMutation({
  mutationFn: api.purchases.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all });
    toast.success('Purchase added');
  },
  onError: (err) => toast.error(err.message),
});
```

### RBAC Pattern (frontend guard)
```jsx
// ProtectedRoute.jsx
export const RequireRole = ({ roles, children }) => {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/dashboard" />;
  return children;
};

// Usage:
<RequireRole roles={[ROLES.OWNER]}>
  <SettingsPage />
</RequireRole>
```

---

## 5. API Layer Structure

```
Client (Axios)
  └── client.js
        ├── baseURL = VITE_API_BASE_URL
        ├── Request interceptor: attach Bearer token
        └── Response interceptor: on 401 → clear auth, redirect /login

api/purchases.js exports:
  list(filters)      → GET /api/purchases?page=1&limit=20&dateFrom=&dateTo=
  getById(id)        → GET /api/purchases/:id
  create(data)       → POST /api/purchases
  update(id, data)   → PATCH /api/purchases/:id
  remove(id)         → DELETE /api/purchases/:id    [OWNER only]
```

---

## 6. Error Response Shape

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Touch percentage must be between 0 and 100",
    "field": "touchPercent",
    "statusCode": 400
  }
}
```

Success shape:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 42, "limit": 20 }
}
```

---

## 7. Key Dependencies

### Client
```json
{
  "react": "^18",
  "react-router-dom": "^6",
  "@tanstack/react-query": "^5",
  "react-hook-form": "^7",
  "zod": "^3",
  "@hookform/resolvers": "^3",
  "sonner": "^1",
  "decimal.js": "^10",
  "@supabase/supabase-js": "^2",
  "date-fns": "^3",
  "tailwindcss": "^3"
}
```

### Server
```json
{
  "express": "^5",
  "jsonwebtoken": "^9",
  "@supabase/supabase-js": "^2",
  "joi": "^17",
  "decimal.js": "^10",
  "cors": "^2",
  "helmet": "^7",
  "morgan": "^1",
  "dotenv": "^16"
}
```

### Dev / Test
```json
{
  "vitest": "^1",
  "@testing-library/react": "^14",
  "@testing-library/jest-dom": "^6",
  "@testing-library/user-event": "^14",
  "supertest": "^6",
  "msw": "^2"
}
```
