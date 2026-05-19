import { downloadImageFromReplicate } from '@/Services/DownloadReplicate';
import { downloadCount } from '@/Pages/TratamentoImagens/Partials/downloadCount';

/**
 * Inicia o download de uma imagem tratada e contabiliza a métrica de uso no banco.
 * * @param {string} type - Tipo da operação (ex: MODELS.REMOVE_BG)
 * @param {string} resultUrl - A URL ou Base64 da imagem gerada
 * @param {object} MODELS - O objeto de mapeamento de modelos para comparação
 */
export const executarDownloadComLog = async (type, resultUrl, MODELS) => {
  if (!resultUrl) {
    console.warn(`⚠️ URL de download não fornecida para o tipo: ${type}`);
    return;
  }

  // 1. Mapeamento dinâmico para os três modelos (Extensão e Nome para o Log do Laravel)
  const configuracaoModelos = {
    [MODELS.REMOVE_BG]: {
      extensao: 'png', // PNG mantém a transparência do fundo removido
      logName: 'recraft-remove-background'
    },
    [MODELS.UPSCALER_ESRGAN]: {
      extensao: 'webp',
      logName: 'recraft-crisp-upscale'
    },
    [MODELS.NAFNet]: {
      extensao: 'webp',
      logName: 'codeformer' // Nome que você já estava usando para registrar o NAFNet no banco
    }
  };

  // 2. Busca a configuração baseada no tipo enviado. Se não achar, define um padrão seguro.
  const config = configuracaoModelos[type] || { extensao: 'webp', logName: 'generico-upscale' };

  try {
    // 3. Dispara o download com a extensão correta
    await downloadImageFromReplicate(resultUrl, 'resultado_final_corrigido', config.extensao);

    // 4. Contabiliza o uso de forma dinâmica no banco do Laravel
    await downloadCount(config.logName);
    console.log(`✅ Download logado com sucesso para: ${config.logName}`);

  } catch (err) {
    console.error('❌ Erro durante o fluxo de download ou log:', err);
  }
};