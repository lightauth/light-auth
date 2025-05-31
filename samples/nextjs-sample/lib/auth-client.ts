"use client";

import { CreateLightAuthClient } from "@light-auth/nextjs/client";
import { MyLightAuthSession, MyLightAuthUser } from "./auth-session-user";

export const { getAuthSession, setAuthSession, getUser, signIn, signOut } = CreateLightAuthClient<MyLightAuthSession, MyLightAuthUser>();
