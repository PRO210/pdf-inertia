// Hooks/usePendingReplicate.js
import { useEffect, useState, useCallback } from 'react';
import { waitForReplicateResult } from '@/Services/ReplicateApi';

export default function usePendingReplicate(MODELS) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lastOperationType, setLastOperationType] = useState(null);
  const [bgRemovedImageUrl, setBgRemovedImageUrl] = useState(null);
  const [upscaledImageUrl, setUpscaledImageUrl] = useState(null);

  // Função exposta para o componente limpar os dados quando necessário
  const limparEstadosReplicate = useCallback(() => {
    setResult(null);
    setBgRemovedImageUrl(null);
    setUpscaledImageUrl(null);
    setLastOperationType(null);
  }, []);

  useEffect(() => {
    async function recuperarPrevisaoPendente() {
      // Segurança: se MODELS ainda não foi renderizado/definido, não faz nada
      if (!MODELS) return;

      const savedId = localStorage.getItem('pending_replicate_id');
      const savedType = localStorage.getItem('pending_replicate_type');

      if (!savedId || !savedType) return;

      console.log(`🔄 Encontrado ID pendente: ${savedId}`);
      setLoading(true);
      setLastOperationType(savedType);

      const finalUrl = await waitForReplicateResult(savedId);

      if (finalUrl) {
        setResult(finalUrl);

        if (savedType === MODELS.REMOVE_BG) {
          setBgRemovedImageUrl(finalUrl);
        } else if (savedType === MODELS.UPSCALER_ESRGAN || savedType === MODELS.NAFNet) {
          setUpscaledImageUrl(finalUrl);
        }

        console.log('✅ Imagem recuperada com sucesso!');
      } else {
        console.log('⚠️ Resultado expirado no Replicate.');
        localStorage.removeItem('pending_replicate_id');
        localStorage.removeItem('pending_replicate_type');
      }

      setLoading(false);
    }

    recuperarPrevisaoPendente();

    // 🔥 Adicionado MODELS como dependência para garantir sincronia com o componente
  }, [MODELS]);

  return {
    loading,
    setLoading,              // 🔥 Adicionado
    result,
    setResult,               // 🔥 Adicionado
    lastOperationType,
    setLastOperationType,    // 🔥 Adicionado
    bgRemovedImageUrl,
    setBgRemovedImageUrl,    // 🔥 Adicionado
    upscaledImageUrl,
    setUpscaledImageUrl,     // 🔥 Adicionado
    limparEstadosReplicate
  };
}