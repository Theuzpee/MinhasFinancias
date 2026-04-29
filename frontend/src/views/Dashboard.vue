<template>
  <div class="container">

    <div class="page-header">
      <div>
        <h2 class="page-title">Painel <em>Financeiro</em></h2>
        <p class="page-sub">Acompanhe suas entradas e saídas</p>
      </div>
      <div class="header-actions">
        <div class="month-selector">
          <label for="monthSelect">Período</label>
          <select id="monthSelect" v-model="selectedMonth">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="danger-actions">
          <button class="btn-danger-sm" @click="removeByMonth" title="Apagar transações do mês">
            🗑 Apagar mês
          </button>
          <button class="btn-danger-sm btn-danger-all" @click="removeAll" title="Apagar todas as transações">
            🗑 Apagar tudo
          </button>
        </div>
      </div>
    </div>

    <!-- Cards -->
    <div class="cards">
      <div class="card card-income">
        <div class="card-header">
          <span class="card-label">Renda do Mês</span>
          <span class="card-badge badge-green">↑ Entradas</span>
        </div>
        <div class="card-value">{{ fmt(totalIncome) }}</div>
        <div class="card-sub">{{ incomeCount }} registro{{ incomeCount !== 1 ? 's' : '' }}</div>
        <div class="card-glow card-glow-green"></div>
      </div>
      <div class="card card-expense">
        <div class="card-header">
          <span class="card-label">Gastos Essenciais</span>
          <span class="card-badge badge-red">↓ Saídas</span>
        </div>
        <div class="card-value">{{ fmt(totalExpense) }}</div>
        <div class="card-sub">{{ expenseCount }} registro{{ expenseCount !== 1 ? 's' : '' }}</div>
        <div class="card-glow card-glow-red"></div>
      </div>
      <div class="card card-balance">
        <div class="card-header">
          <span class="card-label">Saldo Restante</span>
          <span class="card-badge" :class="balance >= 0 ? 'badge-gold' : 'badge-red'">
            {{ balance >= 0 ? '◎ Positivo' : '◎ Negativo' }}
          </span>
        </div>
        <div class="card-value" :class="balance >= 0 ? 'value-gold' : 'value-red'">{{ fmt(balance) }}</div>
        <div class="card-sub">{{ balance >= 0 ? 'Dentro do orçamento' : 'Acima do orçamento' }}</div>
        <div class="card-glow card-glow-gold"></div>
      </div>
    </div>

    <!-- Form -->
    <div class="panel">
      <h2>Registrar Transação</h2>
      <div class="form-row">
        <div class="form-group">
          <label for="desc">Descrição</label>
          <input id="desc" v-model="form.desc" type="text" placeholder="Ex: Supermercado" />
        </div>
        <div class="form-group">
          <label for="amount">Valor (R$)</label>
          <input id="amount" v-model="form.amount" type="number" placeholder="0,00" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label for="type">Tipo</label>
          <select id="type" v-model="form.type">
            <option value="income">Entrada</option>
            <option value="expense">Saída</option>
          </select>
        </div>
        <div class="form-group">
          <label for="category">Categoria</label>
          <select id="category" v-model="form.category">
            <option>Salário</option>
            <option>Freelance</option>
            <option>Alimentação</option>
            <option>Moradia</option>
            <option>Transporte</option>
            <option>Saúde</option>
            <option>Educação</option>
            <option>Lazer</option>
            <option>Outros</option>
          </select>
        </div>
        <div class="form-group">
          <label for="date">Data</label>
          <input id="date" v-model="form.date" type="date" />
        </div>
        <div class="form-group">
          <label>&nbsp;</label>
          <button class="btn btn-primary" @click="addTransaction" :disabled="saving">
            <span v-if="saving" class="spinner"></span>
            <span v-else>+ Adicionar</span>
          </button>
        </div>
      </div>
      <p v-if="formError" class="error-msg">{{ formError }}</p>
    </div>

    <!-- Table agrupada por mês -->
    <div class="panel">
      <h2>Histórico</h2>
      <div v-if="loading" class="empty">
        <span class="loading-dots"><span></span><span></span><span></span></span>
      </div>
      <div v-else-if="filtered.length === 0" class="empty">
        <span class="empty-icon">◌</span>
        <span>Nenhuma transação neste período</span>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in groupedByDate" :key="group.date">
              <tr class="date-group-row">
                <td colspan="6" class="date-group-label">{{ formatDate(group.date) }}</td>
              </tr>
              <tr v-for="t in group.items" :key="t.id">
                <td class="td-date">{{ formatDate(t.date) }}</td>
                <td>{{ t.description }}</td>
                <td><span class="category-tag">{{ t.category }}</span></td>
                <td><span :class="`badge badge-pill badge-${t.type}`">{{ t.type === 'income' ? 'Entrada' : 'Saída' }}</span></td>
                <td :class="`amount amount-${t.type}`">
                  <span class="amount-sign">{{ t.type === 'income' ? '+' : '−' }}</span>{{ fmt(t.amount) }}
                </td>
                <td>
                  <button class="btn-remove" @click="remove(t.id)" title="Remover">✕</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase'

