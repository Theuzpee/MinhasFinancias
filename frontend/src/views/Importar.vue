<template>
  <div class="container">
    <div class="page-header">
      <div>
        <h2 class="page-title">Importar <em>Extrato</em></h2>
        <p class="page-sub">Importe seu extrato bancário automaticamente</p>
      </div>
    </div>

    <!-- Instruções de uso -->
    <div class="panel instructions-panel">
      <h2>Como usar</h2>
      <div class="instructions-grid">

        <div class="instruction-item">
          <div class="instruction-icon">🏦</div>
          <div class="instruction-body">
            <h3 class="instruction-title">Como exportar seu extrato</h3>
            <p class="instruction-text">
              Na maioria dos bancos, acesse a seção de <strong>Extrato</strong> ou <strong>Transações</strong>
              no app ou internet banking e procure a opção de exportar ou baixar o arquivo.
              Escolha o formato <span class="format-tag">.csv</span> ou <span class="format-tag">.pdf</span>
              quando disponível.
            </p>
          </div>
        </div>

        <div class="instruction-item">
          <div class="instruction-icon">📤</div>
          <div class="instruction-body">
            <h3 class="instruction-title">Como fazer o upload</h3>
            <p class="instruction-text">
              Arraste e solte o arquivo diretamente na área de upload abaixo, ou clique nela para
              selecionar o arquivo do seu computador. Formatos aceitos:
              <span class="format-tag">.csv</span> e <span class="format-tag">.pdf</span>
              (tamanho máximo: 10 MB).
            </p>
          </div>
        </div>

        <div class="instruction-item">
          <div class="instruction-icon">✨</div>
          <div class="instruction-body">
            <h3 class="instruction-title">O que acontece depois</h3>
            <p class="instruction-text">
              O sistema lê automaticamente todas as transações do arquivo, classifica cada uma
              por categoria e marca as essenciais e não-essenciais. Em seguida, elas são
              adicionadas ao seu painel financeiro.
            </p>
          </div>
        </div>

      </div>
    </div>

    <!-- Upload area + send button: only shown when idle -->
    <template v-if="status === 'idle'">
      <!-- Área de Upload -->
      <div
        class="upload-area"
        :class="{ dragging: isDragging }"
        @dragover.prevent="onDragOver"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
        @click="fileInputRef.click()"
        role="button"
        tabindex="0"
        @keydown.enter="fileInputRef.click()"
        @keydown.space.prevent="fileInputRef.click()"
        :aria-label="file ? `Arquivo selecionado: ${file.name}` : 'Área de upload. Clique ou arraste um arquivo aqui'"
      >
        <!-- Input oculto -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,.pdf"
          class="file-input-hidden"
          @change="onFileSelect"
          aria-hidden="true"
          tabindex="-1"
        />

        <!-- Estado padrão: nenhum arquivo selecionado -->
        <template v-if="!file">
          <div class="upload-icon">📁</div>
          <p class="upload-text">Arraste seu extrato aqui</p>
          <p class="upload-subtext">ou clique para selecionar</p>
          <p class="upload-formats">
            <span class="format-tag">.csv</span>
            <span class="upload-formats-sep">e</span>
            <span class="format-tag">.pdf</span>
          </p>
        </template>

        <!-- Estado com arquivo selecionado -->
        <template v-else>
          <div class="upload-icon">📄</div>
          <p class="upload-file-name">{{ file.name }}</p>
          <p class="upload-file-size">{{ formatFileSize(file.size) }}</p>
        </template>
      </div>

      <!-- Erro de validação -->
      <p v-if="validationError" class="validation-error" role="alert">{{ validationError }}</p>

      <!-- Botão de envio -->
      <div class="upload-actions">
        <button
          class="btn-send"
          :disabled="!file || !!validationError"
          @click.stop="sendFile"
          aria-label="Enviar arquivo para processamento"
        >
          Enviar
        </button>
      </div>
    </template>

    <!-- Estado: loading -->
    <div v-else-if="status === 'loading'" class="panel result-panel" role="status" aria-live="polite">
      <div class="result-loading">
        <span class="loading-dots"><span></span><span></span><span></span></span>
        <p class="result-loading-text">Processando seu extrato…</p>
      </div>
    </div>

    <!-- Estado: sucesso com transações -->
    <div v-else-if="status === 'success' && importedCount > 0" class="panel result-panel result-panel--success" role="status" aria-live="polite">
      <div class="result-icon">✅</div>
      <p class="result-title">Importação concluída!</p>
      <p class="result-message">
        <strong>{{ importedCount }}</strong> transaç{{ importedCount === 1 ? 'ão importada' : 'ões importadas' }} com sucesso.
      </p>
      <RouterLink to="/" class="btn-result-link">Ver no Painel</RouterLink>
    </div>

    <!-- Estado: sucesso sem transações -->
    <div v-else-if="status === 'success' && importedCount === 0" class="panel result-panel result-panel--warning" role="status" aria-live="polite">
      <div class="result-icon">⚠️</div>
      <p class="result-title">Nenhuma transação encontrada</p>
      <p class="result-message">Nenhuma transação foi encontrada no arquivo enviado.</p>
      <button class="btn-retry" @click="resetState">Tentar novamente</button>
    </div>

    <!-- Estado: erro -->
    <div v-else-if="status === 'error'" class="panel result-panel result-panel--error" role="alert">
      <div class="result-icon">❌</div>
      <p class="result-title">Erro na importação</p>
      <p class="result-message">{{ errorMessage }}</p>
      <button class="btn-retry" @click="resetState">Tentar novamente</button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

