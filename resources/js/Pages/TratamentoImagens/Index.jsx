import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import Footer from '@/Components/Footer';
import imageCompression from 'browser-image-compression';
import pica from 'pica';



export default function TratamentoImagens() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // URL da imagem antes
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(2); // Novo estado para o fator de escala
  const [picaInstance, setPicaInstance] = useState(null);
  const [carregando, setCarregando] = useState(null);

  // Inicializa o Pica.js uma vez
  const MODELS = {
    REMOVE_BG: 'remover-fundo', // Mapeia para '/imagens/remover-fundo'
    UPSCALER_ESRGAN: 'aumentar-qualidade', // Reverte para o Real-ESRGAN, usando o endpoint original
  };



  useEffect(() => {
    let isMounted = true;

    async function inicializarPica() {
      try {
        const instance = pica({ features: ['js', 'wasm', 'ww'] });

        if (isMounted) {
          setPicaInstance(instance);
          setCarregando(false);
          console.log('%c✅ Pica.js inicializado com sucesso', 'color:#10B981; font-weight:bold;');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar Pica.js:', error);
        if (isMounted) {
          setErroPdf('Erro ao carregar módulo de redimensionamento');
          setCarregando(false);
        }
      }
    }

    inicializarPica();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
      console.log(`Tudo começa aqui: handleUpload`, file);

    }
  };

  const processImage = async (type) => {
    if (!image) {
      return Swal.fire({
        icon: 'warning',
        title: 'Atenção!',
        text: 'Selecione uma imagem primeiro.',
      });
    }

    setLoading(true);
    let dataToSend = {};

    // 🔹 Calcula tamanho original (para comparação depois)
    const originalBitmap = await createImageBitmap(image);
    const originalWidth = originalBitmap.width;
    const originalHeight = originalBitmap.height;
    const originalMaxSide = Math.max(originalWidth, originalHeight);

    // 🔹 Calcula o tamanho esperado com base no fator do front-end
    const expectedMaxSide = Math.min(originalMaxSide * scaleFactor, 10000); // 10k é o teto de segurança
    console.log(`📏 Original: ${originalWidth}x${originalHeight} → Esperado: ${expectedMaxSide}px`);

    // --- Monta o payload ---
    if (type === MODELS.UPSCALER_ESRGAN) {
      try {
        const base64Image = await downsizeParaReplicate(image);
        dataToSend.image = base64Image;
        dataToSend.scale = scaleFactor;
      } catch (e) {
        setLoading(false);
        console.error("Erro ao redimensionar imagem:", e);
        return Swal.fire({
          icon: 'error',
          title: 'Erro de Redimensionamento!',
          text: 'Falha ao preparar imagem para envio.',
        });
      }
    } else {
      const formData = new FormData();
      formData.append('image', image);
      dataToSend = formData;
    }

    const endpoint = `/imagens/${type}`;

    try {
      const res = await axios.post(endpoint, dataToSend, {
        headers: {
          'Content-Type': type === MODELS.UPSCALER_ESRGAN ? 'application/json' : 'multipart/form-data',
        },
      });

      console.log("🛰️ Retorno completo do backend:", res.data);

      const outputUrlOrBase64 =
        res.data?.output_base64_or_url ||
        res.data?.replicate_id ||
        null;

      if (!outputUrlOrBase64) {
        Swal.fire({
          icon: 'warning',
          title: 'Sem resultado!',
          text: 'O backend não retornou a imagem processada.',
        });
        return;
      }

      setResult(res.data.output_base64_or_url)

      // --- 🔥 PÓS-PROCESSAMENTO PICA ---
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = outputUrlOrBase64;

      await new Promise((resolve) => (img.onload = resolve));
      const imgBitmap = await createImageBitmap(img);

      const resultMaxSide = Math.max(imgBitmap.width, imgBitmap.height);
      console.log(`📈 IA: ${imgBitmap.width}x${imgBitmap.height} (max: ${resultMaxSide})`);

      let finalBase64 = outputUrlOrBase64;

      // ✅ Se a IA não atingiu o tamanho esperado, o Pica entra em ação
      if (resultMaxSide < expectedMaxSide) {
        const fatorRestante = expectedMaxSide / resultMaxSide;
        const targetW = Math.round(imgBitmap.width * fatorRestante);
        const targetH = Math.round(imgBitmap.height * fatorRestante);

        console.log(`⚙️ Aplicando Pica: aumento restante ${fatorRestante.toFixed(2)}x até ${targetW}x${targetH}`);

      } else {
        console.log("✅ Aumento da IA já suficiente — Pica não aplicado.");
      }

      Swal.fire({
        icon: 'success',
        title: 'Imagem pronta!',
        text: 'A imagem foi aprimorada com sucesso!',
        timer: 2000,
        showConfirmButton: false
      });

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
   * Função para iniciar o download da imagem Base64 (assumindo JPEG).
   */
  const handleDownload = async () => {
    if (!result) return;


    const url = result
    const ext = url.split('.').pop().split('?')[0];

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `resultado.${ext}`;
      link.click();
      URL.revokeObjectURL(link.href);

      // Swal.fire({
      //   icon: 'success',
      //   title: 'Download iniciado',
      //   text: 'Sua imagem está sendo baixada.',
      //   timer: 2000,
      //   showConfirmButton: false
      // });

    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro no download',
        text: 'Não foi possível baixar a imagem. Verifique o console.',
      });
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
      maxWidthOrHeight: targetMaxWidthOrHeight,
      useWebWorker: true,
      maxSizeMB: 2,
      initialQuality: 1.0,
      fileType: 'image/jpeg',
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
              step="1"
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
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md btn-base bg-purple-600 text-white hover:bg-purple-700 flex-1"
            disabled={loading || !image}
          >
            {loading && MODELS.REMOVE_BG === 'remover-fundo' ? 'Removendo Fundo...' : '🗑️ Remover Fundo'}
          </button>

          <button
            onClick={() => processImage(MODELS.UPSCALER_ESRGAN)}
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md bg-emerald-600 text-white hover:bg-emerald-700 flex-1"
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
                <div className="relative text-center bg-green-50 p-4 rounded-lg shadow-md">
                  {console.log("🔄 Tentando renderizar imagem:", result)}
                  <p className="font-semibold mb-3 text-green-700">Resultado ({scaleFactor}x)</p>

                  {/* Botão de Download Adicionado */}
                  <button
                    onClick={handleDownload}
                    className="absolute top-3 right-3 p-2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full transition duration-200 shadow-lg z-10"
                    title="Baixar Imagem Processada"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                  </button>

                  <img
                    src={result}
                    alt="Depois"
                    className="w-full h-auto rounded-lg shadow-xl border border-green-400 mx-auto"
                    style={{ maxHeight: '500px', objectFit: 'contain' }}
                    onError={(e) => console.error("🚨 Erro ao carregar imagem:", e)}

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