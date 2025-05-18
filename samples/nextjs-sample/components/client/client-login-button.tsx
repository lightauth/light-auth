"use client";

import { signIn } from "@/lib/auth";
import { Button } from "../ui/button";
import Image from "next/image";
import googleSvg from "@/public/google.svg";

export function ClientLoginButton() {
  return (
    <Button type="button" onClick={() => signIn("google")} variant="outline" className="w-full">
      <Image src={googleSvg} alt="Google" width={18} height={18} />
      Login with Google client Signin
    </Button>
  );
}
