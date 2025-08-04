"use client";

import { CreateLightAuthClient } from "@light-auth/tanstack-react-start/client";
import { MyLightAuthSession, MyLightAuthUser } from "./auth-session-user";

export const { getAuthSession, setAuthSession, getUser, signIn, signOut }
    = CreateLightAuthClient<MyLightAuthSession, MyLightAuthUser>();
 