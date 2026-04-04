import axios from 'axios';
import { router } from '@inertiajs/react';
import { MENSAGENS_SISTEMA } from '@/constantes/mensagens';
import { useMensagens } from '@/hooks/useMensagens';
import { useState } from 'react';

export const useDownloadPdfPoster = () => {
  const { exibirAvisoCritico } = useMensagens();
  const [estaBaixando, setEstaBaixando] = useState(false);

  /**
   * @param {string|Object} pdf - URL ou objeto com {url}
   * @param {number} paginas - Quantidade de páginas que o poster possui
   */
  const processarDownload = async (pdf, paginas = 1) => {
    const urlFinal = typeof pdf === 'string' ? pdf : pdf?.url;

    if (!urlFinal) return;

    setEstaBaixando(true);

    try {
      // 1. Chamamos o storePacote enviando a quantidade de páginas real
      const response = await axios.post(route('user.downloads.storePacote'), {
        file_name: 'poster.pdf',
        quantidade: paginas, // Envia ex: 4, 9, 16...
      });

      const { total_downloads } = response.data;
      const nomeArquivo = `Poster-${total_downloads}.pdf`;

      // 2. Download via Blob
      const resFile = await axios.get(urlFinal, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([resFile.data]));

      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', nomeArquivo);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;

      // ==============================
      // TRATAMENTO: LIMITE ATINGIDO
      // Backend retorna 403 com erro específico
      // ==============================
      if (status === 403 && data?.error === 'limite_atingido') {
        const configMsg = MENSAGENS_SISTEMA?.global?.limite_downloads;

        // Exibe modal customizado (se configurado)
        if (configMsg) {
          const result = await exibirAvisoCritico(configMsg);

          // Se usuário confirmar, redireciona para página de pagamento
          if (result.isConfirmed) router.visit('/pagamentos');
        } else {
          // Fallback simples caso não exista configuração
          alert(data.message || 'Limite atingido.');
          router.visit('/pagamentos');
        }
        return;
      }

      // ==============================
      // TRATAMENTO: ERROS DE VALIDAÇÃO
      // ==============================
      if (status === 422) {
        alert('Erro de validação nos dados.');
      } else {
        // ==============================
        // TRATAMENTO: ERRO GENÉRICO
        // ==============================
        alert('Ocorreu um erro ao processar seu download.');
      }

      // Log detalhado para debug
      console.error('Erro no download:', error);
    }
    setEstaBaixando(false);

  };

  return { processarDownload, estaBaixando };
};