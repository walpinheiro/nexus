<script setup lang="ts">
import Topbar from '@/components/layout/Topbar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
</script>

<template>
  <div class="flex h-full flex-col">
    <Topbar />
    <div class="flex min-h-0 flex-1">
      <Sidebar />
      <main class="min-w-0 flex-1 overflow-auto p-4">
        <router-view />
      </main>
    </div>
  </div>
</template>