onMounted(() => { document.title = 'Importar Extrato — Finanças Pessoais' })

const file = ref(null)
const isDragging = ref(false)
const status = ref('idle') // 'idle' | 'loading' | 'success' | 'error'
const importedCount = ref(0)
const errorMessage = ref('')
const validationError = ref('')

// Template ref for the hidden file input
const fileInputRef = ref(null)

// --- Drag & Drop handlers ---

function onDragOver() {
  isDragging.value = true
}

function onDragLeave(e) {
  // Only deactivate if leaving the upload area itself, not a child element
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDragging.value = false
  }
}

function onDrop(e) {
  isDragging.value = false
  const f = e.dataTransfer.files[0]
  if (f) validateFile(f)
}

// --- Manual file selection ---

function onFileSelect(e) {
  const f = e.target.files[0]
  if (f) validateFile(f)
  // Reset input so the same file can be re-selected after clearing
  e.target.value = ''
}

// --- File validation ---

function validateFile(f) {
  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB in bytes (10.485.760)
  const ext = f.name.split('.').pop().toLowerCase()

  if (ext !== 'csv' && ext !== 'pdf') {
    validationError.value = 'Formato inválido. Apenas arquivos .csv e .pdf são aceitos.'
    file.value = null
    return
  }

  if (f.size > MAX_SIZE) {
    validationError.value = 'Arquivo muito grande. O tamanho máximo é 10 MB.'
    file.value = null
    return
  }

  file.value = f
  validationError.value = ''
}

// --- Helpers ---

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// --- Reset state ---

function resetState() {
  status.value = 'idle'
  file.value = null
  validationError.value = ''
  errorMessage.value = ''
}

// --- Send ---

