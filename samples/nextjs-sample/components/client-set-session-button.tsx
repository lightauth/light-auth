"use client";

import { getAuthSession, setAuthSession } from "@/lib/auth-client";
import { Button } from "./ui/button";
export function ClientSetSessionButton() {
  return (
    <Button
      type="button"
      onClick={async () => {
        const session = await getAuthSession();
        console.log("Session:", session);
        if (!session) {
          console.error("No session found. Please sign in first.");
          return;
        }
        session.email = "john.doe@whatever.com";
        const updatedSession = await setAuthSession(session);
        console.log("Updated Session:", updatedSession);
      }}
      variant="outline"
      className="w-full"
    >
      Set Session from client side !
    </Button>
  );
}
