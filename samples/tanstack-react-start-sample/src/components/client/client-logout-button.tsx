"use client";

import { signOut } from "@/lib/auth-client";
import { Button } from "../ui/button";

export function ClientLogoutButton() {
  return (
    <Button type="button" onClick={() => signOut(true, "/")} variant="outline" className="w-full">
      Logout from Client Side with revoke token
    </Button>
  );
}
