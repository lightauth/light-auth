"use client";
import { CreateLightAuthClient } from "@light-auth/nextjs/client";
export const { signIn, signOut, getSession, getUser } = CreateLightAuthClient();
