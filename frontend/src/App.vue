<template>
  <div :data-theme="theme">
    <header v-if="session">
      <div class="header-brand">
        <span class="brand-icon">◈</span>
        <span class="brand-name">Finanças <em>Pessoais</em></span>
      </div>
      <nav>
        <RouterLink to="/">Painel</RouterLink>
        <RouterLink to="/metas">Metas</RouterLink>
        <RouterLink to="/importar">Importar</RouterLink>
        <RouterLink to="/perfil">Perfil</RouterLink>
      </nav>
      <div class="header-actions">
        <button class="btn-icon" @click="toggleTheme" :title="theme === 'dark' ? 'Modo claro' : 'Modo escuro'">
          <span v-if="theme === 'dark'">☀</span>
          <span v-else>☽</span>
        </button>
        <button class="btn-logout" @click="logout">Sair</button>
      </div>
    </header>
    <RouterView />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './supabase'

const router = useRouter()
const session = ref(null)
const theme = ref(localStorage.getItem('theme') || 'dark')

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  supabase.auth.onAuthStateChange((_, s) => { session.value = s })
  document.documentElement.setAttribute('data-theme', theme.value)
})

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
}

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<style scoped>
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text);
}

.brand-icon {
  color: var(--gold);
  font-size: 1.1rem;
  line-height: 1;
}

.brand-name em {
  font-style: italic;
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 1rem;
}

nav {
  display: flex;
  gap: 0.25rem;
}

nav a {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

nav a:hover { color: var(--text); background: var(--surface2); }
nav a.router-link-active {
  color: var(--gold);
  background: var(--gold-dim);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-icon:hover { color: var(--gold); border-color: var(--gold); background: var(--gold-dim); }

.btn-logout {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-logout:hover { border-color: var(--red); color: var(--red); background: var(--red-dim); }
</style>
