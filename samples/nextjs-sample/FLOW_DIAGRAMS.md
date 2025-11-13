# Authentication Flow Diagrams

## 1. Credentials Login Flow

```
┌─────────────┐
│   Browser   │
│  /login     │
└──────┬──────┘
       │
       │ User enters email/password
       │
       ▼
┌─────────────────────┐
│ CredentialsLogin    │
│ Form Component      │
└──────┬──────────────┘
       │
       │ credentialsLogin()
       │ POST /api/auth/credentials/login
       │ { email, password }
       ▼
┌─────────────────────────────────┐
│  Light Auth API Handler          │
│  /api/auth/[...auth]/route.ts   │
└──────┬──────────────────────────┘
       │
       │ 1. Validate CSRF token
       │ 2. Parse request body
       ▼
┌─────────────────────────────────┐
│  credentialsLoginHandler()       │
│  (from @light-auth/core)        │
└──────┬──────────────────────────┘
       │
       │ 3. Call provider.verifyCredentials()
       ▼
┌─────────────────────────────────┐
│  Credentials Provider            │
│  lib/credentials-provider.ts    │
│                                  │
│  - Find user by email           │
│  - bcrypt.compare(password)     │
│  - Return user claims or null   │
└──────┬──────────────────────────┘
       │
       │ User claims { sub, email, name }
       ▼
┌─────────────────────────────────┐
│  Create Session                  │
│  - Generate session ID          │
│  - Set expiration (30 days)     │
│  - Encrypt as JWT               │
│  - Set HTTP-only cookie         │
└──────┬──────────────────────────┘
       │
       │ 200 OK { success, session }
       │ Set-Cookie: light-auth-session=...
       ▼
┌─────────────────────┐
│ Browser             │
│ - Store cookie      │
│ - Redirect /profile │
└─────────────────────┘
```

## 2. User Registration Flow

```
┌─────────────┐
│   Browser   │
│  /login     │
│  (Register  │
│    Tab)     │
└──────┬──────┘
       │
       │ User enters name, email, password
       │
       ▼
┌─────────────────────┐
│ CredentialsRegister │
│ Form Component      │
└──────┬──────────────┘
       │
       │ credentialsRegister()
       │ POST /api/auth/credentials/register
       │ { email, password, name, autoLogin: true }
       ▼
┌─────────────────────────────────┐
│  Light Auth API Handler          │
└──────┬──────────────────────────┘
       │
       │ 1. Validate CSRF token
       │ 2. Parse request body
       ▼
┌─────────────────────────────────┐
│  credentialsRegisterHandler()    │
└──────┬──────────────────────────┘
       │
       │ 3. Call provider.registerUser()
       ▼
┌─────────────────────────────────┐
│  Credentials Provider            │
│                                  │
│  - Check if user exists         │
│  - Hash password (bcrypt)       │
│  - Create user record           │
│  - Return user claims           │
└──────┬──────────────────────────┘
       │
       │ User claims { sub, email, name }
       │
       ├─── If autoLogin = true ────┐
       │                             │
       ▼                             ▼
┌─────────────────┐      ┌──────────────────┐
│ Create Session  │      │ Return User Only │
│ (same as login) │      │ (no session)     │
└────────┬────────┘      └──────────────────┘
         │
         │ 200 OK { success, session }
         ▼
┌─────────────────────┐
│ Browser             │
│ - Auto logged in    │
│ - Redirect /profile │
└─────────────────────┘
```

## 3. OAuth Login Flow (Existing)

```
┌─────────────┐
│   Browser   │
│  /login     │
│  (OAuth Tab)│
└──────┬──────┘
       │
       │ Click "Login with Google"
       │
       ▼
┌─────────────────────┐
│ signIn("google")    │
│ Server Action       │
└──────┬──────────────┘
       │
       │ Redirect to Google OAuth
       ▼
┌─────────────────────┐
│ Google OAuth        │
│ Login Page          │
└──────┬──────────────┘
       │
       │ User authenticates
       │
       ▼
┌─────────────────────────────────┐
│ Callback Handler                 │
│ /api/auth/callback/google       │
│                                  │
│ - Verify OAuth code             │
│ - Get tokens from Google        │
│ - Get user info                 │
│ - Create session                │
└──────┬──────────────────────────┘
       │
       │ Redirect /profile
       ▼
┌─────────────────────┐
│ Browser /profile    │
└─────────────────────┘
```

## 4. Protected Route Access

