// useInitialScreenInfo.js

// Constante de Limite de Largura (Ajustável)
const MOBILE_WIDTH_THRESHOLD = 768; 

/**
 * Hook minimalista que retorna o tamanho da tela e a orientação
 * que você já definiu no componente.
 *
 * @param {string} orientacaoInicial O valor do seu estado [orientacao] (ex: 'retrato').
 * @returns {object} { isMobile: boolean, orientacaoLeitura: string }
 */
export function useInitialScreenInfo(orientacaoInicial) {
  
  // 1. Detecção de Largura (Calculada apenas uma vez na montagem/render)
  const isMobile = window.innerWidth < MOBILE_WIDTH_THRESHOLD;
  
  // 2. Log simples de inicialização
  console.groupCollapsed(`[Info Inicial Mínima]`);
  console.log(`Orientação (Estado): ${orientacaoInicial}`);
  console.log(`É Celular (Largura ${window.innerWidth}px): ${isMobile}`);
  console.groupEnd();

  // 3. Retorna os valores
  return {
    isMobile,
    orientacaoLeitura: orientacaoInicial,
    mobileThreshold: MOBILE_WIDTH_THRESHOLD
  };
}