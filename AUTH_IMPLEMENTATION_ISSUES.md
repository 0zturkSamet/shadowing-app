# Authentication Implementation Issues - Day 2

**Date:** November 6, 2025
**Status:** Backend authentication endpoints are failing due to dependency issues

---

## Executive Summary

The authentication feature was successfully implemented in the codebase (both backend and frontend), but **the backend is currently non-functional** due to bcrypt/passlib compatibility issues. The frontend code is complete and ready to test once the backend is fixed.

---

## Issues Discovered

### 1. Missing Dependencies (RESOLVED)

**Issue:** Required Python packages not in `requirements.txt`
- `email-validator` - Required by Pydantic for email field validation
- `bcrypt` - Required by passlib for password hashing

**Resolution:** Manually installed both packages
```bash
pip install email-validator bcrypt
```

**Action Required:** Add to `backend/requirements.txt`:
```txt
email-validator==2.3.0
bcrypt==5.0.0
```

---

### 2. TypeScript Version Error (RESOLVED)

**Issue:** `frontend/package.json` specifies non-existent TypeScript version
```json
"typescript": "5.3.0"  // This version doesn't exist
```

**Error Message:**
```
npm error notarget No matching version found for typescript@5.3.0
```

**Resolution:** Updated to valid version
```json
"typescript": "5.3.3"
```

**Action Required:** Update `frontend/package.json` in repository

---

### 3. Bcrypt/Passlib Compatibility Issue (CRITICAL - NOT RESOLVED)

**Issue:** Fatal incompatibility between `bcrypt 5.0.0` and `passlib 1.7.4`

**Error Message:**
```
ValueError: password cannot be longer than 72 bytes, truncate manually if necessary (e.g. my_password[:72])
```

**Root Cause:**
- Error occurs during passlib's internal bcrypt backend initialization
- passlib's `detect_wrap_bug()` function uses a test password that's too long
- This is a known issue with bcrypt 5.x and passlib 1.7.4

**Error Location:** `backend/app/core/security.py:35` (hash_password function)

**Stack Trace:**
```
File "/Users/sametozturk/Desktop/shadowing-app/backend/app/core/security.py", line 35, in hash_password
  return pwd_context.hash(password_bytes)
File ".../passlib/handlers/bcrypt.py", line 655, in _calc_checksum
  hash = _bcrypt.hashpw(secret, config)
ValueError: password cannot be longer than 72 bytes
```

**Attempted Fix (Failed):**
Tried truncating passwords to 72 bytes:
```python
def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')[:72]
    return pwd_context.hash(password_bytes)
```
**Result:** Still fails during passlib initialization, before our code runs

---

## Recommended Solutions

### Option A: Downgrade bcrypt (RECOMMENDED - Easiest)

**Change `backend/requirements.txt`:**
```diff
-passlib==1.7.4
+passlib[bcrypt]==1.7.4
+bcrypt==4.0.1  # Use older version compatible with passlib
```

**Why this works:**
- bcrypt 4.x is fully compatible with passlib 1.7.4
- Most stable and tested combination
- No code changes required

---

### Option B: Upgrade passlib (Alternative)

**Change `backend/requirements.txt`:**
```diff
-passlib==1.7.4
+passlib==1.7.4.post1  # Or latest version
```

**Check if newer passlib version fixes bcrypt 5.x compatibility**

**Pros:** Uses latest bcrypt security improvements
**Cons:** passlib hasn't been updated recently, may not work

---

### Option C: Replace passlib with bcrypt directly (More Work)

**Completely rewrite `backend/app/core/security.py`:**

```python
import bcrypt
from typing import str

def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly."""
    # Convert to bytes
    password_bytes = password.encode('utf-8')
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)
```

**Update `backend/requirements.txt`:**
```diff
-passlib==1.7.4
+bcrypt==5.0.0
```

**Pros:**
- Uses latest bcrypt 5.x
- Simpler, fewer dependencies
- Direct control over hashing

**Cons:**
- Requires code changes
- Need to update tests
- Remove passlib dependency

---

## Files Affected

### Backend Files Created/Modified:
- ✅ `backend/app/api/auth.py` - Auth endpoints (register, login, /me)
- ✅ `backend/app/core/dependencies.py` - JWT token validation
- ✅ `backend/app/core/security.py` - Password hashing (HAS BUGS)
- ✅ `backend/tests/test_auth.py` - Auth tests
- ✅ `backend/.env.example` - JWT configuration

