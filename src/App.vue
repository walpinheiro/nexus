<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '@/components/layout/Topbar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'

const route = useRoute()
const isStudio = computed(() => (route.meta as Record<string, unknown>).layout === 'studio')

watch(
  isStudio,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
  },
  { immediate: true }
)
</script>

<template>
  <transition name="studio" mode="out-in">
    <div v-if="isStudio" key="studio" class="h-screen w-screen overflow-hidden">
      <router-view />
    </div>
    <div v-else key="shell" class="flex h-full flex-col">
      <Topbar />
      <div class="flex min-h-0 flex-1">
        <Sidebar />
        <main class="min-w-0 flex-1 overflow-auto p-4">
          <router-view />
        </main>
      </div>
    </div>
  </transition>
</template>
