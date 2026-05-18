<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="brand-icon">◈</span>
        <h1>Finanças <em>Pessoais</em></h1>
      </div>
      <p class="subtitle">Acesse sua conta</p>

      <form @submit.prevent="login">
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" placeholder="seu@email.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="password">Senha</label>
          <div class="input-eye">
            <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'"
                   placeholder="••••••••" required autocomplete="current-password" />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword" :title="showPassword ? 'Ocultar' : 'Mostrar'">
              <span v-if="showPassword">◡</span>
              <span v-else>◉</span>
            </button>
          </div>
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button class="btn btn-primary" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Entrar</span>
        </button>
      </form>

      <p class="switch">Não tem conta? <RouterLink to="/register">Criar conta</RouterLink></p>
    </div>

    <div class="auth-deco" aria-hidden="true">
      <div class="deco-ring deco-ring-1"></div>
      <div class="deco-ring deco-ring-2"></div>
      <div class="deco-ring deco-ring-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)

async function login() {
  error.value = ''
  loading.value = true
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  loading.value = false
  if (err) { error.value = err.message; return }
  router.push('/')
}
</script>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}

.auth-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2.75rem;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 20px 48px rgba(0,0,0,0.25), 0 0 0 1px rgba(212,168,83,0.05);
  position: relative;
  z-index: 1;
  animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  justify-content: center;
}

.brand-icon {
  color: var(--gold);
  font-size: 1.4rem;
}

h1 {
  font-family: var(--font-body);
  font-size: 1.15rem;
  font-weight: 500;
  color: var(--text);
}

h1 em {
  font-style: italic;
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 1.2rem;
}

.subtitle {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: -0.75rem;
}

form { display: flex; flex-direction: column; gap: 1rem; }

.switch {
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-muted);
}
.switch a {
  color: var(--gold);
  text-decoration: none;
  font-weight: 500;
}
.switch a:hover { text-decoration: underline; }

/* Decorative rings */
.auth-deco { position: absolute; inset: 0; pointer-events: none; }
.deco-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--gold);
  filter: blur(2px);
  animation: pulse 8s infinite alternate ease-in-out;
}
.deco-ring-1 { width: 500px; height: 500px; top: -200px; right: -200px; opacity: 0.08; animation-delay: 0s; }
.deco-ring-2 { width: 350px; height: 350px; bottom: -150px; left: -100px; opacity: 0.06; animation-delay: -3s; }
.deco-ring-3 { width: 200px; height: 200px; top: 50%; left: -80px; opacity: 0.04; animation-delay: -6s; }

/* Spinner */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(12,10,9,0.3);
  border-top-color: #0c0a09;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes pulse {
  0% { transform: scale(1) translate(0, 0); opacity: 0.04; }
  100% { transform: scale(1.05) translate(10px, -10px); opacity: 0.12; }
}
</style>
