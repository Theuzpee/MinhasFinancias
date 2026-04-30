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
            <div class="stat-value green">{{ fmt(totalIncome) }}</div>
            <div class="stat-label">Renda total</div>
          </div>
          <div class="stat">
            <div class="stat-value red">{{ fmt(totalExpense) }}</div>
            <div class="stat-label">Total gasto</div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="edit-section">
          <h3>Editar dados</h3>
          <div class="form-group">
            <label for="profileName">Nome</label>
            <input id="profileName" v-model="form.name" type="text" placeholder="Seu nome" />
          </div>
          <div class="form-group">
            <label for="profileLimit">Limite mensal (R$)</label>
            <input id="profileLimit" v-model="form.monthly_limit" type="number" min="0" step="0.01" placeholder="Ex: 3000" />
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">Notificações WhatsApp</span>
              <span class="toggle-sub">{{ form.notify_whatsapp ? 'Ativo — limite mensal e metas concluídas' : 'Desativado' }}</span>
            </div>
            <button class="toggle-btn" :class="{ active: form.notify_whatsapp }" @click="form.notify_whatsapp = !form.notify_whatsapp">
              <span class="toggle-thumb"></span>
            </button>
          </div>
          <button class="btn btn-primary" @click="saveProfile" :disabled="saving">
            <span v-if="saving" class="spinner"></span>
            <span v-else>Salvar</span>
          </button>
          <p v-if="saveMsg" class="save-msg">{{ saveMsg }}</p>
        </div>
      </div>

      <!-- Donut + lista de categorias -->
      <div class="panel chart-panel">
        <h2>Gastos por categoria <span class="chart-sub">— todos os meses</span></h2>
        <div v-if="categoryList.length === 0" class="empty">
          <span class="empty-icon">◌</span><span>Sem dados</span>
        </div>
        <div v-else class="donut-section">
          <div class="donut-container">
            <Doughnut :data="categoryData" :options="donutOptions" />
            <div class="donut-center">
              <div class="donut-total">{{ fmt(totalExpense) }}</div>
              <div class="donut-label">total gasto</div>
            </div>
          </div>
          <div class="category-list">
            <div v-for="(cat, i) in categoryList" :key="cat.name" class="cat-item">
              <div class="cat-dot" :style="{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }"></div>
              <div class="cat-info">
                <div class="cat-name">{{ cat.name }}</div>
                <div class="cat-bar-wrap">
                  <div class="cat-bar" :style="{ width: cat.pct + '%', background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }"></div>
                </div>
              </div>
              <div class="cat-values">
                <div class="cat-amount">{{ fmt(cat.amount) }}</div>
                <div class="cat-pct">{{ cat.pct }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Insights do mês atual -->
    <div class="insights-grid" v-if="!loading">
      <div class="panel insight-card">
        <div class="insight-icon">📈</div>
        <div class="insight-label">Maior gasto do mês</div>
        <div class="insight-value red">{{ biggestExpense ? fmt(biggestExpense.amount) : '—' }}</div>
        <div class="insight-sub">{{ biggestExpense?.description || '' }}</div>
      </div>
      <div class="panel insight-card">
        <div class="insight-icon">📊</div>
        <div class="insight-label">Média diária de gastos</div>
        <div class="insight-value">{{ fmt(dailyAvg) }}</div>
        <div class="insight-sub">neste mês</div>
      </div>
      <div class="panel insight-card">
        <div class="insight-icon">🎯</div>
        <div class="insight-label">Uso do limite mensal</div>
        <div class="insight-value" :class="limitPct >= 100 ? 'red' : limitPct >= 80 ? 'gold' : 'green'">
          {{ limitPct }}%
        </div>
        <div class="insight-sub">{{ profile.monthly_limit > 0 ? fmt(profile.monthly_limit) + ' definido' : 'Limite não definido' }}</div>
      </div>
      <div class="panel insight-card">
        <div class="insight-icon">💡</div>
        <div class="insight-label">Categoria mais cara</div>
        <div class="insight-value gold">{{ topCategory?.name || '—' }}</div>
        <div class="insight-sub">{{ topCategory ? fmt(topCategory.amount) : '' }}</div>
      </div>
    </div>

    <!-- Bar chart — últimos 6 meses -->
    <div class="panel">
      <h2>Entradas vs Saídas <span class="chart-sub">— últimos 6 meses</span></h2>
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

onMounted(() => { document.title = 'Perfil — Finanças Pessoais' })

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const CATEGORY_COLORS = [
  '#d4a853','#6fcf97','#eb6b6b','#5b8dee','#c8956c',
  '#a78bfa','#34d399','#f87171','#60a5fa','#fbbf24'
]

const transactions = ref([])
const profile = ref({ name: '', monthly_limit: 0, notify_whatsapp: false })
const userEmail = ref('')
const loading = ref(true)
const saving = ref(false)
const saveMsg = ref('')
const form = ref({ name: '', monthly_limit: '', notify_whatsapp: false })

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
    form.value = { name: prof.name || '', monthly_limit: prof.monthly_limit || '', notify_whatsapp: prof.notify_whatsapp ?? false }
  }
  loading.value = false
})

