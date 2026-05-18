import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateFileLogic, buildPayload, encodeFileContent } from '../../utils/importarUtils';

describe('Importar.vue Utilities — Property Tests', () => {

  // Feature: bank-statement-import, Property 1: Validação de arquivo rejeita extensão ou tamanho inválidos
  // Validates: Requirements 4.1, 4.2, 4.3, 4.4
  it('Property 1: Validação de arquivo rejeita extensão ou tamanho inválidos', () => {
    // Arquivos com extensões não permitidas ou tamanhos > 10MB
    const invalidFileArb = fc.record({
      name: fc.string({ minLength: 1 }).chain(base => 
        fc.constantFrom('.txt', '.docx', '.png', '.exe', '').map(ext => `${base}${ext}`)
      ),
      size: fc.double({ min: 0, max: 50 * 1024 * 1024, noNaN: true })
    }).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      const invalidExt = ext !== 'csv' && ext !== 'pdf';
      const invalidSize = f.size > 10 * 1024 * 1024;
      return invalidExt || invalidSize;
    });

    fc.assert(
      fc.property(invalidFileArb, (file) => {
        const result = validateFileLogic(file);
        expect(result.valid).toBe(false);
        expect(result.error.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: bank-statement-import, Property 2: Arquivo válido habilita envio sem erros
  // Validates: Requirements 4.5
  it('Property 2: Arquivo válido habilita envio sem erros', () => {
    const validFileArb = fc.record({
      name: fc.string({ minLength: 1 }).chain(base => 
        fc.constantFrom('.csv', '.pdf', '.CSV', '.PDF').map(ext => `${base}${ext}`)
      ),
      size: fc.double({ min: 0, max: 10 * 1024 * 1024, noNaN: true })
    });

    fc.assert(
      fc.property(validFileArb, (file) => {
        const result = validateFileLogic(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBe('');
      }),
      { numRuns: 100 }
    );
  });

  // Feature: bank-statement-import, Property 3: Codificação do conteúdo é determinada pelo tipo de arquivo
  // Validates: Requirements 5.2, 5.3
  it('Property 3: Codificação do conteúdo é determinada pelo tipo de arquivo', () => {
    const contentArb = fc.string();
    
    fc.assert(
      fc.property(contentArb, (content) => {
        // Para CSV, o retorno deve ser exato
        const csvResult = encodeFileContent('test.csv', content);
        expect(csvResult).toBe(content);
        
        // Para PDF, o leitor produz "data:application/pdf;base64,..."
        const mockPdfRead = `data:application/pdf;base64,${btoa(encodeURIComponent(content))}`;
        const pdfResult = encodeFileContent('test.pdf', mockPdfRead);
        
        // A extração deve ser o base64
        expect(pdfResult).toBe(btoa(encodeURIComponent(content)));
        
        // Validar round-trip base64
        expect(() => atob(pdfResult)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  // Feature: bank-statement-import, Property 4: Payload de envio sempre contém todos os campos obrigatórios
  // Validates: Requirements 5.4
  it('Property 4: Payload de envio sempre contém todos os campos obrigatórios', () => {
    fc.assert(
      fc.property(
        fc.uuid(), 
        fc.string({ minLength: 1 }), 
        fc.constantFrom('csv', 'pdf'), 
        fc.string({ minLength: 1 }),
        (user_id, file_name, file_type, content) => {
          const payload = buildPayload(user_id, file_name, file_type, content);
          expect(payload.user_id).toBeDefined();
          expect(payload.user_id).not.toBeNull();
          expect(payload.file_name).toBeDefined();
          expect(payload.file_name).not.toBe('');
          expect(payload.file_type).toBeDefined();
          expect(payload.content).toBeDefined();
          expect(payload.content).not.toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: bank-statement-import, Property 6: Erros HTTP do webhook sempre disponibilizam retry
  // Validates: Requirements 6.3
  it('Property 6: Erros HTTP do webhook sempre disponibilizam retry', async () => {
    const { initialState, handleHttpError } = await import('../../utils/importarState.js');
    
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }),
        fc.string(),
        (statusCode, dataError) => {
          let state = initialState();
          state = handleHttpError(state, statusCode, dataError);
          
          expect(state.status).toBe('error');
          expect(state.errorMessage).toBeTruthy();
          // O retry é disponibilizado quando status === 'error', o que é garantido pela assertion acima
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: bank-statement-import, Property 7: Reset restaura estado inicial após qualquer erro
  // Validates: Requirements 6.6
  it('Property 7: Reset restaura estado inicial após qualquer erro', async () => {
    const { initialState, resetState } = await import('../../utils/importarState.js');
    
    // Gerar estados de erro arbitrários
    const errorStateArb = fc.record({
      status: fc.constant('error'),
      file: fc.oneof(fc.constant(null), fc.record({ name: fc.string() })),
      validationError: fc.string(),
      errorMessage: fc.string({ minLength: 1 }),
      importedCount: fc.integer({ min: 0 })
    });

    fc.assert(
      fc.property(errorStateArb, (errorState) => {
        const nextState = resetState(errorState);
        
        expect(nextState.status).toBe('idle');
        expect(nextState.file).toBeNull();
        expect(nextState.validationError).toBe('');
        expect(nextState.errorMessage).toBe('');
      }),
      { numRuns: 100 }
    );
  });
});

