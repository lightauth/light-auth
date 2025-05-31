import { createClient } from "@supabase/supabase-js";
import { LightAuthServerEnv, LightAuthSession, LightAuthUser, LightAuthUserAdapter } from "@light-auth/core";

const getSupabaseClient = (env: LightAuthServerEnv) => {
  if (!env["SUPABASE_URL"] || !env["SUPABASE_KEY"]) throw new Error("Supabase URL and Key are required in the environment variables.");
  return createClient(env["SUPABASE_URL"], env["SUPABASE_KEY"]);
};

export const lightAuthSupabaseUserAdapter: LightAuthUserAdapter = {
  getUser: async function <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    env: LightAuthServerEnv;
    userId: string | number;
  }): Promise<User | null> {
    const { userId } = args;
    const supabase = getSupabaseClient(args.env);
    const { error, data } = await supabase.from("users").select("*").eq("userId", userId.toString()).single();

    if (error) {
      return null;
    }

    return data;
  },

  setUser: async function <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    env: LightAuthServerEnv;
    user: User;
  }): Promise<void> {
    const supabase = getSupabaseClient(args.env);
    const { error } = await supabase.from("users").upsert(args.user).select();

    if (error) console.error("Error setting user:", error);
  },
  deleteUser: async function <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    env: LightAuthServerEnv;
    user: User;
  }): Promise<void> {
    const supabase = getSupabaseClient(args.env);
    // we don't want to delete the user from the database, just remove the access token and refresh token
    const { error } = await supabase.from("users").upsert({
      userId: args.user.userId,
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
    });

    if (error) console.error("Error setting user:", error);
  },
};