```
┌─────────────┐
│   Browser   │
│ GET /profile│
└──────┬──────┘
       │
       │ Cookie: light-auth-session=...
       ▼
┌─────────────────────────────────┐
│  Next.js Page/Component          │
│  await getAuthSession()         │
└──────┬──────────────────────────┘
       │
       │ 1. Read cookie from headers
       ▼
┌─────────────────────────────────┐
│  Session Store                   │
│  nextjs-light-auth-session-store│
│                                  │
│  - Decrypt JWT                  │
│  - Verify signature             │
│  - Check expiration             │
└──────┬──────────────────────────┘
       │
       ├─── Valid Session ──────┐
       │                        │
       ▼                        ▼
┌──────────────┐    ┌────────────────────┐
│ Return       │    │ Return null        │
│ Session Data │    │ (Unauthorized)     │
└──────┬───────┘    └────────┬───────────┘
       │                     │
       │                     │ Redirect /login
       ▼                     ▼
┌──────────────┐    ┌────────────────────┐
│ Show Profile │    │ Show Login Page    │
│ Page         │    │                    │
└──────────────┘    └────────────────────┘
```

## 5. Complete System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (Client)                      │
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ Login Forms     │  │ OAuth Buttons    │                  │
│  │ - Email/Pass    │  │ - Google         │                  │
│  │ - Register      │  │ - Microsoft      │                  │
│  └────────┬────────┘  └────────┬─────────┘                  │
│           │                    │                             │
│           │  Client Functions  │                             │
│           │  - credentialsLogin()                            │
│           │  - credentialsRegister()                         │
│           │  - getCsrfToken()                                │
└───────────┼────────────────────┼──────────────────────────────┘
            │                    │
            │ HTTP POST          │ HTTP GET
            │                    │
┌───────────▼────────────────────▼──────────────────────────────┐
│                    Next.js Server (API Routes)                 │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/auth/[...auth]/route.ts                        │   │
│  │                                                       │   │
│  │  Routes:                                              │   │
│  │  - POST /credentials/login    → credentialsLogin    │   │
│  │  - POST /credentials/register → credentialsRegister │   │
│  │  - GET  /redirect/:provider   → OAuth redirect      │   │
│  │  - GET  /callback/:provider   → OAuth callback      │   │
│  │  - POST /logout               → Logout              │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                         │
└─────────────────────┼─────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼──────────┐    ┌──────────▼───────────┐
│ Credentials      │    │ OAuth Provider       │
│ Provider         │    │ (Google/Microsoft)   │
│                  │    │                      │
│ - verifyCredentials  │ - arctic.authorize()  │
│ - registerUser   │    │ - arctic.tokens()    │
│ - resetPassword  │    │ - fetch user info    │
└───────┬──────────┘    └──────────┬───────────┘
        │                           │
        │    User Claims            │
        │    { sub, email, name }   │
        │                           │
        └─────────────┬─────────────┘
                      │
              ┌───────▼────────┐
              │ Session Store  │
              │                │
              │ - Encrypt JWT  │
              │ - Set Cookie   │
              │ - Store Session│
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │ User Adapter   │
              │ (Optional)     │
              │                │
              │ - Save to DB   │
              │ - Update user  │
              └────────────────┘
```

## 6. Data Flow Summary

### Login Request
```
Form → credentialsLogin() → POST /api/auth/credentials/login
  → Validate CSRF
  → credentialsLoginHandler()
  → provider.verifyCredentials()
  → bcrypt.compare()
  → Create session
  → Encrypt JWT
  → Set cookie
  → Return success
```

### Session Validation
```
Page load → getAuthSession()
  → Read cookie
  → Decrypt JWT
  → Verify signature
  → Check expiration
  → Return session or null
```

### Registration
```
Form → credentialsRegister() → POST /api/auth/credentials/register
  → Validate CSRF
  → credentialsRegisterHandler()
  → provider.registerUser()
  → bcrypt.hash()
  → Save user
  → Auto-login (optional)
  → Create session
  → Return success
```

## 7. Security Layers

```
┌────────────────────────────────────────┐
│          HTTPS/TLS (Transport)         │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│     CSRF Token Validation (Request)    │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│    Rate Limiting (Request Count)       │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│   Password Hashing (bcrypt + salt)     │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│  Session Encryption (JWT + secret)     │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│  HTTP-Only Cookie (XSS Protection)     │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│   SameSite=Lax (CSRF Protection)       │
└────────────────────────────────────────┘
```

---

## Legend

- `┌─┐` Box: Component or step
- `─►` Arrow: Data flow direction
- `│` Vertical line: Connection
- `├─` Branch: Multiple paths
- `▼` Down arrow: Next step

---

**Use these diagrams to understand how credentials authentication integrates with Light Auth!**
