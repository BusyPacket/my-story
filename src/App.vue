<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import AppNav from '@/components/AppNav.vue'

const showBackToTop = ref(false)

function onScroll(): void {
  showBackToTop.value = window.scrollY > 400
}

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="app-shell">
    <AppNav />
    <router-view />
    <button
      v-if="showBackToTop"
      type="button"
      class="back-to-top"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      ↑
    </button>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.back-to-top {
  position: fixed;
  right: 20px;
  bottom: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-card-bg);
  color: var(--color-text);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.back-to-top:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
}
</style>
