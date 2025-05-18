<template>
  <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
    <h1 class="text-2xl font-bold mb-6">Your Profile</h1>
    
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input 
          v-model="profile.name" 
          type="text" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input 
          v-model="profile.email" 
          type="email" 
          disabled
          class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
        />
        <p class="text-xs text-gray-500 mt-1">Email cannot be changed</p>
      </div>
      
      <button 
        @click="saveProfile" 
        class="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
      >
        Save Changes
      </button>
    </div>
  </div>
</template>

<script setup>
import { definePageMeta } from '#imports'
import { ref } from 'vue'

// definePageMeta({
//   middleware: ['auth']
// })

// const { data } = useAuth()
// const profile = ref({
//   name: data.value?.user?.name || '',
//   email: data.value?.user?.email || ''
// })

const saveProfile = async () => {
  // Here you would implement the API call to save profile changes
  // For example:
  // await $fetch('/api/user/profile', {
  //   method: 'POST',
  //   body: profile.value
  // })
  
  alert('Profile saved successfully!')
}
</script>