### Frontend Files Created:
- ✅ `frontend/app/auth/login/page.tsx` - Login page
- ✅ `frontend/app/auth/register/page.tsx` - Registration page
- ✅ `frontend/app/auth/page.tsx` - Auth wrapper page
- ✅ `frontend/contexts/AuthContext.tsx` - Auth state management
- ✅ `frontend/hooks/useAuth.ts` - Custom auth hook
- ✅ `frontend/components/ProtectedRoute.tsx` - Route protection
- ✅ `frontend/services/api.ts` - API calls (updated)
- ✅ `frontend/types/index.ts` - TypeScript types
- ✅ `frontend/app/page.tsx` - Homepage (updated with auth)
- ✅ `frontend/app/providers.tsx` - Providers (updated)

---

## Testing Status

### ❌ Backend API Tests (FAILED)

**Cannot Test Until bcrypt Issue is Resolved**

Attempted tests:
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123","name":"Test User","learning_language":"es"}'
```

**Result:** 500 Internal Server Error (bcrypt initialization fails)

### ⏳ Frontend Tests (PENDING)

**Cannot Test Until Backend Works**

Frontend pages exist and should work:
- http://localhost:3000/auth/login
- http://localhost:3000/auth/register
- http://localhost:3000 (with auth buttons)

---

## Current Service Status

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| PostgreSQL | 5432 | ✅ Running | Healthy |
| Redis | 6379 | ✅ Running | Healthy |
| FastAPI Backend | 8000 | ❌ Failed | bcrypt error on auth endpoints |
| Next.js Frontend | 3000 | ✅ Running | Ready to test (waiting for backend) |

---

## Environment Configuration

### Backend `.env` (Configured)
```env
DATABASE_URL=postgresql://postgres:password@localhost/shadowing
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=24
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Frontend `.env.local` (Configured)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Next Steps

### Immediate Actions Required:

1. **Fix bcrypt/passlib compatibility** (Choose Option A, B, or C above)

2. **Update `backend/requirements.txt`** with missing dependencies:
   ```txt
   fastapi==0.104.1
   uvicorn==0.24.0
   sqlalchemy==2.0.23
   psycopg2-binary==2.9.9
   redis==5.0.1
   pydantic==2.5.0
   python-jose==3.3.0
   passlib==1.7.4
   python-multipart==0.0.6
   pytest==7.4.3
   httpx==0.25.1
   email-validator==2.3.0  # ADD THIS
   bcrypt==4.0.1           # ADD THIS (downgraded version)
   ```

3. **Update `frontend/package.json`** TypeScript version:
   ```json
   "typescript": "5.3.3"
   ```

4. **Restart backend** after fixing dependencies:
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

5. **Test authentication endpoints:**
   ```bash
   # Test registration
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"TestPassword123","name":"Test User","learning_language":"es"}'

   # Test login
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"TestPassword123"}'

   # Test get current user (use token from login response)
   curl -X GET http://localhost:8000/api/auth/me \
     -H "Authorization: Bearer <TOKEN_HERE>"
   ```

6. **Test frontend pages:**
   - Open http://localhost:3000
   - Click "Login" or "Register"
   - Test registration flow
   - Test login flow
   - Verify token storage
   - Test logout

---

## Workaround for Testing (If Backend Can't Be Fixed Immediately)

If the backend fix takes time, you can mock the backend responses to test the frontend:

1. **Use Mock Service Worker (MSW)** in frontend to simulate API responses
2. **Or use Postman Mock Server** to simulate auth endpoints
3. **Or temporarily hardcode test tokens** in AuthContext

---

## Code Quality Notes

### ✅ Good Implementation Patterns Found:
- Proper separation of concerns (routes, services, models)
- Type hints throughout Python code
- Comprehensive docstrings
- JWT token implementation looks correct
- Frontend React hooks pattern is clean
- TypeScript types are well-defined

### ⚠️ Issues Found:
- Missing dependency specifications
- No bcrypt version pinning
- No error handling for bcrypt initialization
- Password length validation missing (should enforce <72 chars)

---

## Estimated Fix Time

| Solution | Time Required | Risk Level |
|----------|---------------|------------|
| **Option A: Downgrade bcrypt** | 5 minutes | Low (tested solution) |
| **Option B: Upgrade passlib** | 10 minutes | Medium (might not work) |
| **Option C: Replace with bcrypt** | 30-45 minutes | Medium (code changes + testing) |

**Recommendation:** Start with Option A (downgrade bcrypt to 4.0.1)

---

## Contact & Support

If you need help resolving these issues:
1. Check passlib documentation: https://passlib.readthedocs.io/
2. Check bcrypt compatibility: https://github.com/pyca/bcrypt
3. FastAPI security guide: https://fastapi.tiangolo.com/tutorial/security/

---

**Status:** Ready for fixes - all code is in place, just need dependency resolution
