"use server";

import { signIn, signOut } from "@/lib/auth";

export async function login(providerName: string, callbackUrl: string = "/") {
  return await signIn(providerName, callbackUrl);
}

export async function logout(callbackUrl: string = "/", revokeToken: boolean = false) {
  return await signOut(revokeToken, callbackUrl);
}
