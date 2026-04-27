<template>
  <div class="container">

    <div class="page-header">
      <div>
        <h2 class="page-title">Meu <em>Perfil</em></h2>
        <p class="page-sub">Dados pessoais e visão geral financeira</p>
      </div>
    </div>

    <!-- Profile card + stats -->
    <div class="top-grid">

      <!-- Profile card -->
      <div class="panel profile-card">
        <div class="avatar">{{ initials }}</div>
        <div class="profile-info">
          <div class="profile-name">{{ profile.name || 'Usuário' }}</div>
          <div class="profile-email">{{ userEmail }}</div>
        </div>
        <div class="profile-stats">
          <div class="stat">
            <div class="stat-value">{{ totalTransactions }}</div>
            <div class="stat-label">Transações</div>
          </div>
          <div class="stat">
            <div class="stat-value">{{ fmt(totalIncome) }}</div>
            <div class="stat-label">Renda total</div>
          </div>
          <div class="stat">
            <div class="stat-value">{{ fmt(totalExpense) }}</div>
            <div class="stat-label">Total gasto</div>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Edit form -->
        <div class="edit-section">
          <h3>Editar dados</h3>
          <div class="form-group">
            <label for="profileName">Nome</label>
            <input id="profileName" v-model="form.name" type="text" placeholder="Seu nome" />
          </div>
          <div class="form-group">
            <label for="profileWhatsapp">WhatsApp</label>
            <div class="input-flag">
              <span class="flag">🇧🇷 +55</span>
              <input id="profileWhatsapp" v-model="form.whatsapp" type="tel" placeholder="11999999999" />
            </div>
          </div>
          <div class="form-group">
            <label for="profileLimit">Limite mensal (R$)</label>
            <input id="profileLimit" v-model="form.monthly_limit" type="number" min="0" step="0.01" placeholder="Ex: 3000" />
          </div>
          <button class="btn btn-primary" @click="saveProfile" :disabled="saving">
            <span v-if="saving" class="spinner"></span>
            <span v-else>Salvar</span>
          </button>
          <p v-if="saveMsg" class="save-msg">{{ saveMsg }}</p>
        </div>
      </div>

      <!-- Donut chart — categorias -->
      <div class="panel chart-panel">
        <h2>Gastos por categoria</h2>
        <div v-if="categoryData.labels.length === 0" class="empty">
          <span class="empty-icon">◌</span>
          <span>Sem dados</span>
        </div>
        <div v-else class="donut-wrap">
          <Doughnut :data="categoryData" :options="donutOptions" />
        </div>
      </div>

    </div>

    <!-- Bar chart — últimos 6 meses -->
    <div class="panel">
      <h2>Entradas vs Saídas — últimos 6 meses</h2>
      <div v-if="loading" class="empty">
        <span class="loading-dots"><span></span><span></span><span></span></span>
      </div>
      <div v-else class="bar-wrap">
        <Bar :data="barData" :options="barOptions" />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title
} from 'chart.js'
import { supabase } from '../supabase'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

document.title = 'Perfil — Finanças Pessoais'

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const CATEGORY_COLORS = [
  '#d4a853','#6fcf97','#eb6b6b','#5b8dee','#c8956c',
  '#a78bfa','#34d399','#f87171','#60a5fa','#fbbf24'
]

const transactions = ref([])
const profile = ref({ name: '', whatsapp: '', monthly_limit: 0 })
const userEmail = ref('')
const loading = ref(true)
const saving = ref(false)
const saveMsg = ref('')

const form = ref({ name: '', whatsapp: '', monthly_limit: '' })

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  userEmail.value = user?.email || ''

  const [{ data: tx }, { data: prof }] = await Promise.all([
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user.id).single()
  ])

  transactions.value = tx || []
  if (prof) {
    profile.value = prof
    form.value = {
      name: prof.name || '',
      whatsapp: prof.whatsapp ? prof.whatsapp.replace('+55', '') : '',
      monthly_limit: prof.monthly_limit || '',
    }
  }
  loading.value = false
})

async function saveProfile() {
  saving.value = true
  saveMsg.value = ''
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    name: form.value.name,
    whatsapp: form.value.whatsapp ? `+55${form.value.whatsapp.replace(/\D/g,'')}` : null,
    monthly_limit: parseFloat(form.value.monthly_limit) || 0,
  })
  saving.value = false
  if (error) { saveMsg.value = '❌ Erro ao salvar'; return }
  profile.value = { ...profile.value, ...form.value }
  saveMsg.value = '✓ Salvo com sucesso'
  setTimeout(() => saveMsg.value = '', 3000)
}

