import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import CanvasView from '@/views/CanvasView.vue'
import BacklogView from '@/views/BacklogView.vue'
import GateView from '@/views/GateView.vue'
import UsersView from '@/views/UsersView.vue'
import StudioView from '@/views/StudioView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/canvas', name: 'canvas', component: CanvasView },
  { path: '/studio', redirect: (to) => ({ path: '/studio-full', query: to.query }) },
  { path: '/studio-full', name: 'studio', component: StudioView, meta: { layout: 'studio' } },
  { path: '/backlog', name: 'backlog', component: BacklogView },
  { path: '/gates/:id', name: 'gate', component: GateView, props: true },
  { path: '/usuarios', name: 'usuarios', component: UsersView },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
