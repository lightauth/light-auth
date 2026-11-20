"use server";

import { getAuthSession, setAuthSession } from "@/lib/auth";

// Sessions can only be written by server code: the new values must come from trusted server logic, never from the client
export async function updateSessionFirstName() {
  const session = await getAuthSession();
  if (!session) return null;

  session.firstName = "John";
  return await setAuthSession(session);
}
