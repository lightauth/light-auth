"use client";

import { getSession, getUser } from "@/lib/auth-client";
import { Button } from "./ui/button";
export function ClientFetchSessionButton() {
  return (
    <Button
      type="button"
      onClick={async () => {
        const session = await getSession();
        console.log("Session:", session);
        const user = await getUser();
        console.log("User:", user);
      }}
      variant="outline"
      className="w-full"
    >
      Fetch Session from client side
    </Button>
  );
}
