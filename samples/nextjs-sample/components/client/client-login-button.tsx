"use client";

import { signIn } from "@/lib/auth-client";
import { Button } from "../ui/button";
import Image from "next/image";
import googleSvg from "@/public/google.svg";

export function ClientLoginButton({ children, providerName, callbackUrl }: { children: React.ReactNode; providerName: string; callbackUrl: string }) {
  return (
    <Button type="button" onClick={() => signIn(providerName, callbackUrl)} variant="outline" className="w-full">
      <Image src={googleSvg} alt="Google" width={18} height={18} />
      {children}
    </Button>
  );
}
