# Scope: Milestone 1 — User Auth & Profile (gen2 Remediation)

## Architecture
- Backend App: `users` (`users/models.py`, `users/views.py`, `users/serializers.py`, `users/urls.py`)
- Frontend Components: `frontend/src/services/api.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/components/auth/AuthModal.jsx`, `frontend/src/components/profile/ProfileView.jsx`, `frontend/src/components/common/Header.jsx`

## Feature Inventory Assignment
- Feature 1: User Auth & OTP (authentic logic, no hardcoded backdoor)
- Feature 2: User Profile & Leaderboard
- Feature 25: Frontend Auth Binding

## Code Ownership
- `users/*`
- `frontend/src/services/api.js` (Auth section & Axios interceptor)
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/components/auth/*`
- `frontend/src/components/profile/*`
