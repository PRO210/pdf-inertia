import axios from 'axios';
import { router } from '@inertiajs/react';
import { MENSAGENS_SISTEMA } from '@/constantes/mensagens';
import { useMensagens } from '@/hooks/useMensagens';

/**
 * Hook responsável por gerenciar o fluxo completo de download de PDFs.
 *
 * Responsabilidades:
 * - Registrar download no backend (controle de limite)
 * - Gerar nome dinâmico do arquivo
 * - Baixar o arquivo via blob
 * - Tratar erros (limite, validação, falhas gerais)
 */
export const useDownloadPdf = () => {
  const { exibirAvisoCritico } = useMensagens();

  /**
   * Executa o download do PDF
   *
   * @param {string|Object} pdf - URL do PDF ou objeto contendo { url }
   * @param {string} tipo - Tipo do arquivo ('atividades' | 'poster')
   */
  const processarDownload = async (pdf, tipo = 'atividades') => {

    // ==============================
    // CONFIGURAÇÃO INICIAL
    // Define comportamento com base no tipo de download
    // ==============================
    const isPoster = tipo === 'poster';
    const fileNameParam = isPoster ? 'poster.pdf' : 'atividades.pdf';
    const prefixoDownload = isPoster ? 'poster' : 'atividades';

    // Aceita tanto string direta quanto objeto com propriedade "url"
    const urlFinal = typeof pdf === 'string' ? pdf : pdf?.url;

    // Validação: impede execução sem URL válida
    if (!urlFinal) {
      console.error("URL do PDF não encontrada.");
      return;
    }

    try {
      // ==============================
      // ETAPA 1: REGISTRO NO BACKEND
      // Controla limite de downloads e retorna total acumulado
      // ==============================
      const response = await axios.post(route('user.downloads.store'), {
        file_name: fileNameParam,
      });

      const total = response.data.total_downloads;

      // Nome final do arquivo com contador incremental
      const nomeArquivoFinal = `${prefixoDownload}-${total}.pdf`;

      // ==============================
      // ETAPA 2: DOWNLOAD DO ARQUIVO
      // Requisição do arquivo como blob
      // ==============================
      const fileResponse = await axios.get(urlFinal, { responseType: 'blob' });

      // Cria URL temporária para o blob
      const blobUrl = window.URL.createObjectURL(new Blob([fileResponse.data]));

      // ==============================
      // ETAPA 3: DISPARO DO DOWNLOAD
      // Simula clique em <a> para forçar download no navegador
      // ==============================
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', nomeArquivoFinal);
      document.body.appendChild(link);
      link.click();

      // Limpeza: remove elemento e libera memória
      link.remove();
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
  };

  return { processarDownload };
};