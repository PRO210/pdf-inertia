// resources/js/Hooks/usePica.js

import { useEffect, useState } from 'react';
import picaInstance from '@/Lib/pica';

export default function usePica() {
  const [carregando, setCarregando] = useState(true);
  const [erroPica, setErroPica] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function inicializarPica() {
      try {
        // Apenas valida se a instância existe
        if (!picaInstance) {
          throw new Error('Instância do Pica não encontrada');
        }

        // Pequena validação opcional
        if (typeof picaInstance.resize !== 'function') {
          throw new Error('Método resize não disponível');
        }

        if (isMounted) {
          setIsReady(true);
          setCarregando(false);

          console.log(
            '%c✅ Pica.js inicializado com sucesso',
            'color:#10B981; font-weight:bold;'
          );
        }

      } catch (error) {

        console.error('❌ Erro ao inicializar Pica.js:', error);

        if (isMounted) {
          setErroPica('Erro ao carregar módulo de redimensionamento');
          setCarregando(false);
        }
      }
    }

    inicializarPica();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    picaInstance,
    carregando,
    erroPica,
    isReady,
  };
}