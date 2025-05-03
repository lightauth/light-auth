"use client";

import { SessionProvider } from "@light-auth/nextjs/client";

export default function ClientComponent() {
  return (
    <div>
      <SessionProvider>
        <h1>Client Component</h1>
        <p>This is a client component.</p>
      </SessionProvider>
    </div>
  );
}