onMounted(() => { document.title = 'Painel — Finanças Pessoais' })

const transactions = ref([])
const loading = ref(true)
const saving = ref(false)
const formError = ref('')
const selectedMonth = ref('')
const n8nTotals = ref(null)

const form = ref({
  desc: '',
  amount: '',
  type: 'expense',
  category: 'Alimentação',
  date: new Date().toISOString().slice(0, 10),
})

const months = computed(() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return { value, label: label.charAt(0).toUpperCase() + label.slice(1) }
  })
})

const filtered = computed(() =>
  [...transactions.value]
    .filter(t => t.date.startsWith(selectedMonth.value))
    .sort((a, b) => b.date.localeCompare(a.date))
)

const totalIncome  = computed(() => n8nTotals.value?.renda ?? filtered.value.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
const totalExpense = computed(() => n8nTotals.value?.gastos_essenciais ?? filtered.value.filter(t => t.type === 'expense' && t.essential).reduce((s, t) => s + t.amount, 0))
const balance      = computed(() => n8nTotals.value?.saldo_restante ?? (totalIncome.value - filtered.value.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)))
const incomeCount        = computed(() => filtered.value.filter(t => t.type === 'income').length)
const expenseCount       = computed(() => filtered.value.filter(t => t.type === 'expense' && t.essential).length)

// Agrupa transações por data para exibição no histórico
const groupedByDate = computed(() => {
  const groups = {}
  filtered.value.forEach(t => {
    if (!groups[t.date]) groups[t.date] = []
    groups[t.date].push(t)
  })
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }))
})
onMounted(async () => {
  selectedMonth.value = months.value[0].value
  await fetchTransactions()
})

async function fetchTransactions() {
  loading.value = true
  n8nTotals.value = null
  const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
  transactions.value = data || []
  loading.value = false
}

