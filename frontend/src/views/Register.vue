<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="brand-icon">◈</span>
        <h1>Finanças <em>Pessoais</em></h1>
      </div>
      <p class="subtitle">Crie sua conta gratuita</p>

      <form @submit.prevent="register">
        <div class="form-group">
          <label for="name">Nome</label>
          <input id="name" v-model="name" type="text" placeholder="Seu nome" required autocomplete="name" />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" placeholder="seu@email.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="whatsapp">WhatsApp <span class="optional">(para alertas)</span></label>
          <div class="input-flag">
            <span class="flag">🇧🇷 +55</span>
            <input id="whatsapp" v-model="whatsapp" type="tel"
                   placeholder="(11) 99999-9999" autocomplete="tel"
                   @input="maskWhatsapp" maxlength="15" />
          </div>
        </div>
        <div class="form-group">
          <label for="password">Senha</label>
          <div class="input-eye">
            <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'"
                   placeholder="Mínimo 6 caracteres" minlength="6" required autocomplete="new-password" />
            <button type="button" class="eye-btn" @click="showPassword = !showPassword" :title="showPassword ? 'Ocultar' : 'Mostrar'">
              <span v-if="showPassword">◡</span>
              <span v-else>◉</span>
            </button>
          </div>
        </div>
        <div class="form-group">
          <label for="confirm">Confirmar senha</label>
          <div class="input-eye">
            <input id="confirm" v-model="confirm" :type="showConfirm ? 'text' : 'password'"
                   placeholder="Repita a senha" minlength="6" required autocomplete="new-password" />
            <button type="button" class="eye-btn" @click="showConfirm = !showConfirm" :title="showConfirm ? 'Ocultar' : 'Mostrar'">
              <span v-if="showConfirm">◡</span>
              <span v-else>◉</span>
            </button>
          </div>
          <span v-if="confirm && password !== confirm" class="field-error">As senhas não coincidem</span>
          <span v-else-if="confirm && password === confirm" class="field-ok">✓ Senhas coincidem</span>
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <div v-if="success" class="success-msg">
          <span>✓</span> {{ success }}
        </div>
        <button class="btn btn-primary" type="submit" :disabled="loading || !!success">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Criar conta</span>
        </button>
      </form>

      <p class="switch">Já tem conta? <RouterLink to="/login">Entrar</RouterLink></p>
    </div>

    <div class="auth-deco" aria-hidden="true">
      <div class="deco-ring deco-ring-1"></div>
      <div class="deco-ring deco-ring-2"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase'

const name = ref('')
const email = ref('')
const whatsapp = ref('')

function maskWhatsapp(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`
  else if (v.length > 0) v = `(${v}`
  whatsapp.value = v
}
const password = ref('')
const confirm = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const error = ref('')
const success = ref('')
const loading = ref(false)

async function register() {
  error.value = ''
  success.value = ''
  if (password.value !== confirm.value) {
    error.value = 'As senhas não coincidem.'
    return
  }
  loading.value = true
  const { error: err } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: { data: { name: name.value, whatsapp: whatsapp.value ? `+55${whatsapp.value.replace(/\D/g,'')}` : '' } },  })
  loading.value = false
  if (err) { error.value = err.message; return }
  success.value = 'Conta criada! Verifique seu email para confirmar.'
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
  box-shadow: var(--shadow-lg);
  position: relative;
  z-index: 1;
  animation: fadeUp 0.5s ease both;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  justify-content: center;
}

.brand-icon { color: var(--gold); font-size: 1.4rem; }

h1 {
  font-family: var(--font-body);
  font-size: 1.15rem;
  font-weight: 500;
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

.success-msg {
  background: var(--green-dim);
  border: 1px solid rgba(111,207,151,0.2);
  color: var(--green);
  font-size: 0.82rem;
  padding: 0.65rem 0.9rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.optional { font-weight: 400; color: var(--text-muted); font-size: 0.7rem; }

.input-flag {
  display: flex;
  align-items: center;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color 0.2s;
}
.input-flag:focus-within { border-color: var(--gold); }

.flag {
  padding: 0.65rem 0.75rem;
  font-size: 0.82rem;
  color: var(--text-muted);
  border-right: 1px solid var(--border);
  white-space: nowrap;
  background: var(--surface3);
}

.input-flag input {
  border: none;
  background: transparent;
  flex: 1;
  padding: 0.65rem 0.75rem;
}
.input-flag input:focus { box-shadow: none; }

.switch {
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-muted);
}
.switch a { color: var(--gold); text-decoration: none; font-weight: 500; }
.switch a:hover { text-decoration: underline; }

.auth-deco { position: absolute; inset: 0; pointer-events: none; }
.deco-ring { position: absolute; border-radius: 50%; border: 1px solid var(--border); }
.deco-ring-1 { width: 500px; height: 500px; top: -200px; right: -200px; opacity: 0.4; }
.deco-ring-2 { width: 350px; height: 350px; bottom: -150px; left: -100px; opacity: 0.25; }

.spinner {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(12,10,9,0.3);
  border-top-color: #0c0a09;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
