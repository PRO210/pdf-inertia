import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import Footer from '@/Components/Footer';
import imageCompression from 'browser-image-compression';
import pica from 'pica';


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
  const [picaInstance, setPicaInstance] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Inicializa o Pica.js uma vez
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
      console.log(file);

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
        res.data?.output ||
        res.data?.url ||
        null;

      if (!outputUrlOrBase64) {
        Swal.fire({
          icon: 'warning',
          title: 'Sem resultado!',
          text: 'O backend não retornou a imagem processada.',
        });
        return;
      }

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

        let { base64 } = await ajustarImagemPica(imgBitmap, targetW, targetH);

        console.log("✅ Base64 pronto:", base64);

        finalBase64 = base64;


      } else {
        console.log("✅ Aumento da IA já suficiente — Pica não aplicado.");
      }

      // --- Atualiza imagem final ---
      const finalUrl = `${finalBase64}?cacheBust=${Date.now()}`;
      setResult(finalUrl);

      console.log(`finalUrl`, finalUrl);


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

    // Garante que urlToDownload seja declarada no escopo superior para ser acessível pelo setTimeout
    let urlToDownload = null;

    try {
      const isBase64 = result.startsWith('data:image');


      // ... (dentro de handleDownload)

      if (isBase64) {
        // O MIME type para JPEG (conforme sua simplificação)
        const mimeType = 'image/jpeg';

        const parts = result.split(',');

        // Certifique-se de que estamos pegando a parte dos dados
        let base64Data = parts[parts.length - 1];

        // 🔑 CORREÇÃO CRÍTICA: Limpa a string Base64 antes de atob()
        // Isso remove espaços, quebras de linha e quaisquer caracteres que causem o DOMException.
        base64Data = base64Data.replace(/\s/g, '');

        // O erro DOMException acontece aqui, na linha que deve ser Index.jsx:228
        const byteString = atob(base64Data);

        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }

        // Cria o Blob e a URL
        const blob = new Blob([ab], { type: mimeType });
        urlToDownload = URL.createObjectURL(blob);

        // Cria o link temporário para download
        const link = document.createElement('a');
        link.href = urlToDownload;
        link.download = `imagem_processada_${Date.now()}.jpeg`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Revoga a URL blob e exibe sucesso
      if (urlToDownload) {
        setTimeout(() => URL.revokeObjectURL(urlToDownload), 1000);
      }

      Swal.fire({
        icon: 'success',
        title: 'Download iniciado',
        text: 'Sua imagem está sendo baixada.',
        timer: 2000,
        showConfirmButton: false
      });

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

  /**
   * Redimensiona uma imagem (ImageBitmap) progressivamente com Pica.js,
   * aplicando múltiplos passos (máx. 2× por vez) e garantindo que
   * o lado maior nunca ultrapasse 10 000 px.
   *
   * Ideal para pós-processamento após upscale de IA.
   *
   * @param {ImageBitmap} imgBitmap - Imagem original.
   * @param {number} upscaleFactor - Fator de aumento aplicado pela IA (ex: 4).
   * @param {number} maxSize - Tamanho máximo permitido (ex: 10000px).
   * @returns {Promise<{base64: string, blob: Blob, width: number, height: number}>}
   */
  async function ajustarImagemPica(imgBitmap, upscaleFactor = 4, maxSize = 10000) {

    const MAX_STEP = 2; // agora 2× por passo (mais rápido)   

    // ✅ Instância única e segura do Pica
    if (!window.__picaInstance) {
      try {
        window.__picaInstance = pica({ features: ['js', 'wasm', 'ww'] });
        console.log('%c✅ Instância Pica inicializada', 'color:#10B981; font-weight:bold;');
      } catch (err) {
        console.error('❌ Erro ao inicializar Pica:', err);
        window.__picaInstance = pica(); // fallback simples
      }
    }
    const p = window.__picaInstance;

    // Canvas inicial
    let currentCanvas = document.createElement("canvas");
    currentCanvas.width = imgBitmap.width;
    currentCanvas.height = imgBitmap.height;
    currentCanvas.getContext("2d").drawImage(imgBitmap, 0, 0);

    const originalW = imgBitmap.width;
    const originalH = imgBitmap.height;
    const ratio = originalH / originalW;
    const isHeightGreater = originalH > originalW;

    // --- 1️⃣ Define o tamanho "ideal" que a IA teria após upscale ---
    const iaTargetW = Math.round(originalW * upscaleFactor);
    const iaTargetH = Math.round(originalH * upscaleFactor);
    const iaMaxSide = Math.max(iaTargetW, iaTargetH);

    // --- 2️⃣ Define o tamanho final permitido (máx. 10k) ---
    const finalMaxSide = Math.min(iaMaxSide, maxSize);

    // Se já está dentro do limite, não faz nada
    if (iaMaxSide <= maxSize) {
      console.log(`✅ Imagem já dentro do limite (${iaMaxSide}px). Nenhum ajuste necessário.`);
    }

    let currentMaxSide = Math.max(originalW, originalH);

    // --- 3️⃣ Redimensiona progressivamente até atingir o destino ---
    while (currentMaxSide !== finalMaxSide) {
      const isUpscaling = currentMaxSide < finalMaxSide;

      // fator progressivo (máx. 2× por passo)
      let scale;
      if (isUpscaling) {
        scale = Math.min(MAX_STEP, finalMaxSide / currentMaxSide);
      } else {
        scale = Math.max(1 / MAX_STEP, finalMaxSide / currentMaxSide);
      }

      let nextMaxSide = Math.round(currentMaxSide * scale);
      nextMaxSide = isUpscaling
        ? Math.min(nextMaxSide, finalMaxSide)
        : Math.max(nextMaxSide, finalMaxSide);

      let nextW, nextH;
      if (isHeightGreater) {
        nextH = nextMaxSide;
        nextW = Math.round(nextH / ratio);
      } else {
        nextW = nextMaxSide;
        nextH = Math.round(nextW * ratio);
      }

      currentMaxSide = nextMaxSide;

      const dst = document.createElement("canvas");
      dst.width = nextW;
      dst.height = nextH;

      const resizeOptions = {
        quality: 3,
        alpha: true,
      };

      await new Promise((resolve) => setTimeout(resolve, 0));
      await p.resize(currentCanvas, dst, resizeOptions);

      currentCanvas = dst;
    }

    // --- 4️⃣ Gera resultado ---
    const resultadoCanvas = currentCanvas;

    // 5. Converte o Canvas para Blob (JPEG com qualidade 1.0)
    const blob = await new Promise(res => resultadoCanvas.toBlob(res, 'image/jpeg', 1.0));

    // 6. Converte o Blob para Base64 usando FileReader (Alternativa Nativa)
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // Retorna a string Base64
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return {
      base64,
      blob,
      width: resultadoCanvas.width,
      height: resultadoCanvas.height,
    };
  }



  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">

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