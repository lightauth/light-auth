# Phase 1: Provider Type System Implementation

## Overview

Light Auth now supports **two types of authentication providers** through a discriminated union pattern:

1. **OAuth Providers** (`type: "oauth"`) - For OAuth 2.0 / OpenID Connect flows (Google, GitHub, Microsoft, etc.)
2. **Credentials Providers** (`type: "credentials"`) - For email/password authentication

## Changes Made

### 1. New Types

#### `LightAuthUserClaims`
User claims returned from credential verification:
```typescript
interface LightAuthUserClaims {
  sub: string;           // Unique user identifier
  email: string;         // User email
  name: string;          // Display name
  picture?: string;      // Profile picture URL
  [key: string]: unknown; // Custom claims
}
```

#### `LightAuthProvider` (Discriminated Union)
```typescript
type LightAuthProvider = LightAuthOAuthProvider | LightAuthCredentialsProvider;
```

#### `LightAuthOAuthProvider`
OAuth provider with explicit `type: "oauth"` discriminator:
```typescript
interface LightAuthOAuthProvider {
  type: "oauth";
  providerName: string;
  arctic: ArcticProvider;
  scopes?: string[];
  searchParams?: Map<string, string>;
  headers?: Map<string, string>;
  onGetOAuth2Tokens?: (tokens, metadata) => OAuth2Tokens;
}
```

#### `LightAuthCredentialsProvider`
Credentials provider with `type: "credentials"` discriminator:
```typescript
interface LightAuthCredentialsProvider {
  type: "credentials";
  providerName: string;
  verifyCredentials: (email, password, metadata?) => Promise<LightAuthUserClaims | null>;
  hashPassword?: (password) => Promise<string>;
  comparePassword?: (password, hash) => Promise<boolean>;
  registerUser?: (email, password, additionalData?) => Promise<LightAuthUserClaims | null>;
  requestPasswordReset?: (email) => Promise<boolean>;
  resetPassword?: (token, newPassword) => Promise<boolean>;
}
```

### 2. Helper Functions

#### `createOAuthProvider()`
Explicitly creates an OAuth provider:
```typescript
import { createOAuthProvider } from "@light-auth/core";
import { Google } from "arctic";

const googleProvider = createOAuthProvider({
  providerName: "google",
  arctic: new Google(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI),
});
```

#### `createCredentialsProvider()`
Explicitly creates a credentials provider:
```typescript
import { createCredentialsProvider } from "@light-auth/core";

const credentialsProvider = createCredentialsProvider({
  providerName: "credentials",
  verifyCredentials: async (email, password) => {
    // Verify credentials against your database
    const user = await db.users.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return null;
    }
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.avatar,
    };
  },
});
```

#### Type Guards
```typescript
import { isOAuthProvider, isCredentialsProvider } from "@light-auth/core";

if (isOAuthProvider(provider)) {
  // TypeScript knows provider.arctic exists
  const url = provider.arctic.createAuthorizationURL(...);
}

if (isCredentialsProvider(provider)) {
  // TypeScript knows provider.verifyCredentials exists
  const claims = await provider.verifyCredentials(email, password);
}
```

### 3. Backward Compatibility

The `ensureProviderType()` function automatically converts legacy providers (without `type` field) to OAuth providers:

```typescript
// Legacy format (still works!)
const legacyProvider = {
  providerName: "google",
  arctic: new Google(...),
};

// Automatically converted to:
// { type: "oauth", providerName: "google", arctic: ... }
```

### 4. Updated Handlers

All handlers now check the provider type:

