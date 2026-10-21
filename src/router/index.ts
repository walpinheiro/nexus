import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/canvas', name: 'canvas', component: () => import('@/views/CanvasView.vue') },
  { path: '/studio', redirect: (to) => ({ path: '/studio-full', query: to.query }) },
  { path: '/studio-full', name: 'studio', component: () => import('@/views/StudioView.vue'), meta: { layout: 'studio' } },
  { path: '/backlog', name: 'backlog', component: () => import('@/views/BacklogView.vue') },
  { path: '/gates/:id', name: 'gate', component: () => import('@/views/GateView.vue'), props: true },
  { path: '/usuarios', name: 'usuarios', component: () => import('@/views/UsersView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
