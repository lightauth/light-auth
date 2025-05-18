<script setup lang="ts">
import { ref } from "vue";

import { getSession, getUser, signIn } from "#imports";
import type { LightAuthUser } from "@light-auth/core";

// const user = await getUser();
const session = await getSession();
const userResult = await getUser();
const userRefData = userResult?.user;
const refreshUser = userResult?.refresh;

console.log("Session:", session);

const handleSignIn = async (providerName: string) => {
  try {
    await signIn(providerName);
  } catch (e: any) {
    console.log(e.message || "Failed to retrieve session");
  }
};

const handleSignOut = async () => await signOut(true);

const handleGetSession = async () => {
  try {
    const session = await getSession();
    console.log("Session:", session);
  } catch (e: any) {
    console.log(e.message || "Failed to retrieve session");
  }
};

const handleGetUser = async (forceRefresh: boolean = false) => {
  try {
    // if (forceRefresh) refresh();
    if (forceRefresh && refreshUser) refreshUser();
  } catch (e: any) {
    console.log(e.message || "Failed to retrieve user");
  }
};
</script>

<template>
  <div>
    <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <div class="text-center" v-if="session != null">
        <h1 class="text-2xl font-bold mb-4">You are logged in!</h1>
        <button
          @click="handleSignOut()"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Logout
        </button>
        <!-- <p class="text-gray-600 mb-6 text-center" v-if="userData != null">{{ userData?.name }}</p> -->
        <p class="text-gray-600 mb-6 text-center" v-if="userRefData != null">{{ userRefData?.name }}</p>
      </div>

      <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">Login</h2>
      <p class="text-gray-600 mb-6 text-center">Please sign in using one of the following providers:</p>

      <div class="space-y-4">
        <form action="api/actions/login" method="POST" class="flex flex-col gap-4">
          <input type="hidden" name="providerName" value="google" />
          <input type="hidden" name="callbackUrl" value="/dashboard" />
          <button
            type="submit"
            class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Sign in with Google using POST action
          </button>
        </form>

        <button
          @click="handleSignIn('google')"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Sign in with Google from Client side
        </button>

        <button
          @click="handleGetSession()"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <span>retrieve session</span>
        </button>

        <button
          @click="handleGetUser()"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <span>retrieve cached user</span>
        </button>

        <button
          @click="handleGetUser(true)"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <span>retrieve and refresh user</span>
        </button>

        <button
          @click="handleSignIn('microsoft')"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-blue-500"
          >
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
          <span>Sign in with Microsoft</span>
        </button>
      </div>
    </div>
  </div>
</template>