- **redirect-to-provider.ts**: Throws error for credentials providers (they don't use OAuth redirect)
- **provider-callback.ts**: Throws error for credentials providers (they don't have callbacks)
- **logout.ts**: Only attempts token revocation for OAuth providers
- **retrieve-user.ts**: Only attempts token refresh for OAuth providers

## Usage Examples

### OAuth Provider (Backward Compatible)

```typescript
import { Google } from "arctic";

// Option 1: Explicit type (recommended)
const googleProvider = {
  type: "oauth" as const,
  providerName: "google",
  arctic: new Google(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI),
};

// Option 2: Using helper
const googleProvider = createOAuthProvider({
  providerName: "google",
  arctic: new Google(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI),
});

// Option 3: Legacy format (still works, auto-converted)
const googleProvider = {
  providerName: "google",
  arctic: new Google(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI),
};
```

### Credentials Provider (New!)

```typescript
import { createCredentialsProvider } from "@light-auth/core";
import bcrypt from "bcrypt";

const credentialsProvider = createCredentialsProvider({
  providerName: "credentials",
  
  verifyCredentials: async (email, password) => {
    const user = await db.users.findByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    
    return {
      sub: user.id.toString(),
      email: user.email,
      name: user.fullName,
      picture: user.avatarUrl,
    };
  },
  
  hashPassword: async (password) => {
    return await bcrypt.hash(password, 10);
  },
  
  comparePassword: async (password, hash) => {
    return await bcrypt.compare(password, hash);
  },
  
  registerUser: async (email, password, additionalData) => {
    const hash = await bcrypt.hash(password, 10);
    const user = await db.users.create({
      email,
      passwordHash: hash,
      fullName: additionalData?.name || email,
    });
    
    return {
      sub: user.id.toString(),
      email: user.email,
      name: user.fullName,
    };
  },
});
```

### Mixed Configuration

```typescript
import { CreateLightAuth } from "@light-auth/nextjs";
import { createOAuthProvider, createCredentialsProvider } from "@light-auth/core";
import { Google, GitHub } from "arctic";

const { handlers, signIn, signOut, getAuthSession } = CreateLightAuth({
  providers: [
    createOAuthProvider({
      providerName: "google",
      arctic: new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT),
    }),
    createOAuthProvider({
      providerName: "github",
      arctic: new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET),
    }),
    createCredentialsProvider({
      providerName: "credentials",
      verifyCredentials: async (email, password) => {
        // Your verification logic
      },
    }),
  ],
});
```

## Breaking Changes

**None!** This is a backward-compatible change. Existing OAuth providers without the `type` field will automatically be converted to `type: "oauth"`.

## Next Steps (Phase 2)

Phase 2 will implement the actual credential authentication handlers:

1. `POST /credentials/login` - Handle credential login
2. `POST /credentials/register` - Handle user registration
3. `POST /credentials/reset-password` - Request password reset
4. `POST /credentials/reset-password/confirm` - Confirm password reset
5. Update `httpHandler` to route these new endpoints

## Migration Guide

### For Existing Users (No Changes Required)

Your existing code continues to work without modifications:

```typescript
// This still works!
const googleProvider = {
  providerName: "google",
  arctic: new Google(...),
};
```

### For New Code (Recommended)

Use explicit types for clarity:

```typescript
import { createOAuthProvider } from "@light-auth/core";

const googleProvider = createOAuthProvider({
  providerName: "google",
  arctic: new Google(...),
});
```

## Testing

Run the following to verify backward compatibility:

```bash
cd light-auth-core
npm run build
```

Check that existing samples still work:

```bash
cd samples/nextjs-sample
npm run dev
```

## Files Modified

1. `light-auth-core/src/models/light-auth-provider.ts` - Added discriminated union types
2. `light-auth-core/src/services/utils.ts` - Added type guards and auto-conversion
3. `light-auth-core/src/services/provider-helpers.ts` - Added helper functions (NEW)
4. `light-auth-core/src/services/index.ts` - Export new helpers
5. `light-auth-core/src/handlers/redirect-to-provider.ts` - Added type check
6. `light-auth-core/src/handlers/provider-callback.ts` - Added type check
7. `light-auth-core/src/handlers/logout.ts` - Added type check for token revocation
8. `light-auth-core/src/handlers/retrieve-user.ts` - Added type check for token refresh

## Type Safety

TypeScript will now properly narrow types based on the discriminator:

```typescript
function handleProvider(provider: LightAuthProvider) {
  if (provider.type === "oauth") {
    // TypeScript knows: provider is LightAuthOAuthProvider
    const arctic = provider.arctic; // ✓ No error
  } else {
    // TypeScript knows: provider is LightAuthCredentialsProvider
    const verify = provider.verifyCredentials; // ✓ No error
  }
}
```
