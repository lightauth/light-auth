<script setup lang="ts">
import { getSession, getUser, signIn, signOut } from "#imports";

const session = await getSession();
const user = await getUser();

const handleGetSession = async () => {
  try {
    session.refresh();
    console.log("Session:", session?.value);
  } catch (e: any) {
    console.log(e.message || "Failed to retrieve session");
  }
};

const handleGetUser = async (forceRefresh: boolean = false) => {
  try {
    if (forceRefresh) await user.refresh();

    console.log("User:", user?.value);
  } catch (e: any) {
    console.log(e.message || "Failed to retrieve user");
  }
};
</script>

<template>
  <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
    <div class="text-center" v-if="session != null">
      <h1 class="text-2xl font-bold mb-4">You are logged in!</h1>
      <button
        @click="signOut()"
        class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        Logout
      </button>
      <!-- <p class="text-gray-600 mb-6 text-center" v-if="userData != null">{{ userData?.name }}</p> -->
      <p class="text-gray-600 mb-6 text-center" v-if="user != null">{{ user?.firstName }} {{ user?.lastName }} {{ user?.iss }}</p>
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
          <NuxtImg src="google.svg" alt="Google" class="h-4 w-4" /> Sign in with Google using POST action
        </button>
      </form>

      <button
        @click="signIn('google')"
        class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <NuxtImg src="google.svg" alt="Google" class="h-4 w-4" /> Sign in with Google using POST action Sign in with Google from Client side
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
        @click="signIn('microsoft')"
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
</template>
