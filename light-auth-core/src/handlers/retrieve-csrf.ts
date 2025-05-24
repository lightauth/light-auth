import { type LightAuthSession, type LightAuthUser, type LightAuthConfig, type BaseResponse } from "../models";
import { buildSecret, checkConfig, createCsrfToken } from "../services";

export async function getCsrfToken<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  [key: string]: unknown;
}): Promise<BaseResponse> {
  const { config } = args;
  const { router, env, basePath } = checkConfig<Session, User>(config);
  const secret = buildSecret(env);

  // create a new csrf token
  const csrfToken = createCsrfToken(secret);
  return router.returnJson({ env, basePath, data: csrfToken, ...args });
}
