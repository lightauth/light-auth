# Credentials Authentication - Complete Usage Guide

## Quick Start

### 1. Install Light Auth

```bash
npm install @light-auth/nextjs
# or your preferred framework adapter
```

### 2. Create Your Credentials Provider

```typescript
// lib/auth-provider.ts
import { createCredentialsProvider } from "@light-auth/core";
import bcrypt from "bcrypt";

export const credentialsProvider = createCredentialsProvider({
  providerName: "credentials",
  
  // Required: Verify credentials
  verifyCredentials: async (email, password) => {
    // Your database lookup logic
    const user = await db.users.findOne({ email });
    if (!user) return null;
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
  },
  
  // Optional: Register new users
  registerUser: async (email, password, { name }) => {
    const hash = await bcrypt.hash(password, 10);
    const user = await db.users.create({ email, passwordHash: hash, name });
    return { sub: user.id, email, name };
  },
  
  // Optional: Password reset
  requestPasswordReset: async (email) => {
    // Send reset email logic
    return true;
  },
  
  resetPassword: async (token, newPassword) => {
    // Validate token and update password
    return true;
  },
});
```

### 3. Configure Light Auth

```typescript
// lib/auth.ts
import { CreateLightAuth } from "@light-auth/nextjs";
import { credentialsProvider } from "./auth-provider";
import { Google } from "arctic";

export const { handlers, signIn, signOut, getAuthSession } = CreateLightAuth({
  providers: [
    // Mix credentials with OAuth providers
    credentialsProvider,
    {
      type: "oauth",
      providerName: "google",
      arctic: new Google(CLIENT_ID, CLIENT_SECRET, REDIRECT),
    },
  ],
});
```

### 4. Add API Route Handler

```typescript
// app/api/auth/[...auth]/route.ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### 5. Create Login Form

```typescript
// components/LoginForm.tsx
"use client";
import { credentialsLogin } from "@light-auth/core/client";

export function LoginForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const result = await credentialsLogin({
      config: { basePath: "/api/auth" },
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });
    
    if (result.success) {
      window.location.href = "/dashboard";
    } else {
      alert(result.error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Login</button>
    </form>
  );
}
```

## API Reference

### Server-Side (Provider Methods)

#### `verifyCredentials(email, password, metadata?)`
**Required**. Validates user credentials.

```typescript
verifyCredentials: async (email: string, password: string, metadata?: {}) => {
  // Return user claims or null
  return {
    sub: "user-id",
    email: "user@example.com",
    name: "John Doe",
    picture: "https://...",
    // Custom claims
    role: "admin",
  } || null;
}
```

#### `registerUser(email, password, additionalData?)`
**Optional**. Creates new user account.

```typescript
registerUser: async (email: string, password: string, data?: { name?: string }) => {
  // Create user in database
  // Return user claims or null if user exists
  return {
    sub: "new-user-id",
    email,
    name: data?.name || email.split('@')[0],
  } || null;
}
```

#### `requestPasswordReset(email)`
**Optional**. Initiates password reset.

```typescript
requestPasswordReset: async (email: string) => {
  // Generate token, send email
  // Return true if successful
  return true || false;
}
```

#### `resetPassword(token, newPassword)`
**Optional**. Completes password reset.

```typescript
resetPassword: async (token: string, newPassword: string) => {
  // Validate token, update password
  // Return true if successful
  return true || false;
}
```

#### `hashPassword(password)`
**Optional**. Hashes passwords.

```typescript
hashPassword: async (password: string) => {
  return await bcrypt.hash(password, 10);
}
```

#### `comparePassword(password, hash)`
**Optional**. Compares password with hash.

```typescript
comparePassword: async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
}
```

### Client-Side Functions

#### `credentialsLogin()`
Authenticates user with email/password.

```typescript
import { credentialsLogin } from "@light-auth/core/client";

const result = await credentialsLogin({
  config: { basePath: "/api/auth" },
  email: "user@example.com",
  password: "password123",
  callbackUrl: "/dashboard", // optional
});

// result: { success: boolean, session?: {...}, error?: string }
```

#### `credentialsRegister()`
Registers new user.

```typescript
import { credentialsRegister } from "@light-auth/core/client";

const result = await credentialsRegister({
  config: { basePath: "/api/auth" },
  email: "newuser@example.com",
  password: "password123",
  name: "Jane Doe", // optional
  autoLogin: true, // optional, default: true
  additionalData: { role: "user" }, // optional
});

// result: { success: boolean, session?: {...}, user?: {...}, error?: string }
```

#### `credentialsResetPasswordRequest()`
Requests password reset email.

```typescript
import { credentialsResetPasswordRequest } from "@light-auth/core/client";

const result = await credentialsResetPasswordRequest({
  config: { basePath: "/api/auth" },
  email: "user@example.com",
});

// result: { success: boolean, message?: string, error?: string }
```

#### `credentialsResetPasswordConfirm()`
Confirms password reset with token.

```typescript
import { credentialsResetPasswordConfirm } from "@light-auth/core/client";

const result = await credentialsResetPasswordConfirm({
  config: { basePath: "/api/auth" },
  token: "reset-token-from-email",
  newPassword: "newpassword123",
});

