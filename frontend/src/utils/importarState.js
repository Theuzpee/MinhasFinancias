// Funções puras de state machine para testar o fluxo visual

export const initialState = () => ({
  status: 'idle',
  file: null,
  validationError: '',
  errorMessage: '',
  importedCount: 0
});

export function handleHttpError(state, statusCode, dataError) {
  if (statusCode >= 400 && statusCode <= 599) {
    return {
      ...state,
      status: 'error',
      errorMessage: dataError || 'Erro ao processar o extrato. Tente novamente.'
    };
  }
  return state;
}

export function handleNetworkError(state) {
  return {
    ...state,
    status: 'error',
    errorMessage: 'Erro de conexão. Verifique sua internet e tente novamente.'
  };
}

export function resetState(state) {
  return {
    ...state,
    status: 'idle',
    file: null,
    validationError: '',
    errorMessage: ''
  };
}
