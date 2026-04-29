<template>
  <div class="container">

    <div class="page-header">
      <div>
        <h2 class="page-title">Minhas <em>Metas</em></h2>
        <p class="page-sub">Acompanhe seu progresso mês a mês</p>
      </div>
    </div>

    <div class="panel">
      <h2>Nova Meta</h2>
      <div class="form-row">
        <div class="form-group">
          <label for="metaName">Nome da meta</label>
          <input id="metaName" v-model="form.name" type="text" placeholder="Ex: Reserva de emergência" />
        </div>
        <div class="form-group">
          <label for="metaTarget">Valor alvo (R$)</label>
          <input id="metaTarget" v-model="form.target" type="number" placeholder="5000" min="1" step="0.01" />
        </div>
        <div class="form-group">
          <label for="metaCategory">Categoria</label>
          <select id="metaCategory" v-model="form.category">
            <option>Reserva</option>
            <option>Viagem</option>
            <option>Investimento</option>
            <option>Compra</option>
            <option>Educação</option>
            <option>Outros</option>
          </select>
        </div>
        <div class="form-group">
          <label for="metaDeadline">Prazo</label>
          <input id="metaDeadline" v-model="form.deadline" type="month" />
        </div>
        <div class="form-group">
          <label>&nbsp;</label>
          <button class="btn btn-primary" @click="addMeta" :disabled="saving">
            <span v-if="saving" class="spinner"></span>
            <span v-else>+ Criar Meta</span>
          </button>
        </div>
      </div>
      <p v-if="formError" class="error-msg">{{ formError }}</p>
    </div>

    <div v-if="loading" class="empty">
      <span class="loading-dots"><span></span><span></span><span></span></span>
    </div>
    <div v-else-if="metas.length === 0" class="empty">
      <span class="empty-icon">◎</span>
      <span>Nenhuma meta criada ainda</span>
    </div>
    <div v-else class="metas-grid">
      <div v-for="meta in metas" :key="meta.id" class="meta-card">

        <div class="meta-card-header">
          <div class="meta-info">
            <div class="meta-name">{{ meta.name }}</div>
            <div class="meta-category">
              <span class="category-dot" :style="{ background: thermColor(meta) }"></span>
              {{ meta.category }} · {{ formatDeadline(meta.deadline) }}
            </div>
          </div>
          <button class="btn-remove" @click="deleteMeta(meta.id)" title="Remover meta">✕</button>
        </div>

        <!-- Thermometer -->
        <div class="thermo-section">
          <svg class="thermo-svg" width="44" height="156" viewBox="0 0 44 156">
            <!-- Track -->
            <rect x="15" y="8" width="14" height="118" rx="7"
                  fill="var(--surface2)" stroke="var(--border)" stroke-width="1"/>
            <!-- Fill -->
            <clipPath :id="`clip-${meta.id}`">
              <rect x="15" :y="126 - fillHeight(meta)" width="14" :height="fillHeight(meta) + 18"/>
            </clipPath>
            <rect x="15" y="8" width="14" height="118" rx="7"
                  :fill="thermColor(meta)" :clip-path="`url(#clip-${meta.id})`" opacity="0.85"/>
            <!-- Bulb -->
            <circle cx="22" cy="141" r="15" fill="var(--surface2)" stroke="var(--border)" stroke-width="1"/>
            <circle cx="22" cy="141" r="12" :fill="thermColor(meta)" opacity="0.85"/>
            <!-- Ticks -->
            <template v-for="v in [0,25,50,75,100]" :key="v">
              <line :x1="30" :y1="126 - Math.round(v/100*118)"
                    :x2="34" :y2="126 - Math.round(v/100*118)"
                    stroke="var(--border2)" stroke-width="1"/>
            </template>
          </svg>

          <div class="thermo-info">
            <div class="thermo-pct" :style="{ color: thermColor(meta) }">{{ pct(meta) }}<span>%</span></div>
            <div class="thermo-label">concluído</div>
            <div class="thermo-values">
              <div class="thermo-current">{{ fmt(metaTotal(meta)) }}</div>
              <div class="thermo-divider">de</div>
              <div class="thermo-target">{{ fmt(meta.target) }}</div>
            </div>
            <div class="thermo-remaining" v-if="pct(meta) < 100">
              Faltam {{ fmt(meta.target - metaTotal(meta)) }}
            </div>
            <div class="thermo-done" v-else>✓ Meta atingida!</div>
          </div>
        </div>

        <!-- Progress input -->
        <div class="progress-row">
          <input :id="`prog-${meta.id}`" v-model="progressInputs[meta.id]"
                 type="number" placeholder="Valor a registrar (R$)" min="0" step="0.01" />
          <button class="btn-register" @click="addProgress(meta)">Registrar</button>
        </div>

        <!-- History bars -->
        <div class="history">
          <div class="history-title">Últimos 6 meses</div>
          <div class="history-bars">
            <div v-for="bar in last6(meta)" :key="bar.month"
                 class="bar-wrap" :title="`${bar.month}: ${fmt(bar.value)}`">
              <div class="bar-fill"
                   :style="{ height: bar.height + 'px', background: bar.value > 0 ? thermColor(meta) : 'var(--border)' }">
              </div>
              <div class="bar-label">{{ bar.month }}</div>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const metas = ref([])
const loading = ref(true)
const saving = ref(false)
const formError = ref('')
const progressInputs = ref({})

const form = ref({
  name: '',
  target: '',
  category: 'Reserva',
  deadline: nextMonth(),
})

function nextMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

onMounted(fetchMetas)

async function fetchMetas() {
  loading.value = true
  const { data } = await supabase.from('goals').select('*, goal_progress(*)').order('created_at')
  metas.value = data || []
  loading.value = false
}

async function addMeta() {
  formError.value = ''
  if (!form.value.name || !form.value.target || !form.value.deadline) {
    formError.value = 'Preencha todos os campos.'
    return
  }
  saving.value = true
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('goals').insert({
    user_id: user.id,
    name: form.value.name,
    target: parseFloat(form.value.target),
    category: form.value.category,
    deadline: form.value.deadline,
  })
  saving.value = false
  if (error) { formError.value = error.message; return }
  form.value.name = ''
  form.value.target = ''
  await fetchMetas()
}

async function addProgress(meta) {
  const val = parseFloat(progressInputs.value[meta.id])
  if (!val || val <= 0) return

  // Calcula antes do insert para ter o total correto
  const totalAntes = metaTotal(meta)
  const totalAposAporte = totalAntes + val
  const pctAposAporte = Math.min(100, Math.round((totalAposAporte / meta.target) * 100))
  const metaConcluidaAgora = pctAposAporte >= 100 && totalAntes < meta.target

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  await supabase.from('goal_progress').insert({ goal_id: meta.id, month, amount: val })
  progressInputs.value[meta.id] = ''
  await fetchMetas()

  if (metaConcluidaAgora) {
    const { data: { user } } = await supabase.auth.getUser()
    fetch(`${import.meta.env.VITE_N8N_URL}/webhook/meta-concluida`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        meta_name: meta.name,
        total: totalAposAporte,
        target: meta.target,
      }),
    }).catch(() => {})
  }
}

async function deleteMeta(id) {
  if (!confirm('Remover esta meta?')) return
  await supabase.from('goals').delete().eq('id', id)
  await fetchMetas()
}

function metaTotal(meta) {
  return (meta.goal_progress || []).reduce((s, p) => s + p.amount, 0)
}

function pct(meta) {
  return Math.min(100, Math.round((metaTotal(meta) / meta.target) * 100))
}

function fillHeight(meta) {
  return Math.round((pct(meta) / 100) * 118)
}

function thermColor(meta) {
  const p = pct(meta)
  if (p >= 100) return 'var(--green)'
  if (p >= 60)  return 'var(--gold)'
  return 'var(--accent)'
}

function last6(meta) {
  const now = new Date()
  const bars = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = (meta.goal_progress || []).find(p => p.month === key)
    bars.push({ month: MONTHS_SHORT[d.getMonth()], value: entry ? entry.amount : 0 })
  }
  const max = Math.max(...bars.map(b => b.value), 1)
  return bars.map(b => ({ ...b, height: Math.max(Math.round((b.value / max) * 36), b.value > 0 ? 4 : 0) }))
}

function formatDeadline(str) {
  const [y, m] = str.split('-')
  return `${MONTHS_SHORT[parseInt(m) - 1]}/${y}`
}

function fmt(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.page-title {
  font-family: var(--font-body);
  font-size: 1.5rem;
  font-weight: 400;
}
.page-title em {
  font-style: italic;
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 1.6rem;
}
.page-sub { font-size: 0.82rem; color: var(--text-muted); margin-top: 0.25rem; }

.metas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}

.meta-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: border-color 0.2s, transform 0.2s;
}
.meta-card:hover { transform: translateY(-2px); }

.meta-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.meta-name { font-weight: 600; font-size: 0.975rem; margin-bottom: 0.3rem; }
.meta-category {
  font-size: 0.75rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.category-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.3rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
  flex-shrink: 0;
}
.btn-remove:hover { color: var(--red); background: var(--red-dim); }

/* Thermometer section */
.thermo-section {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.thermo-svg { flex-shrink: 0; }

.thermo-info { flex: 1; }

.thermo-pct {
  font-family: var(--font-mono);
  font-size: 2.5rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.03em;
}
.thermo-pct span { font-size: 1.2rem; opacity: 0.7; }

.thermo-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.75rem;
}

.thermo-values {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.thermo-current {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}
.thermo-divider { font-size: 0.72rem; color: var(--text-muted); }
.thermo-target {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
}

.thermo-remaining {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.4rem;
}
.thermo-done {
  font-size: 0.78rem;
  color: var(--green);
  font-weight: 600;
  margin-top: 0.4rem;
}

/* Progress input */
.progress-row {
  display: flex;
  gap: 0.5rem;
}
.progress-row input {
  flex: 1;
  padding: 0.55rem 0.8rem;
  font-size: 0.82rem;
}
.btn-register {
  background: var(--surface2);
  border: 1px solid var(--border2);
  color: var(--text);
  padding: 0.55rem 1rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
}
.btn-register:hover { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }

/* History */
.history-title {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.6rem;
}
.history-bars {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 44px;
}
.bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  height: 100%;
  justify-content: flex-end;
  cursor: default;
}
.bar-fill {
  width: 100%;
  border-radius: 3px 3px 0 0;
  min-height: 0;
  transition: height 0.4s ease;
}
.bar-label { font-size: 0.58rem; color: var(--text-muted); }

/* Empty */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}
.empty-icon { font-size: 2rem; opacity: 0.3; }

.loading-dots { display: flex; gap: 6px; }
.loading-dots span {
  width: 6px; height: 6px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: dot 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

.spinner {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(12,10,9,0.3);
  border-top-color: #0c0a09;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
