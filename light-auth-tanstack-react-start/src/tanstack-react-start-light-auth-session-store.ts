import {
  buildSecret,
  type LightAuthServerEnv,
  type LightAuthSession,
  type LightAuthSessionStore,
} from "@light-auth/core";

import { useSession } from '@tanstack/react-start/server'

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const tanstackReactStartLightAuthSessionStore: LightAuthSessionStore = {
  async getSession<Session extends LightAuthSession = LightAuthSession>({
    env,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
  }): Promise<Session | null> {

    try {
      const session = await useSession<Session>({ password: buildSecret(env) });
      return session.data || null;
    } catch (error) {
      console.error("Failed to get session using tanstack useSession hook:", error);
      return null;
    }
  },

  async deleteSession<Session extends LightAuthSession = LightAuthSession>({
    env
  }: {
    env: LightAuthServerEnv;
    basePath: string;
  }): Promise<void> {

    try {
      const session = await useSession<Session>({ password: buildSecret(env) });
      await session.clear();

    } catch (error) {
      console.error("Failed to delete session using tanstack useSession hook:", error);
    }
  },

  async setSession<Session extends LightAuthSession = LightAuthSession>({
    env,
    session,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    session: Session;
  }): Promise<Session> {

    const tsSession = await useSession<Session>({
      password: buildSecret(env)
    });
    tsSession.update(session)

    return tsSession.data;
  },
  generateSessionId(): string {
    return Math.random().toString(36).slice(2);
  },
};
