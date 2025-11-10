import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import Footer from '@/Components/Footer';
import imageCompression from 'browser-image-compression';

// O Swal (SweetAlert2) é carregado via CDN no HTML, por isso removemos a importação ES para evitar o erro.

// Modelos Replicate que serão executados no backend
const MODELS = {
  REMOVE_BG: 'remover-fundo', // Mapeia para '/imagens/remover-fundo'
  UPSCALER_ESRGAN: 'aumentar-qualidade', // Reverte para o Real-ESRGAN, usando o endpoint original
};

export default function TratamentoImagens() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // URL da imagem antes
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(2); // Novo estado para o fator de escala

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  // /**
  //  * Processa a imagem enviando-a para o endpoint do backend.
  //  * @param {string} type - O tipo de processamento (remover-fundo ou aumentar-qualidade)
  //  */
  // const processImage = async (type) => {
  //   // Swal é acessível globalmente
  //   if (!image) {
  //     return Swal.fire({
  //       icon: 'warning',
  //       title: 'Atenção!',
  //       text: 'Selecione uma imagem primeiro.',
  //     });
  //   }

  //   setLoading(true);

  //   const formData = new FormData();
  //   formData.append('image', image);

  //   // Adiciona o fator de escala se estivermos fazendo upscale
  //   if (type === MODELS.UPSCALER_ESRGAN) {
  //     // O Real-ESRGAN usa o parâmetro 'scale' (e não 'scale_factor')
  //     formData.append('scale', scaleFactor);
  //   }

  //   // O endpoint deve ser dinâmico ou fixo, dependendo da sua arquitetura de backend
  //   const endpoint = `/imagens/${type}`;

  //   try {
  //     // O backend PHP deve chamar o modelo nightmareai/real-esrgan no Replicate
  //     const res = await axios.post(endpoint, formData, {
  //       headers: {
  //         'Content-Type': 'multipart/form-data',
  //       },
  //     });

  //     // Assumindo que o backend retorna a URL na estrutura: { output: ["url_aqui"] }
  //     const outputUrl = res.data?.output?.[0];

  //     if (outputUrl) {
  //       setResult(outputUrl);
  //       Swal.fire({
  //         icon: 'success',
  //         title: 'Sucesso!',
  //         text: 'Imagem processada com sucesso!',
  //         timer: 2000,
  //         showConfirmButton: false
  //       });
  //     } else {
  //       // Isso pode ocorrer se o backend não retornar uma URL imediatamente (processamento assíncrono)
  //       Swal.fire({
  //         icon: 'info',
  //         title: 'Processamento',
  //         text: 'Aguardando processamento no Replicate... (Verifique o console para erros do backend)',
  //       });
  //     }
  //   } catch (err) {
  //     console.error("Erro ao processar imagem:", err);
  //     Swal.fire({
  //       icon: 'error',
  //       title: 'Erro!',
  //       text: `Falha na comunicação com o servidor: ${err.message}`,
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  /**
   * Processa a imagem enviando-a para o endpoint do backend.
   * @param {string} type - O tipo de processamento (remover-fundo ou aumentar-qualidade)
   */
  const processImage = async (type) => {
    // Swal é acessível globalmente
    if (!image) {
      return Swal.fire({
        icon: 'warning',
        title: 'Atenção!',
        text: 'Selecione uma imagem primeiro.',
      });
    }

    setLoading(true);

    // --- 🛑 MUDANÇAS PARA UPSCALER_ESRGAN AQUI 🛑 ---
    let dataToSend = {}; // Usaremos um objeto JSON em vez de FormData

    if (type === MODELS.UPSCALER_ESRGAN) {
      // 1. Downsize da imagem e conversão para Base64 (para cumprir o limite de 2.1MP do Replicate)
      try {
        // Assume que 'image' é o objeto File do input
        const base64Image = await downsizeParaReplicate(image);

        // O backend espera o Base64 na chave 'image'
        dataToSend.image = base64Image;

        // O Real-ESRGAN usa o parâmetro 'scale' (e não 'scale_factor')
        dataToSend.scale = scaleFactor;

        console.log("✅ Imagem redimensionada para Base64 e pronta para envio.");

      } catch (e) {
        setLoading(false);
        console.error("Erro ao redimensionar a imagem no browser:", e);
        return Swal.fire({
          icon: 'error',
          title: 'Erro de Redimensionamento!',
          text: 'Não foi possível preparar a imagem para envio. Verifique o console.',
        });
      }

    } else {
      // Se for outro modelo (ex: remover-fundo), mantenha o envio original com FormData
      const formData = new FormData();
      formData.append('image', image);
      dataToSend = formData;
    }

    // O endpoint deve ser dinâmico ou fixo, dependendo da sua arquitetura de backend
    const endpoint = `/imagens/${type}`;

    try {
      // 2. Envio da requisição: 
      // Se for UPSCALER, enviamos JSON (com Base64). 
      // Se não for, usamos o FormData (mantendo compatibilidade com outras APIs).
      const res = await axios.post(endpoint, dataToSend, {
        headers: {
          // O Content-Type deve ser 'application/json' se estivermos enviando Base64
          'Content-Type': type === MODELS.UPSCALER_ESRGAN ? 'application/json' : 'multipart/form-data',
        },
      });

      // Assumindo que o backend retorna a URL na estrutura: { output: ["url_aqui"] }
      // ATENÇÃO: O backend do upscale deve retornar 'output_base64_or_url' (conforme alteramos)
      const outputUrlOrBase64 = res.data?.output_base64_or_url;

      if (outputUrlOrBase64) {
        // Se o backend retorna Base64, você deve usá-lo ou chamar a função pica
        setResult(outputUrlOrBase64); // Se for Base64, você pode renderizar

        // --- CÓDIGO OPCIONAL (SE QUISER USAR A FUNÇÃO PICA AQUI): ---
        /*
        if (type === MODELS.UPSCALER_ESRGAN) {
            // Aqui você chamaria a função finalizarUpscalePicaProgressivo(outputUrlOrBase64, larguraAlvo, alturaAlvo);
            // O resultado final seria o seu novo Base64 para exibir ou usar
        } 
        */

        Swal.fire({
          icon: 'success',
          title: 'Sucesso!',
          text: 'Imagem processada com sucesso!',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Processamento',
          text: 'Aguardando processamento no Replicate... (Verifique o console para erros do backend)',
        });
      }
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: `Falha na comunicação com o servidor: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ajusta o tamanho da imagem de entrada para garantir que ela não exceda o limite de pixels
   * da GPU do Replicate (aprox. 2.1MP), mantendo a proporção original.
   *
   * @param {File} file O objeto File da imagem original.
   * @returns {Promise<string>} A string Base64 Data URL da imagem redimensionada.
   */
  async function downsizeParaReplicate(file) {
    // Limite máximo de pixels aceito pela GPU do Replicate (2096704)
    const MAX_PIXELS = 2096704;

    // 1. Calcular a proporção e as dimensões da imagem original
    const img = new Image();
    const tempUrl = URL.createObjectURL(file);
    img.src = tempUrl;

    await new Promise((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(tempUrl);
        resolve();
      };
    });

    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;
    const originalPixels = originalWidth * originalHeight;

    let targetMaxWidthOrHeight = Math.max(originalWidth, originalHeight);

    // 2. Se o total de pixels exceder o limite, recalcula o maior lado
    if (originalPixels > MAX_PIXELS) {
      // Encontra o fator pelo qual o total de pixels deve ser reduzido (ex: 10.1MP / 2.1MP = 4.8x)
      const reductionFactor = Math.sqrt(originalPixels / MAX_PIXELS);

      // Calcula o novo maior lado. Ex: Lado maior original / 4.8
      targetMaxWidthOrHeight = Math.floor(Math.max(originalWidth, originalHeight) / reductionFactor);

      console.warn(`⚠️ Imagem original ${originalWidth}x${originalHeight} (${(originalPixels / 1000000).toFixed(1)}MP) será reduzida.`);
      console.log(`Novo maior lado (max size): ${targetMaxWidthOrHeight}px`);
    } else {
      // A imagem já está abaixo do limite
      console.log(`✅ Imagem original ${(originalPixels / 1000000).toFixed(1)}MP está no limite. Não será redimensionada.`);
    }

    // 3. Opções de Compressão (BIC)
    const options = {
      // Usa o lado máximo calculado (ou o lado original, se já for pequeno)
      maxWidthOrHeight: targetMaxWidthOrHeight,
      useWebWorker: true,
      maxSizeMB: 30, // Mantido, mas o controle principal é por maxWidthOrHeight
      initialQuality: 1.0,
      fileType: 'image/jpeg',
      // Manter a resolução 'true' garante que o BIC não reduza a resolução 
      // abaixo do necessário para atingir o 'maxSizeMB'.
      alwaysKeepResolution: true,
    };

    const compressedBlob = await imageCompression(file, options);

    // 4. Retorna o Base64 Data URL
    const finalBase64 = await imageCompression.getDataUrlFromFile(compressedBlob);

    console.log(`--- AJUSTE CONCLUÍDO ---`);
    console.log(`Tamanho final do Base64: ${(finalBase64.length / (1024 * 1024)).toFixed(2)} MB`);

    return finalBase64;
  }

  return (

    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <style>{`
        body { font-family: 'Inter', sans-serif; }
        .btn-base {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .btn-base:hover { transform: translateY(-1px); box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15); }
      `}</style>

        <h2 className="text-3xl font-extrabold text-gray-800 mb-6">
          🪄 Tratamento de Imagens com IA
        </h2>
        <p className="text-gray-600 mb-6">Selecione uma imagem e escolha o tratamento. Para aumentar a qualidade, este serviço utiliza o **Real-ESRGAN**, um modelo robusto para aprimoramento geral de imagens.</p>

        {/* Upload e Configurações */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-5">
          <label className="block text-sm font-medium text-gray-700">
            1. Carregar Imagem
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-indigo-50 file:text-indigo-700
                       hover:file:bg-indigo-100"
          />

          <div className="pt-4 border-t border-gray-100">
            <label htmlFor="scale-factor" className="block text-sm font-medium text-gray-700 mb-2">
              2. Fator de Escala (para Aumentar Qualidade)
            </label>
            <input
              id="scale-factor"
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={scaleFactor}
              onChange={(e) => setScaleFactor(Math.min(10, Math.max(1, parseFloat(e.target.value) || 1)))}
              className="w-full sm:w-1/3 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Defina o multiplicador de resolução (ex: 2 para dobrar, 4 para quadruplicar). O Real-ESRGAN suporta até 4x.</p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button
            onClick={() => processImage(MODELS.REMOVE_BG)}
            className="btn-base bg-purple-600 text-white hover:bg-purple-700 flex-1"
            disabled={loading || !image}
          >
            {loading && MODELS.REMOVE_BG === 'remover-fundo' ? 'Removendo Fundo...' : '🗑️ Remover Fundo'}
          </button>

          <button
            onClick={() => processImage(MODELS.UPSCALER_ESRGAN)}
            className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 flex-1"
            disabled={loading || !image}
          >
            {loading && MODELS.UPSCALER_ESRGAN === 'aumentar-qualidade' ? 'Aumentando Qualidade...' : '💎 Aumentar Qualidade (ESRGAN)'}
          </button>
        </div>

        {loading && <p className="mt-4 text-center text-indigo-600 font-medium">⏳ Processando imagem... Esta etapa pode levar alguns segundos.</p>}

        {/* Preview das Imagens */}
        {imagePreview && (
          <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Resultados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Antes */}
              <div className="text-center bg-gray-100 p-4 rounded-lg shadow-inner">
                <p className="font-semibold mb-3 text-gray-700">Original</p>
                <img
                  src={imagePreview}
                  alt="Original"
                  className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto"
                  style={{ maxHeight: '500px', objectFit: 'contain' }}
                />
              </div>

              {/* Depois */}
              {result ? (
                <div className="text-center bg-green-50 p-4 rounded-lg shadow-md">
                  <p className="font-semibold mb-3 text-green-700">Resultado ({scaleFactor}x)</p>
                  <img
                    src={result}
                    alt="Depois"
                    className="w-full h-auto rounded-lg shadow-xl border border-green-400 mx-auto"
                    style={{ maxHeight: '500px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div className="text-center p-4 rounded-lg shadow-inner bg-gray-100 flex items-center justify-center">
                  <p className="text-gray-500">Aguardando processamento...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer ano={2025} />
    </AuthenticatedLayout>
  );

}