const initials = computed(() => {
  const name = profile.value.name || userEmail.value || '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
})

const totalTransactions = computed(() => transactions.value.length)
const totalIncome = computed(() => transactions.value.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0))
const totalExpense = computed(() => transactions.value.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0))

// Bar chart — últimos 6 meses
const barData = computed(() => {
  const now = new Date()
  const labels = []
  const incomes = []
  const expenses = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    labels.push(MONTHS_SHORT[d.getMonth()])
    const monthTx = transactions.value.filter(t => t.date?.startsWith(key))
    incomes.push(monthTx.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0))
    expenses.push(monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0))
  }

  return {
    labels,
    datasets: [
      { label: 'Entradas', data: incomes, backgroundColor: 'rgba(111,207,151,0.8)', borderRadius: 6 },
      { label: 'Saídas',   data: expenses, backgroundColor: 'rgba(235,107,107,0.8)', borderRadius: 6 },
    ]
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { labels: { color: '#8a7f72', font: { family: 'DM Sans' } } },
    tooltip: { callbacks: { label: ctx => ` R$ ${ctx.raw.toFixed(2).replace('.',',')}` } }
  },
  scales: {
    x: { ticks: { color: '#8a7f72' }, grid: { color: 'rgba(42,37,32,0.6)' } },
    y: { ticks: { color: '#8a7f72', callback: v => `R$ ${v}` }, grid: { color: 'rgba(42,37,32,0.6)' } }
  }
}

// Donut chart — categorias
const categoryData = computed(() => {
  const map = {}
  transactions.value.filter(t => t.type === 'expense').forEach(t => {
    map[t.category] = (map[t.category] || 0) + parseFloat(t.amount)
  })
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
  return {
    labels: sorted.map(([k]) => k),
    datasets: [{
      data: sorted.map(([,v]) => v),
      backgroundColor: CATEGORY_COLORS.slice(0, sorted.length),
      borderWidth: 0,
      hoverOffset: 8,
    }]
  }
})

const donutOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'right', labels: { color: '#8a7f72', font: { family: 'DM Sans' }, padding: 12 } },
    tooltip: { callbacks: { label: ctx => ` R$ ${ctx.raw.toFixed(2).replace('.',',')}` } }
  }
}

function fmt(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<style scoped>
.page-header { margin-bottom: 1.75rem; }
.page-title { font-family: var(--font-body); font-size: 1.5rem; font-weight: 400; }
.page-title em { font-style: italic; font-family: var(--font-display); color: var(--gold); font-size: 1.6rem; }
.page-sub { font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem; }

.top-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

@media (max-width: 768px) {
  .top-grid { grid-template-columns: 1fr; }
}

/* Profile card */
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--gold-dim);
  border: 2px solid var(--gold);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-name { font-weight: 600; font-size: 1.1rem; }
.profile-email { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; }

.profile-stats {
  display: flex;
  gap: 1.5rem;
  width: 100%;
  justify-content: center;
}

.stat { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
.stat-value { font-family: var(--font-mono); font-size: 1rem; font-weight: 600; color: var(--gold); }
.stat-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

.divider { width: 100%; height: 1px; background: var(--border); }

.edit-section { width: 100%; text-align: left; display: flex; flex-direction: column; gap: 0.875rem; }
.edit-section h3 { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }

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
.flag { padding: 0.65rem 0.75rem; font-size: 0.82rem; color: var(--text-muted); border-right: 1px solid var(--border); white-space: nowrap; background: var(--surface3); }
.input-flag input { border: none; background: transparent; flex: 1; padding: 0.65rem 0.75rem; }
.input-flag input:focus { box-shadow: none; }

.save-msg { font-size: 0.8rem; color: var(--green); text-align: center; }

/* Charts */
.chart-panel { display: flex; flex-direction: column; }
.donut-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 1rem 0; max-height: 300px; }
.bar-wrap { padding: 0.5rem 0; max-height: 300px; }

.empty { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem; color: var(--text-muted); font-size: 0.875rem; }
.empty-icon { font-size: 2rem; opacity: 0.3; }
.loading-dots { display: flex; gap: 6px; }
.loading-dots span { width: 6px; height: 6px; background: var(--text-muted); border-radius: 50%; animation: dot 1.2s ease-in-out infinite; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(12,10,9,0.3); border-top-color: #0c0a09; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