async function saveProfile() {
  saving.value = true
  saveMsg.value = ''
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('profiles').upsert({
    id: user.id, name: form.value.name,
    monthly_limit: parseFloat(form.value.monthly_limit) || 0,
    notify_whatsapp: form.value.notify_whatsapp,
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
const totalIncome  = computed(() => transactions.value.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0))
const totalExpense = computed(() => transactions.value.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0))

// Mês atual
const currentMonthTx = computed(() => {
  const now = new Date()
  const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  return transactions.value.filter(t => t.date?.startsWith(key))
})

const biggestExpense = computed(() => {
  const expenses = currentMonthTx.value.filter(t => t.type === 'expense')
  if (!expenses.length) return null
  return expenses.reduce((max, t) => parseFloat(t.amount) > parseFloat(max.amount) ? t : max)
})

const dailyAvg = computed(() => {
  const expenses = currentMonthTx.value.filter(t => t.type === 'expense')
  const total = expenses.reduce((s, t) => s + parseFloat(t.amount), 0)
  const day = new Date().getDate()
  return day > 0 ? total / day : 0
})

const limitPct = computed(() => {
  const limit = parseFloat(profile.value.monthly_limit) || 0
  if (!limit) return 0
  const total = currentMonthTx.value.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)
  return Math.round((total / limit) * 100)
})

// Categoria list com percentual
const categoryList = computed(() => {
  const map = {}
  transactions.value.filter(t => t.type === 'expense').forEach(t => {
    map[t.category] = (map[t.category] || 0) + parseFloat(t.amount)
  })
  const total = Object.values(map).reduce((s, v) => s + v, 0) || 1
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount, pct: Math.round((amount / total) * 100) }))
})

const topCategory = computed(() => categoryList.value[0] || null)

// Donut
const categoryData = computed(() => ({
  labels: categoryList.value.map(c => c.name),
  datasets: [{
    data: categoryList.value.map(c => c.amount),
    backgroundColor: CATEGORY_COLORS.slice(0, categoryList.value.length),
    borderWidth: 2,
    borderColor: '#141210',
    hoverOffset: 10,
  }]
}))

const donutOptions = {
  responsive: true,
  maintainAspectRatio: true,
  cutout: '72%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => {
          const pct = Math.round((ctx.raw / totalExpense.value) * 100)
          return ` ${ctx.label}: R$ ${ctx.raw.toFixed(2).replace('.',',')} (${pct}%)`
        }
      }
    }
  }
}

