# Light Auth Provider Types - Quick Reference

## Provider Type Overview

```typescript
type LightAuthProvider = 
  | LightAuthOAuthProvider      // OAuth 2.0/OIDC (Google, GitHub, etc.)
  | LightAuthCredentialsProvider // Email/Password

// Discriminator: provider.type === "oauth" | "credentials"
```

## OAuth Provider

```typescript
import { createOAuthProvider } from "@light-auth/core";
import { Google } from "arctic";

const provider = createOAuthProvider({
  providerName: "google",
  arctic: new Google(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI),
  scopes: ["email", "profile"],           // Optional
  searchParams: new Map([["key", "val"]]), // Optional
  headers: new Map([["header", "value"]]), // Optional
  onGetOAuth2Tokens: (tokens) => tokens,  // Optional
});
```

## Credentials Provider

```typescript
import { createCredentialsProvider } from "@light-auth/core";

const provider = createCredentialsProvider({
  providerName: "credentials",
  
  // Required: Verify user credentials
  verifyCredentials: async (email, password, metadata?) => {
    // Return user claims or null
    return { sub: "123", email, name: "User" } || null;
  },
  
  // Optional: Hash password
  hashPassword: async (password) => "hash",
  
  // Optional: Compare password with hash
  comparePassword: async (password, hash) => true,
  
  // Optional: Register new user
  registerUser: async (email, password, data?) => {
    return { sub: "123", email, name: data?.name };
  },
  
  // Optional: Request password reset
  requestPasswordReset: async (email) => true,
  
  // Optional: Reset password with token
  resetPassword: async (token, newPassword) => true,
});
```

## User Claims Interface

```typescript
interface LightAuthUserClaims {
  sub: string;              // Required: Unique user ID
  email: string;            // Required: User email
  name: string;             // Required: Display name
  picture?: string;         // Optional: Avatar URL
  [key: string]: unknown;   // Optional: Custom claims
}
```

## Type Guards

```typescript
import { isOAuthProvider, isCredentialsProvider } from "@light-auth/core";

if (isOAuthProvider(provider)) {
  // provider.arctic is available
  const url = provider.arctic.createAuthorizationURL(...);
}

if (isCredentialsProvider(provider)) {
  // provider.verifyCredentials is available
  const claims = await provider.verifyCredentials(email, password);
}
```

## Backward Compatibility

```typescript
// ✅ Legacy format (without type field) still works
const legacyProvider = {
  providerName: "google",
  arctic: new Google(...),
  // No 'type' field - automatically converted to type: "oauth"
};
```

## Mixed Provider Configuration

```typescript
import { CreateLightAuth } from "@light-auth/nextjs";
import { createOAuthProvider, createCredentialsProvider } from "@light-auth/core";

const { handlers, signIn, signOut, getAuthSession } = CreateLightAuth({
  providers: [
    // OAuth providers
    createOAuthProvider({ 
      providerName: "google", 
      arctic: new Google(...) 
    }),
    createOAuthProvider({ 
      providerName: "github", 
      arctic: new GitHub(...) 
    }),
    
    // Credentials provider
    createCredentialsProvider({
      providerName: "credentials",
      verifyCredentials: async (email, password) => {
        // Your verification logic
        return { sub: "123", email, name: "User" };
      },
    }),
  ],
});
```

## Common Patterns

### Basic Email/Password Verification

```typescript
verifyCredentials: async (email, password) => {
  const user = await db.users.findOne({ email });
  if (!user) return null;
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  
  return {
    sub: user.id.toString(),
    email: user.email,
    name: user.fullName,
    picture: user.avatarUrl,
  };
}
```

### With Rate Limiting Metadata

```typescript
verifyCredentials: async (email, password, metadata) => {
  // Access request metadata
  const ip = metadata?.ip;
  const userAgent = metadata?.userAgent;
  
  // Implement rate limiting per IP
  await checkRateLimit(ip);
  
  // Continue with verification...
}
```

### Complete Registration Flow

```typescript
registerUser: async (email, password, additionalData) => {
  // 1. Validate email format
  if (!isValidEmail(email)) return null;
  
  // 2. Check if user exists
  const existing = await db.users.findOne({ email });
  if (existing) return null;
  
  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // 4. Create user
  const user = await db.users.create({
    email,
    passwordHash,
    fullName: additionalData?.name || email.split('@')[0],
  });
  
  // 5. Return claims
  return {
    sub: user.id.toString(),
    email: user.email,
    name: user.fullName,
  };
}
```

## Phase 2 Preview (Coming Soon)

Once Phase 2 is implemented, you'll be able to use:

```typescript
// POST /api/auth/credentials/login
await fetch("/api/auth/credentials/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

// POST /api/auth/credentials/register
await fetch("/api/auth/credentials/register", {
  method: "POST",
  body: JSON.stringify({ email, password, name }),
});
```

## Key Differences: OAuth vs Credentials

| Feature | OAuth Provider | Credentials Provider |
|---------|---------------|---------------------|
| Type | `"oauth"` | `"credentials"` |
| Redirect Flow | ✅ Yes | ❌ No |
| Callback URL | ✅ Required | ❌ N/A |
| Arctic Integration | ✅ Required | ❌ N/A |
| Password Handling | ❌ N/A | ✅ Custom |
| Token Refresh | ✅ Supported | ❌ N/A |
| Token Revocation | ✅ Supported | ❌ N/A |
| User Registration | ❌ N/A | ✅ Optional |
| Password Reset | ❌ N/A | ✅ Optional |

---

**Quick Links**:
- Full docs: `PHASE_1_IMPLEMENTATION.md`
- Example: `examples/credentials-provider-example.ts`
- Types: `src/models/light-auth-provider.ts`
