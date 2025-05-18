<template>
  <div>
    <button 
      @click="showConfirm = true" 
      class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
    >
      Logout
    </button>
    
    <!-- Confirmation Dialog -->
    <div v-if="showConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-sm mx-auto">
        <h3 class="text-lg font-medium mb-4">Confirm Logout</h3>
        <p class="mb-4">Are you sure you want to log out?</p>
        <div class="flex justify-end gap-2">
          <button 
            @click="showConfirm = false" 
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button 
            @click="confirmLogout" 
            class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const showConfirm = ref(false)

const confirmLogout = async () => {
  await signOut()
  showConfirm.value = false
}
</script>