async function addTransaction() {
  formError.value = ''
  if (!form.value.desc || !form.value.amount || !form.value.date) {
    formError.value = 'Preencha descrição, valor e data.'
    return
  }
  saving.value = true
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('transactions').insert({
    user_id: user.id,
    description: form.value.desc,
    amount: parseFloat(form.value.amount),
    type: form.value.type,
    category: form.value.category,
    date: form.value.date,
  }).select('id')
  saving.value = false
  if (error) { formError.value = error.message; return }

  if (data?.[0]?.id) {
    try {
      const res = await fetch(`${import.meta.env.VITE_N8N_URL}/webhook/financas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': import.meta.env.VITE_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify({
          transaction_id: data[0].id,
          user_id: user.id,
          description: form.value.desc,
          amount: parseFloat(form.value.amount),
          type: form.value.type,
          category: form.value.category,
        }),
      })
      if (res.ok) {
        const n8n = await res.json()
        if (n8n.success) {
          n8nTotals.value = {
            renda: n8n.renda,
            gastos_essenciais: n8n.gastos_essenciais,
            saldo_restante: n8n.saldo_restante,
            percentual_gasto: n8n.percentual_gasto,
          }
        }
      }
    } catch(e) {}
  }
  form.value.desc = ''
  form.value.amount = ''
  form.value.date = new Date().toISOString().slice(0, 10)
  await fetchTransactions()
}

async function remove(id) {
  if (!confirm('Remover esta transação?')) return
  await supabase.from('transactions').delete().eq('id', id)
  await fetchTransactions()
}

async function removeByMonth() {
  const label = months.value.find(m => m.value === selectedMonth.value)?.label || selectedMonth.value
  if (!confirm(`Apagar todas as transações de ${label}?`)) return
  const ids = filtered.value.map(t => t.id)
  if (!ids.length) return
  await supabase.from('transactions').delete().in('id', ids)
  await fetchTransactions()
}

async function removeAll() {
  if (!confirm('Apagar TODAS as transações? Esta ação não pode ser desfeita.')) return
  const { data: { user } } = await supabase.auth.getUser()
  loading.value = true
  await supabase.from('transactions').delete().eq('user_id', user.id)
  await fetchTransactions()
}

function fmt(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(str) {
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-family: var(--font-body);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text);
  line-height: 1.2;
}

.page-title em {
  font-style: italic;
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 1.6rem;
}

.page-sub { font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem; }

.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.month-selector {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.month-selector label {
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.month-selector select { width: auto; min-width: 180px; }

.danger-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-danger-sm {
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--text-muted);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-danger-sm:hover { border-color: var(--red); color: var(--red); background: var(--red-dim); }
.btn-danger-all:hover { border-color: var(--red); color: var(--red); background: var(--red-dim); }

/* Cards */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem 1.75rem;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}
.card:hover { transform: translateY(-2px); }

.card-income  { border-color: rgba(111,207,151,0.2); }
.card-expense { border-color: rgba(235,107,107,0.2); }
.card-balance { border-color: rgba(212,168,83,0.2); }

.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.card-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }

.card-badge { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.04em; padding: 0.2rem 0.55rem; border-radius: 2rem; }
.badge-green { background: var(--green-dim); color: var(--green); }
.badge-red   { background: var(--red-dim);   color: var(--red); }
.badge-gold  { background: var(--gold-dim);  color: var(--gold); }

.card-value { font-family: var(--font-mono); font-size: 1.85rem; font-weight: 500; letter-spacing: -0.02em; color: var(--text); margin-bottom: 0.35rem; }
.value-gold { color: var(--gold); }
.value-red  { color: var(--red); }
.card-income  .card-value { color: var(--green); }
.card-expense .card-value { color: var(--red); }
.card-sub { font-size: 0.75rem; color: var(--text-muted); }

.card-glow { position: absolute; width: 120px; height: 120px; border-radius: 50%; right: -30px; bottom: -40px; filter: blur(40px); opacity: 0.15; pointer-events: none; }
.card-glow-green { background: var(--green); }
.card-glow-red   { background: var(--red); }
.card-glow-gold  { background: var(--gold); }

/* Table */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
thead th { text-align: left; padding: 0.6rem 1rem; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); }
tbody tr { border-bottom: 1px solid var(--border); transition: background 0.15s; }
tbody tr:hover { background: var(--surface2); }
tbody tr:last-child { border-bottom: none; }
td { padding: 0.875rem 1rem; vertical-align: middle; }

.td-date { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }

.date-group-row { background: var(--surface2) !important; }
.date-group-label {
  padding: 0.4rem 1rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.category-tag { font-size: 0.75rem; color: var(--text-muted); background: var(--surface2); border: 1px solid var(--border); padding: 0.15rem 0.55rem; border-radius: 2rem; }
.badge-pill { display: inline-block; padding: 0.2rem 0.65rem; border-radius: 2rem; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.03em; }
.badge-income  { background: var(--green-dim); color: var(--green); }
.badge-expense { background: var(--red-dim);   color: var(--red); }
.amount { font-family: var(--font-mono); font-size: 0.875rem; font-weight: 500; white-space: nowrap; }
.amount-income  { color: var(--green); }
.amount-expense { color: var(--red); }
.amount-sign { opacity: 0.6; margin-right: 0.1rem; }
.btn-remove { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 0.75rem; padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); transition: all 0.15s; }
.btn-remove:hover { color: var(--red); background: var(--red-dim); }

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
