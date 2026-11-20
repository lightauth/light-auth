"use client";

import { updateSessionFirstName } from "@/app/api/session/action";
import { Button } from "./ui/button";
export function ClientSetSessionButton() {
  return (
    <Button
      type="button"
      onClick={async () => {
        const updatedSession = await updateSessionFirstName();
        if (!updatedSession) {
          console.error("No session found. Please sign in first.");
          return;
        }
        console.log("Updated Session:", updatedSession);
      }}
      variant="outline"
      className="w-full"
    >
      Update session from a server action !
    </Button>
  );
}
