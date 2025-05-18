<template>
  <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
    <p class="font-medium">Authentication Error</p>
    <p class="text-sm">{{ error }}</p>
  </div>
</template>

<script setup>
defineProps({
  error: {
    type: String,
    default: ''
  }
})
</script>