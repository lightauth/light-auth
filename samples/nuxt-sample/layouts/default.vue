<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <header class="bg-white shadow-sm py-4 px-6">
      <div class="container mx-auto flex justify-between items-center">
        <NuxtLink to="/" class="text-xl font-bold text-gray-800">Nuxt Auth Demo</NuxtLink>
        <!-- <div v-if="status === 'authenticated'">
          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-600">Welcome, {{ data?.user?.name }}</span>
            <LogoutButton />
          </div>
        </div> -->
      </div>
    </header>

    <main class="flex-grow container mx-auto py-8 px-6">
      <slot />
    </main>

    <footer class="bg-white py-4 px-6 border-t">
      <div class="container mx-auto text-center text-gray-500 text-sm">
        &copy; {{ new Date().getFullYear() }} Nuxt Auth Demo
      </div>
    </footer>
  </div>
</template>

