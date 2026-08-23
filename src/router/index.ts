import { createRouter, createWebHistory } from 'vue-router'

import StoryDetailView from '@/views/StoryDetailView.vue'
import TimelineView from '@/views/TimelineView.vue'
import AssetView from '@/views/AssetView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/timeline',
    },
    {
      path: '/timeline',
      name: 'timeline',
      component: TimelineView,
    },
    {
      path: '/story/:id',
      name: 'story-detail',
      component: StoryDetailView,
    },
    {
      path: '/asset',
      name: 'asset',
      component: AssetView,
    },
  ],
})

export default router
