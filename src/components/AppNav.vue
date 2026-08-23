<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()

const navLinks = [
  { to: '/timeline', label: '历史' },
  { to: '/asset', label: '资产' },
]
</script>

<template>
  <header class="app-nav">
    <div class="app-nav__inner">
      <RouterLink to="/timeline" class="app-nav__brand">我的故事</RouterLink>

      <nav class="app-nav__links" aria-label="主导航">
        <RouterLink v-for="link in navLinks" :key="link.to" :to="link.to" class="app-nav__link">
          {{ link.label }}
        </RouterLink>
      </nav>

      <button
        type="button"
        class="app-nav__theme"
        :title="theme === 'dark' ? '切换到白天模式' : '切换到夜间模式'"
        :aria-label="theme === 'dark' ? '切换到白天模式' : '切换到夜间模式'"
        @click="toggleTheme"
      >
        {{ theme === 'dark' ? '🌙' : '☀️' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.app-nav__inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.app-nav__brand {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
}

.app-nav__links {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.app-nav__link {
  padding: 6px 12px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.app-nav__link:hover {
  color: var(--color-text);
  background: var(--color-bg-secondary);
}

.app-nav__link.router-link-active {
  color: var(--color-primary);
  background: var(--color-bg-secondary);
  font-weight: 600;
}

.app-nav__theme {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-card-bg);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.app-nav__theme:hover {
  border-color: var(--color-border-strong);
}
</style>
