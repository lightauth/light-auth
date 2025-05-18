<template>
  <div class="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
    <h2 class="text-2xl font-bold text-gray-800 mb-4">Welcome to the Dashboard</h2>
    <div class="bg-gray-100 p-4 rounded-md mb-6">
      <h3 class="font-medium text-gray-700 mb-2">User Information</h3>
      <p><strong>Name:</strong> {{ data?.user?.name }}</p>
      <p><strong>Email:</strong> {{ data?.user?.email }}</p>
      <p><strong>Provider:</strong> {{ data?.user?.provider }}</p>
    </div>
    
    <div class="flex gap-4">
      <NuxtLink 
        to="/profile" 
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Edit Profile
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
// import { definePageMeta } from '#imports'

// definePageMeta({
//   middleware: ['auth']
// })


</script>