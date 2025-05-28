<script setup lang="ts">
import { CreateLightAuthClient } from "@light-auth/nuxt/client";
const { useSession } = CreateLightAuthClient();
const { data: session, refresh: refreshSession } = useSession();
</script>

<template>
  <div>
    <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <div class="text-center" v-if="session">
        <h1 class="text-2xl font-bold mb-4">You are logged in!</h1>
        <p class="text-gray-600 mb-6 text-center" v-if="session">{{ session.email }}</p>
      </div>
      <div class="text-center" v-if="!session">
        <h1 class="text-2xl font-bold mb-4">You are not logged in!</h1>
        <a
          href="/login"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Login
        </a>
      </div>
    </div>
  </div>
</template>