// result: { success: boolean, message?: string, error?: string }
```

## Common Patterns

### With Database (Prisma Example)

```typescript
import { createCredentialsProvider } from "@light-auth/core";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const credentialsProvider = createCredentialsProvider({
  providerName: "credentials",
  
  verifyCredentials: async (email, password) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.avatar,
    };
  },
  
  registerUser: async (email, password, { name }) => {
    try {
      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, passwordHash: hash, name: name || email.split('@')[0] },
      });
      return { sub: user.id, email: user.email, name: user.name };
    } catch (error) {
      // User already exists
      return null;
    }
  },
  
  requestPasswordReset: async (email) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return false;
    
    const token = crypto.randomUUID();
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });
    
    await sendPasswordResetEmail(email, token);
    return true;
  },
  
  resetPassword: async (token, newPassword) => {
    const reset = await prisma.passwordReset.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });
    if (!reset) return false;
    
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: hash },
    });
    await prisma.passwordReset.delete({ where: { id: reset.id } });
    
    return true;
  },
});
```

### With Supabase

```typescript
import { createCredentialsProvider } from "@light-auth/core";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const credentialsProvider = createCredentialsProvider({
  providerName: "credentials",
  
  verifyCredentials: async (email, password) => {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    
    if (!user) return null;
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;
    
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
  },
  
  registerUser: async (email, password, { name }) => {
    const hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from("users")
      .insert({ email, password_hash: hash, name })
      .select()
      .single();
    
    if (error) return null;
    return { sub: user.id, email: user.email, name: user.name };
  },
});
```

### With Rate Limiting

```typescript
import { CreateLightAuth } from "@light-auth/nextjs";
import { createLightAuthRateLimiter, createCredentialsProvider } from "@light-auth/core";

export const { handlers } = CreateLightAuth({
  providers: [credentialsProvider],
  
  // Rate limit authentication attempts
  rateLimiter: createLightAuthRateLimiter({
    timeWindowMs: 60000, // 1 minute
    maxRequestsPerTimeWindowsMs: 5, // 5 attempts per minute
    errorMessage: "Too many login attempts. Please try again later.",
    statusCode: 429,
  }),
});
```

### With Custom Claims

```typescript
verifyCredentials: async (email, password, metadata) => {
  const user = await db.users.findOne({ email });
  if (!user) return null;
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  
  // Add custom claims
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    // Custom claims
    role: user.role,
    permissions: user.permissions,
    organizationId: user.organizationId,
    isVerified: user.emailVerified,
  };
},
```

## Error Handling

### Client-Side

```typescript
const result = await credentialsLogin({ config, email, password });

if (!result.success) {
  switch (result.error) {
    case "Invalid email or password":
      // Show error message
      break;
    case "Email and password are required":
      // Validate form
      break;
    default:
      // Generic error
      break;
  }
}
```

### Server-Side

```typescript
verifyCredentials: async (email, password) => {
  try {
    // Your verification logic
    return claims;
  } catch (error) {
    console.error("Verification error:", error);
    return null; // Always return null on error
  }
}
```

## Security Best Practices

### 1. Password Requirements

```typescript
function validatePassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

registerUser: async (email, password, data) => {
  if (!validatePassword(password)) {
    return null; // Or throw error
  }
  // Continue registration
}
```

### 2. Email Verification

```typescript
registerUser: async (email, password, data) => {
  const user = await db.users.create({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    emailVerified: false, // Not verified yet
  });
  
  // Send verification email
  await sendVerificationEmail(email, user.id);
  
  return { sub: user.id, email, name: data?.name };
}
```

### 3. Account Lockout

```typescript
verifyCredentials: async (email, password) => {
  const user = await db.users.findOne({ email });
  if (!user) return null;
  
  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return null;
  }
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  
  if (!valid) {
    // Increment failed attempts
    await db.users.incrementFailedAttempts(user.id);
    if (user.failedAttempts >= 5) {
      // Lock account for 15 minutes
      await db.users.lockAccount(user.id, 15);
    }
    return null;
  }
  
  // Reset failed attempts on successful login
  await db.users.resetFailedAttempts(user.id);
  
  return { sub: user.id, email: user.email, name: user.name };
}
```

### 4. Session Invalidation on Password Change

```typescript
resetPassword: async (token, newPassword) => {
  const reset = await db.resetTokens.findValid(token);
  if (!reset) return false;
  
  // Update password
  const hash = await bcrypt.hash(newPassword, 10);
  await db.users.updatePassword(reset.userId, hash);
  
  // Invalidate all sessions for this user
  await db.sessions.deleteAllForUser(reset.userId);
  
  return true;
}
```

## Troubleshooting

### "Invalid CSRF token" Error
**Solution**: Ensure CSRF token is fetched before making requests:
```typescript
await getCsrfToken({ config });
await credentialsLogin({ config, email, password });
```

### Session Not Persisting
**Solution**: Check cookie settings and HTTPS configuration.

### "Provider must be a credentials provider"
**Solution**: Ensure provider has `type: "credentials"` or use `createCredentialsProvider()`.

### Password Not Hashing
**Solution**: Implement `hashPassword` in provider or hash manually in `registerUser`.

---

**Need Help?** Check the examples in `examples/credentials-provider-example.ts` or open an issue on GitHub.