// Bar chart
const barData = computed(() => {
  const now = new Date()
  const labels = [], incomes = [], expenses = []
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
      { label: 'Entradas', data: incomes,  backgroundColor: 'rgba(111,207,151,0.85)', borderRadius: 6, borderSkipped: false },
      { label: 'Saídas',   data: expenses, backgroundColor: 'rgba(235,107,107,0.85)', borderRadius: 6, borderSkipped: false },
    ]
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { labels: { color: '#8a7f72', font: { family: 'DM Sans', size: 12 }, boxWidth: 12, padding: 16 } },
    tooltip: {
      callbacks: {
        label: ctx => ` R$ ${ctx.raw.toFixed(2).replace('.',',')}`,
        afterBody: (items) => {
          const inc = items.find(i => i.dataset.label === 'Entradas')?.raw || 0
          const exp = items.find(i => i.dataset.label === 'Saídas')?.raw || 0
          const bal = inc - exp
          return bal !== 0 ? [`Saldo: R$ ${bal.toFixed(2).replace('.',',')}`] : []
        }
      }
    }
  },
  scales: {
    x: { ticks: { color: '#8a7f72', font: { family: 'DM Sans' } }, grid: { color: 'rgba(42,37,32,0.5)' } },
    y: { ticks: { color: '#8a7f72', font: { family: 'DM Sans' }, callback: v => `R$ ${v}` }, grid: { color: 'rgba(42,37,32,0.5)' } }
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
.chart-sub { font-size: 0.75rem; color: var(--text-muted); font-weight: 400; font-style: normal; }

.top-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}
@media (max-width: 768px) { .top-grid { grid-template-columns: 1fr; } }

/* Profile card */
.profile-card { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; }
.avatar { width: 72px; height: 72px; border-radius: 50%; background: var(--gold-dim); border: 2px solid var(--gold); color: var(--gold); font-family: var(--font-display); font-size: 1.6rem; display: flex; align-items: center; justify-content: center; }
.profile-name { font-weight: 600; font-size: 1.1rem; }
.profile-email { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem; }
.profile-stats { display: flex; gap: 1rem; width: 100%; justify-content: center; flex-wrap: wrap; }
.stat { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
.stat-value { font-family: var(--font-mono); font-size: 0.95rem; font-weight: 600; color: var(--gold); }
.stat-value.green { color: var(--green); }
.stat-value.red { color: var(--red); }
.stat-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.divider { width: 100%; height: 1px; background: var(--border); }
.edit-section { width: 100%; text-align: left; display: flex; flex-direction: column; gap: 0.875rem; }
.edit-section h3 { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
.save-msg { font-size: 0.8rem; color: var(--green); text-align: center; }

/* Toggle */
.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.toggle-info { display: flex; flex-direction: column; gap: 0.2rem; }
.toggle-label { font-size: 0.875rem; font-weight: 500; color: var(--text); }
.toggle-sub { font-size: 0.75rem; color: var(--text-muted); }
.toggle-btn { width: 44px; height: 24px; border-radius: 12px; background: var(--border2); border: none; cursor: pointer; position: relative; transition: background 0.25s; flex-shrink: 0; }
.toggle-btn.active { background: var(--gold); }
.toggle-thumb { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.25s; }
.toggle-btn.active .toggle-thumb { transform: translateX(20px); }

/* Donut section */
.chart-panel { display: flex; flex-direction: column; }
.donut-section { display: flex; gap: 1.5rem; align-items: flex-start; flex-wrap: wrap; }
.donut-container { position: relative; width: 200px; flex-shrink: 0; }
.donut-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; }
.donut-total { font-family: var(--font-mono); font-size: 0.9rem; font-weight: 600; color: var(--text); white-space: nowrap; }
.donut-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

.category-list { flex: 1; display: flex; flex-direction: column; gap: 0.6rem; min-width: 180px; }
.cat-item { display: flex; align-items: center; gap: 0.6rem; }
.cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cat-info { flex: 1; }
.cat-name { font-size: 0.8rem; color: var(--text); margin-bottom: 0.2rem; }
.cat-bar-wrap { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.cat-bar { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.cat-values { text-align: right; flex-shrink: 0; }
.cat-amount { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text); }
.cat-pct { font-size: 0.68rem; color: var(--text-muted); }

/* Insights */
.insights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
.insight-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.35rem; padding: 1.25rem; }
.insight-icon { font-size: 1.5rem; }
.insight-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
.insight-value { font-family: var(--font-mono); font-size: 1.3rem; font-weight: 600; color: var(--text); }
.insight-value.green { color: var(--green); }
.insight-value.red { color: var(--red); }
.insight-value.gold { color: var(--gold); }
.insight-sub { font-size: 0.75rem; color: var(--text-muted); }

/* Bar */
.bar-wrap { padding: 0.5rem 0; max-height: 320px; }

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
