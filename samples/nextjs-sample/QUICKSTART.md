# Next.js Sample - Credentials Authentication Quick Start

This guide will help you get the Next.js sample running with credentials authentication in under 5 minutes.

## ✅ Prerequisites

- Node.js 18+ installed
- npm or yarn

## 🚀 Quick Setup

### 1. Navigate to Sample Directory

```bash
cd samples/nextjs-sample
```

### 2. Install Dependencies

```bash
npm install
```

Dependencies include:
- `@light-auth/nextjs` - Light Auth framework adapter
- `bcrypt` - Password hashing
- `@radix-ui/*` - UI components
- `tailwindcss` - Styling

### 3. Create Environment File

Create `.env.local`:

```bash
LIGHT_AUTH_SECRET=your-secret-key-minimum-32-characters-long-random-string
```

> **Note**: For OAuth providers (Google/Microsoft), add their credentials too. See README.md for details.

### 4. Start Development Server

```bash
npm run dev
```

### 5. Test the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. Navigate to [/login](http://localhost:3000/login)
3. Try the demo credentials:
   - **Email**: `email@example.com`
   - **Password**: `password123`

## 🎯 What You Get

### Three Login Methods

The login page has **3 tabs**:

1. **Credentials Tab**
   - Email/password login
   - Demo user: `email@example.com` / `password123`

2. **OAuth Tab**
   - Google sign-in (if configured)
   - Microsoft sign-in (if configured)

3. **Register Tab**
   - Create new accounts
   - Auto-login after registration

### Authentication Flow

```
Login Page → Enter Credentials → Authenticate → Profile Page
     ↓
  Register → Create Account → Auto Login → Profile Page
     ↓
  OAuth → Provider Login → Callback → Profile Page
```

## 🔧 Customization

### Add Your Own Users

Edit `lib/credentials-provider.ts`:

```typescript
// Add more demo users
const newUser: User = {
  id: "user-2",
  email: "test@example.com",
  passwordHash: await bcrypt.hash("yourpassword", 10),
  name: "Test User",
  createdAt: new Date(),
};
users.set(newUser.email, newUser);
```

### Switch to Database

Replace the in-memory store with Prisma:

1. Install Prisma:
```bash
npm install -D prisma @prisma/client
npx prisma init
```

2. Copy schema:
```bash
cp prisma-schema-example.prisma prisma/schema.prisma
```

3. Update `.env.local`:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

4. Run migrations:
```bash
npx prisma migrate dev --name init
```

5. Update `lib/auth.ts`:
```typescript
import { credentialsProviderWithPrisma } from "./credentials-provider-prisma-example";

// Replace credentialsProvider with:
providers: [credentialsProviderWithPrisma, googleProvider, microsoftProvider]
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `lib/credentials-provider.ts` | In-memory user store and authentication logic |
| `lib/auth.ts` | Light Auth configuration with all providers |
| `components/credentials-login-form.tsx` | Email/password login form |
| `components/credentials-register-form.tsx` | User registration form |
| `app/login/page.tsx` | Login page with tabs |
| `app/api/auth/[...auth]/route.ts` | API route handler |

## 🔍 Testing Features

### Test Login

1. Go to `/login`
2. Click "Credentials" tab
3. Enter: `email@example.com` / `password123`
4. Click "Login"
5. Should redirect to `/profile`

### Test Registration

1. Go to `/login`
2. Click "Register" tab
3. Enter name, email, password
4. Click "Create Account"
5. Should auto-login and redirect to `/profile`

### Test OAuth (if configured)

1. Go to `/login`
2. Click "OAuth" tab
3. Click "Login with Google" or "Microsoft"
4. Complete OAuth flow
5. Should redirect to `/profile`

## ⚠️ Common Issues

### "Module not found" errors
- Run `npm install` again
- Make sure you're in `samples/nextjs-sample` directory

### "Invalid CSRF token"
- Clear browser cookies
- Restart dev server

### OAuth not working
- Check environment variables
- Verify redirect URLs match OAuth provider settings
- Google: `http://localhost:3000/api/auth/callback/google`
- Microsoft: `http://localhost:3000/api/auth/callback/microsoft`

### Session not persisting
- Check `LIGHT_AUTH_SECRET` is set
- Use HTTPS in production
- Check cookie settings in browser

## 🎓 Next Steps

1. **Customize the UI**: Edit components in `components/`
2. **Add password reset**: Implement email sending
3. **Add email verification**: Extend registration flow
4. **Deploy**: Push to Vercel or your preferred platform
5. **Add database**: Follow Prisma setup above

## 📚 More Resources

- [Credentials Usage Guide](../../CREDENTIALS_USAGE_GUIDE.md)
- [Light Auth Core Docs](../../light-auth-core/)

## ✨ That's It!

You now have a working authentication system with:
- ✅ Email/password authentication
- ✅ OAuth providers
- ✅ Secure password hashing
- ✅ Session management
- ✅ User registration
- ✅ CSRF protection

**Happy coding!** 🚀
