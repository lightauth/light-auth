# Light Auth - Next.js Sample with Credentials Authentication

This is a [Next.js](https://nextjs.org) sample application demonstrating **Light Auth** with both **OAuth** (Google, Microsoft) and **Credentials** (email/password) authentication.

## 🚀 Features

- ✅ **Credentials Authentication** - Email/password login and registration
- ✅ **OAuth Authentication** - Google and Microsoft sign-in
- ✅ **Mixed Authentication** - Use both OAuth and credentials in one app
- ✅ **In-Memory Storage** - Demo user store (replace with database for production)
- ✅ **Secure Password Hashing** - Using bcrypt
- ✅ **Modern UI** - Built with Radix UI and Tailwind CSS
- ✅ **TypeScript** - Full type safety

## 🎯 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```bash
# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

MICROSOFT_ENTRA_ID_TENANT_ID=your_tenant_id
MICROSOFT_ENTRA_ID_CLIENT_ID=your_client_id
MICROSOFT_ENTRA_ID_CLIENT_SECRET=your_client_secret

# Supabase (optional - for database storage)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Light Auth Secret (required)
LIGHT_AUTH_SECRET=your_random_secret_key_min_32_chars
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to `/login`.

## 🔐 Demo Credentials

The sample includes a demo user for testing:

- **Email**: `email@example.com`
- **Password**: `password123`

## 📚 Authentication Methods

### Credentials Authentication

The login page has three tabs:

1. **Credentials Tab** - Login with email/password
2. **OAuth Tab** - Login with Google or Microsoft
3. **Register Tab** - Create a new account

### Implementation Files

- **Provider**: `lib/credentials-provider.ts` - In-memory user store
- **Login Form**: `components/credentials-login-form.tsx`
- **Register Form**: `components/credentials-register-form.tsx`
- **Configuration**: `lib/auth.ts` - Light Auth setup

## 💾 Using a Database (Production)

The sample uses an in-memory store for demo purposes. For production, see:

### Option 1: Prisma

1. Install Prisma:
```bash
npm install -D prisma @prisma/client
npx prisma init
```

2. Copy the schema from `prisma-schema-example.prisma` to `prisma/schema.prisma`

3. Update your DATABASE_URL in `.env`

4. Run migrations:
```bash
npx prisma migrate dev --name init
```

5. Replace `lib/credentials-provider.ts` with the code from `lib/credentials-provider-prisma-example.ts`

### Option 2: Supabase

See `lib/light-auth-supabase-user-adapter.ts` for an example of using Supabase.

### Option 3: Any Database

Create your own implementation by following the pattern in `lib/credentials-provider.ts`:

```typescript
verifyCredentials: async (email, password) => {
  // Your database lookup
  const user = await db.users.findOne({ email });
  // Verify password
  // Return user claims
},
registerUser: async (email, password, { name }) => {
  // Your database insert
  // Return user claims
}
```

## 🔒 Security Features

The sample demonstrates:

- **Password Hashing** - Using bcrypt with salt rounds
- **CSRF Protection** - Automatic CSRF token validation
- **HTTP-Only Cookies** - Secure session storage
- **Rate Limiting** - Configurable request limits
- **Account Lockout** - (See Prisma example for implementation)

## 📖 Learn More

### Light Auth Documentation

- [Credentials Usage Guide](../../CREDENTIALS_USAGE_GUIDE.md) - Complete guide
- [Implementation Details](../../PHASE_2_COMPLETE.md) - Technical specs
- [Quick Reference](../../QUICK_REFERENCE.md) - API reference

### Next.js Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import to [Vercel](https://vercel.com/new)
3. Add environment variables
4. Deploy!

### Other Platforms

Works on any Node.js hosting platform:
- Railway
- Render
- AWS
- Digital Ocean
- etc.

## 📝 Project Structure

```
samples/nextjs-sample/
├── app/
│   ├── login/page.tsx           # Login page with tabs
│   ├── profile/                 # Protected profile page
│   └── api/auth/[...auth]/      # Light Auth API routes
├── components/
│   ├── credentials-login-form.tsx   # Email/password login
│   ├── credentials-register-form.tsx # Registration form
│   └── ui/                          # Radix UI components
├── lib/
│   ├── auth.ts                      # Light Auth configuration
│   ├── credentials-provider.ts      # In-memory provider
│   └── credentials-provider-prisma-example.ts # Prisma example
└── prisma-schema-example.prisma     # Database schema

```

## 🤝 Contributing

This is a sample application. Feel free to:
- Report issues
- Submit improvements
- Share your implementations

## 📄 License

MIT License - See LICENSE file for details
