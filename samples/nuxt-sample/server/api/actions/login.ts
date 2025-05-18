import { H3Event } from "h3";
import { signIn } from "~/utils/auth";

export default defineEventHandler(async (event: H3Event) => {
  const querieObjects = getQuery(event);
  console.log("querieObjects", querieObjects);
  const providerName = querieObjects.providerName?.toString() ?? "google";
  const callbackUrl = querieObjects.callbackUrl?.toString() ?? "/";
  await signIn(providerName, callbackUrl, event);
});
