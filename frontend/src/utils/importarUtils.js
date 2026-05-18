// Função de validação pura
export function validateFileLogic(file) {
  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB in bytes

  if (!file || !file.name) {
    return { valid: false, error: 'Arquivo inválido.' }
  }

  const parts = file.name.split('.')
  if (parts.length < 2) {
    return { valid: false, error: 'Formato inválido. Apenas arquivos .csv e .pdf são aceitos.' }
  }
  
  const ext = parts.pop().toLowerCase()

  if (ext !== 'csv' && ext !== 'pdf') {
    return { valid: false, error: 'Formato inválido. Apenas arquivos .csv e .pdf são aceitos.' }
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Arquivo muito grande. O tamanho máximo é 10 MB.' }
  }

  return { valid: true, error: '' }
}

// Função pura para montar payload
export function buildPayload(user_id, file_name, file_type, content) {
  return {
    user_id,
    file_name,
    file_type,
    content
  }
}

// Função pura para extrair o conteúdo após a leitura do FileReader
export function encodeFileContent(file_name, file_reader_result) {
  const ext = file_name.split('.').pop().toLowerCase()
  if (ext === 'pdf') {
    // extract Base64 part from "data:<mime>;base64,<data>"
    return file_reader_result.split(',')[1]
  }
  return file_reader_result
}

