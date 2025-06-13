"use client";

import { getAuthSession, getUser } from "@/lib/auth-client";
import { Button } from "./ui/button";
export function ClientFetchSessionButton() {
  return (
    <Button
      type="button"
      onClick={async () => {
        const session = await getAuthSession();
        console.log("Session:", session);
        const user = await getUser(session?.providerUserId.toString());
        console.log("User:", user);
      }}
      variant="outline"
      className="w-full"
    >
      Fetch Session from client side !
    </Button>
  );
}
