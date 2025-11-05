// useCalculatedScale.js
import { useState, useEffect } from 'react';

// === CONSTANTES (ADICIONE OU CONFIRME ESTAS) ===
const ORIENTACAO_ALVO = 'landscape'; 
const MOBILE_WIDTH_THRESHOLD = 768; // Exemplo: Considerar celular se largura < 768px
const SCALE_CELULAR_CONDICIONAL = 0.50; 
const SCALE_PADRAO = 1.0; 

export function useCalculatedScale(pdfUrl, carregando, targetOrientation = ORIENTACAO_ALVO) {
  
  const [ajusteScale, setAjusteScale] = useState(SCALE_PADRAO); 

  const aplicarAjusteCondicional = () => {
    const hasPdf = !!pdfUrl; 

    // 1. Verificações de Pré-condição
    if (!hasPdf || carregando) {
      if (ajusteScale !== SCALE_PADRAO) setAjusteScale(SCALE_PADRAO);
      return; 
    }

    // 2. Detecção de Tela e Orientação
    // Lê as dimensões mais recentes da janela
    const isMobile = window.innerWidth < MOBILE_WIDTH_THRESHOLD;
    const currentOrientacao = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

    // Condição completa: Celular E Orientação diferente da Alvo
    const condicaoCompletaAtendida = isMobile && currentOrientacao !== targetOrientation;

    // === DEBUG ESSENCIAL PARA SABER ONDE FALHA ===
    console.groupCollapsed(`[Ajuste Hook Debug] - Executado em ${currentOrientacao}`);
    console.log(`Largura da Janela: ${window.innerWidth}px (Threshold: ${MOBILE_WIDTH_THRESHOLD}px)`);
    console.log(`É Celular (isMobile): ${isMobile}`);
    console.log(`Orientação Atual: ${currentOrientacao} (Alvo: ${targetOrientation})`);
    console.log(`Orientação Diferente da Alvo: ${currentOrientacao !== targetOrientation}`);
    console.log(`CONDICÃO COMPLETA ATENDIDA: ${condicaoCompletaAtendida}`);
    console.groupEnd();
    // ===========================================
    
    // 3. Lógica de Ajuste
    if (condicaoCompletaAtendida) {
      if (ajusteScale !== SCALE_CELULAR_CONDICIONAL) {
        setAjusteScale(SCALE_CELULAR_CONDICIONAL); // 0.50
        console.log('✅ Condição atendida: ESCALA PARA BAIXO (0.50)');
      }
    } else {
      // ESTE É O BLOCO QUE PRECISA RODAR PARA AUMENTAR O SCALE
      if (ajusteScale !== SCALE_PADRAO) {
        setAjusteScale(SCALE_PADRAO); // 1.0
        console.log('❌ Condição não atendida: ESCALA PARA CIMA (1.0)');
      }
    }
  };

  useEffect(() => {
    aplicarAjusteCondicional(); 

    // Listeners
    window.addEventListener('resize', aplicarAjusteCondicional);
    window.addEventListener('orientationchange', aplicarAjusteCondicional);

    return () => {
      window.removeEventListener('resize', aplicarAjusteCondicional);
      window.removeEventListener('orientationchange', aplicarAjusteCondicional);
    };
  }, [pdfUrl, carregando, targetOrientation, ajusteScale]); 
  
  return ajusteScale; 
}