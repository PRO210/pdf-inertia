// TratamentoImagens/Partials/upscaleCount.js

import axios from 'axios';


/**
 * Contabiliza o uso de uma funcionalidade específica no backend.
 *
 * @param {string} fileName O nome da funcionalidade usada (ex: 'upscaler_esrgan_usage').
 * @returns {Promise<boolean>} Retorna true em caso de sucesso, false em caso de erro.
 */
export const upscaleCount = async (fileName = 'upscaler_esrgan_usage') => {
  if (!fileName) {
    console.error("⚠️ upscaleCount: Nome do arquivo (fileName) é obrigatório.");
    return false;
  }

  try {
    await axios.post(route('user.downloads.store'), {
      file_name: fileName,
    });
    console.log(`✅ Uso de '${fileName}' contabilizado com sucesso.`);
    return true;
  } catch (error) {
    // Apenas logamos o erro, não queremos interromper o fluxo principal
    console.error(`⚠️ Erro ao contabilizar uso de '${fileName}':`, error.message);
    // Opcional: Você pode querer verificar o status do erro aqui
    return false;
  }
};