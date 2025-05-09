"use client";

import { signOut } from "@/lib/auth-client";
import { Button } from "../ui/button";

export function ClientLogoutButton() {
  return (
    <Button
      type="button"
      onClick={() => signOut()}
      variant="outline"
      className="w-full"
    >
      Logout Client Side
    </Button>
  );
}