async function sendFile() {
  if (!file.value) return

  // Set loading state — disables button and Upload_Area
  status.value = 'loading'

  try {
    // Read file content using FileReader wrapped in a Promise
    const ext = file.value.name.split('.').pop().toLowerCase()
    const content = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (ext === 'pdf') {
          // readAsDataURL produces "data:<mime>;base64,<data>" — extract Base64 part
          resolve(reader.result.split(',')[1])
        } else {
          // readAsText produces the raw UTF-8 string
          resolve(reader.result)
        }
      }
      reader.onerror = () => reject(reader.error)
      if (ext === 'pdf') {
        reader.readAsDataURL(file.value)
      } else {
        reader.readAsText(file.value, 'UTF-8')
      }
    })

    // Obtain authenticated user_id
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      errorMessage.value = 'Sessão expirada. Faça login novamente.'
      status.value = 'error'
      return
    }

    // Build payload
    const payload = {
      user_id: user?.id,
      file_name: file.value.name,
      file_type: ext, // 'csv' or 'pdf'
      content,
    }

    // Send to n8n webhook
    const res = await fetch(
      `${import.meta.env.VITE_N8N_URL}/webhook/importar-extrato`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': import.meta.env.VITE_WEBHOOK_SECRET,
        },
        body: JSON.stringify(payload),
      }
    )

    if (res.ok) {
      const data = await res.json()
      importedCount.value = data.imported
      status.value = 'success'
    } else {
      // HTTP error — try to read error field from response body
      let message = 'Erro ao processar o extrato. Tente novamente.'
      try {
        const data = await res.json()
        if (data.error) message = data.error
      } catch {
        // ignore JSON parse failure, use fallback message
      }
      errorMessage.value = message
      status.value = 'error'
    }
  } catch {
    // Network / FileReader error
    errorMessage.value = 'Erro de conexão. Verifique sua internet e tente novamente.'
    status.value = 'error'
  }
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

.page-sub {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

/* Instructions panel */
.instructions-panel h2 {
  margin-bottom: 1.25rem;
}

.instructions-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.instruction-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.instruction-icon {
  font-size: 1.4rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 0.1rem;
  width: 2rem;
  text-align: center;
}

.instruction-body {
  flex: 1;
}

.instruction-title {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.35rem;
}

.instruction-text {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

.format-tag {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gold);
  background: var(--gold-dim);
  border: 1px solid rgba(212, 168, 83, 0.25);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
}

/* Upload area */
.upload-area {
  margin-top: 1.5rem;
  border: 2px dashed rgba(212, 168, 83, 0.3);
  border-radius: var(--radius);
  padding: 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.2s ease, background 0.2s ease;
  outline: none;
  user-select: none;
}

.upload-area:hover,
.upload-area:focus-visible {
  border-color: rgba(212, 168, 83, 0.6);
  background: rgba(212, 168, 83, 0.04);
}

.upload-area.dragging {
  border-color: var(--gold);
  background: rgba(212, 168, 83, 0.08);
  border-style: solid;
}

.file-input-hidden {
  display: none;
}

.upload-icon {
  font-size: 2.25rem;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.upload-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.upload-subtext {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin: 0;
}

.upload-formats {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.25rem 0 0;
}

.upload-formats-sep {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.upload-file-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  word-break: break-all;
  text-align: center;
}

.upload-file-size {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

.upload-area.disabled {
  pointer-events: none;
  opacity: 0.5;
}

/* Result panels */
.result-panel {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.result-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.result-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.result-message {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.result-message strong {
  color: var(--text);
}

.result-panel--success {
  border-color: rgba(111, 207, 151, 0.25);
}

.result-panel--warning {
  border-color: rgba(212, 168, 83, 0.25);
}

.result-panel--error {
  border-color: rgba(235, 107, 107, 0.25);
}

.result-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.result-loading-text {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
}

.btn-result-link {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--bg);
  background: var(--gold);
  border-radius: var(--radius-sm);
  padding: 0.55rem 1.5rem;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.btn-result-link:hover {
  opacity: 0.88;
}

.btn-retry {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  background: transparent;
  border: 1px solid var(--border2);
  border-radius: var(--radius-sm);
  padding: 0.55rem 1.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-retry:hover {
  border-color: var(--gold);
  color: var(--gold);
}

/* Validation error */
.validation-error {
  margin-top: 0.6rem;
  font-size: 0.82rem;
  color: #e05c5c;
  text-align: center;
}

/* Send button */
.upload-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.btn-send {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--bg);
  background: var(--gold);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.55rem 1.5rem;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-send:hover:not(:disabled) {
  opacity: 0.88;
}

.btn-send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
