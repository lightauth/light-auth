import { LightAuthConfig } from "../models";
import { checkConfig } from "../services/utils";

export async function getUserHandler(args: { config: LightAuthConfig; id: string; [key: string]: unknown }): Promise<Response> {
  const { config, id } = args;
  const { router, userAdapter } = checkConfig(config);
  try {
    const user = await userAdapter.getUser({ ...args });
    if (user == null) return await router.returnJson({ data: null, ...args });
    return await router.returnJson({ data: user, ...args });
  } catch (error) {
    console.error("Failed to get user:", error);
    return await router.returnJson({ data: null, ...args });
  }
}
