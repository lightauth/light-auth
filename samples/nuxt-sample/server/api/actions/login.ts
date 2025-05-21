import { H3Event } from "h3";
import { signIn } from "~/server/auth";

export default defineEventHandler(async (event: H3Event) => {
  const querieObjects = getQuery(event);
  const providerName = querieObjects.providerName?.toString() ?? "google";
  const callbackUrl = querieObjects.callbackUrl?.toString() ?? "/";
  await signIn(providerName, callbackUrl, event);
});
