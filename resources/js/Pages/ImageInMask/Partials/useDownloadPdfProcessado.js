import axios from 'axios';
import { router } from '@inertiajs/react';
import { MENSAGENS_SISTEMA } from '@/constantes/mensagens';
import { useMensagens } from '@/hooks/useMensagens';
import { useState } from 'react';

export const useDownloadPdfProcessado = () => {
  const { exibirAvisoCritico } = useMensagens();
  const [estaBaixando, setEstaBaixando] = useState(false);

  const processarDownload = async (pdfUrl, identificador, nomeArquivoBase, quantidade = 1) => {
    if (!pdfUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Aviso',
        text: 'Nenhum PDF disponível para download.',
      });
      return;
    }

    setEstaBaixando(true);

    try {
      // 🔒 Garante que o blob ainda é válido
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('PDF indisponível');
      }

      // 📊 Log estatístico
      // ==============================
      // ETAPA 1: REGISTRO NO BACKEND
      // Controla limite de downloads e retorna total acumulado
      // ==============================
      const res = await axios.post(route('user.downloads.store'), {
        file_name: identificador,
      });

      const total = res.data.total_downloads;


      // Nome final do arquivo com contador incremental
      const nomeArquivoFinal = `${nomeArquivoBase}-${total}.pdf`;

      // ==============================
      // ETAPA 2: DOWNLOAD DO ARQUIVO
      // Requisição do arquivo como blob
      // ==============================
      const blob = await response.blob();

      // ==============================
      // ETAPA 3: DISPARO DO DOWNLOAD
      // Simula clique em <a> para forçar download no navegador
      // ==============================
      const link = document.createElement('a');
      const blobUrl = URL.createObjectURL(blob);

      link.href = blobUrl;
      link.download = nomeArquivoFinal;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);

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

    } finally {
      //  DESATIVA O LOADING AQUI (independente de ter dado erro ou sucesso)
      setEstaBaixando(false);
    }


  };
  return { processarDownload, estaBaixando };
};