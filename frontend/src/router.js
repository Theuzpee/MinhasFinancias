import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from './supabase'

const routes = [
  { path: '/login',    component: () => import('./views/Login.vue'),    meta: { public: true } },
  { path: '/register', component: () => import('./views/Register.vue'), meta: { public: true } },
  { path: '/',         component: () => import('./views/Dashboard.vue') },
  { path: '/metas',    component: () => import('./views/Metas.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!to.meta.public && !session) return '/login'
  if (to.meta.public && session) return '/'
})

export default router
