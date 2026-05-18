import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ============================================================================
// SIMULAÇÃO DA LÓGICA DOS NÓS DO N8N
// ============================================================================

// Simula o Nó 2: Validar Payload
function validatePayload(body) {
  const requiredFields = ['user_id', 'file_type', 'content'];
  for (const field of requiredFields) {
    if (!body[field]) {
      return { json: { __error: true, __status: 400, error: `Campo '${field}' ausente` } };
    }
  }
  return { json: { ...body, __error: false } };
}

// Simula o Nó 5: Parsear Resposta Gemini
function parseGeminiResponse(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  let parsedArray;
  try {
    parsedArray = JSON.parse(cleaned);
  } catch (e) {
    return { json: { __error: true, __status: 422, error: 'Não foi possível interpretar o extrato' } };
  }

  if (!Array.isArray(parsedArray)) {
    return { json: { __error: true, __status: 422, error: 'Não foi possível interpretar o extrato' } };
  }
  
  if (parsedArray.length > 500) {
    return { json: { __error: true, __status: 422, error: 'Extrato contém mais de 500 transações. Divida o arquivo.' } };
  }

  const validItems = parsedArray.filter(t => {
    if (typeof t !== 'object' || t === null) return false;
    if (typeof t.description !== 'string' || t.description.trim().length === 0 || t.description.length > 255) return false;
    if (typeof t.amount !== 'number' || t.amount <= 0 || t.amount > 999999) return false;
    if (t.type !== 'income' && t.type !== 'expense') return false;
    if (!t.date || isNaN(new Date(t.date).getTime())) return false;
    return true;
  });

  return { json: { transactions: validItems, __error: false } };
}

// Simula o Nó 6: Validar Transações
function filterValidTransactions(transactions) {
  return transactions.filter(t => {
    const amountValid = typeof t.amount === 'number' && t.amount > 0;
    const typeValid = t.type === 'income' || t.type === 'expense';
    const dateValid = t.date && !isNaN(new Date(t.date).getTime());
    return amountValid && typeValid && dateValid;
  });
}

// ============================================================================
// PROPERTY TESTS (FAST-CHECK)
// ============================================================================

describe('Property Tests — Statement Parser', () => {

  // Feature: bank-statement-import, Property 5: Descarte seletivo preserva transações válidas e conta apenas as salvas
  // Validates: Requirements 8.4, 8.5, 8.6, 7.8
  it('Property 5: Descarte seletivo preserva transações válidas e conta apenas as salvas', () => {
    // Gerador de transação válida
    const validTxArb = fc.record({
      description: fc.string({ minLength: 1, maxLength: 255 }),
      amount: fc.double({ min: 0.01, max: 999999, noNaN: true }),
      type: fc.constantFrom('income', 'expense'),
      date: fc.date().map(d => d.toISOString().split('T')[0])
    });

    // Gerador de transação inválida
    const invalidTxArb = fc.record({
      description: fc.oneof(fc.constant(''), fc.string({ minLength: 256 })),
      amount: fc.oneof(fc.double({ max: 0, noNaN: true }), fc.constant(NaN), fc.string()),
      type: fc.oneof(fc.constant('debit'), fc.constant('credit'), fc.string()),
      date: fc.oneof(fc.constant('invalid-date'), fc.string())
    });

    fc.assert(
      fc.property(
        fc.array(fc.oneof(validTxArb, invalidTxArb)), 
        (transactions) => {
          const N = transactions.length;
          const validTxs = transactions.filter(t => 
            typeof t.amount === 'number' && t.amount > 0 &&
            (t.type === 'income' || t.type === 'expense') &&
            t.date && !isNaN(new Date(t.date).getTime())
          );
          const K = N - validTxs.length;

          const result = filterValidTransactions(transactions);

          // Verifica se exatamente as válidas foram mantidas
          expect(result.length).toBe(N - K);
          expect(result).toEqual(validTxs);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: bank-statement-import, Property 8: Webhook rejeita payload com campos obrigatórios ausentes
  // Validates: Requirements 7.1, 7.2
  it('Property 8: Webhook rejeita payload com campos obrigatórios ausentes', () => {
    const requiredFields = ['user_id', 'file_type', 'content'];

    // Gerar objetos contendo chaves arbitrárias
    const anyBodyArb = fc.dictionary(fc.string(), fc.string());
    
    // Gerar um array com campos ausentes selecionados
    const missingFieldsArb = fc.subarray(requiredFields, { minLength: 1 });

    fc.assert(
      fc.property(anyBodyArb, missingFieldsArb, (baseBody, missingFields) => {
        // Garantir que baseBody não contenha os missingFields
        const body = { ...baseBody };
        for (const field of requiredFields) {
           body[field] = 'some_value';
        }
        for (const missing of missingFields) {
           delete body[missing];
        }

        const result = validatePayload(body);
        
        expect(result.json.__error).toBe(true);
        expect(result.json.__status).toBe(400);
        expect(result.json.error).toMatch(/Campo '.*' ausente/);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: bank-statement-import, Property 9: Resposta Gemini inválida resulta em HTTP 422
  // Validates: Requirements 8.3
  it('Property 9: Resposta Gemini inválida resulta em HTTP 422', () => {
    // Strings que NÃO SÃO um array JSON
    const notJsonArrayArb = fc.string().filter(str => {
      try {
        const parsed = JSON.parse(str.replace(/```json|```/g, '').trim());
        return !Array.isArray(parsed);
      } catch (e) {
        return true; // Não é JSON válido, então atende ao critério de rejeição
      }
    });

    fc.assert(
      fc.property(notJsonArrayArb, (text) => {
        const result = parseGeminiResponse(text);
        expect(result.json.__error).toBe(true);
        expect(result.json.__status).toBe(422);
        expect(result.json.error).toBe('Não foi possível interpretar o extrato');
      }),
      { numRuns: 100 }
    );
  });

});
