import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import Footer from '@/Components/Footer';
import imageCompression from 'browser-image-compression';
import { wallet } from './Partials/usarCarteira';
// import { downloadCount } from './Partials/downloadCount';
// import { downloadImageFromReplicate } from '@/Services/DownloadReplicate';
import usePica from '@/Hooks/usePica';
import { ajustarImagemPica } from '@/Services/PicaService';

import usePendingReplicate from '@/Hooks/usePendingReplicate';
import { waitForReplicateResult } from '@/Services/ReplicateApi';

import { ImageDownsizeCompression } from '@/Services/ImageDownsizeCompression';
import { executarDownloadComLog } from '@/Services/DownloadService';

// 🔥 CORREÇÃO 1: Mapeamento de modelos movido para fora do componente
// Isso impede erros de inicialização e economiza memória no React
const MODELS = {
  REMOVE_BG: 'remover-fundo',
  REMOVE_BG_PRICE: 0.1,
  UPSCALER_ESRGAN: 'aumentar-qualidade',
  UPSCALER_ESRGAN_PRICE: 0.1,
  NAFNet: 'remoção-de-ruido-desfoque',
  NAFNet_PRICE: 0.1,
};

export default function TratamentoImagens() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scaleFactor, setScaleFactor] = useState(4);

  // PicaJs agora usado com Lib e importado como Hook
  const { picaInstance, carregando, erroPica, isReady } = usePica();

  // 🔥 Agora MODELS já existe e pode ser passado com segurança para o Hook
  const {
    loading,
    setLoading,
    result,
    setResult,
    lastOperationType,
    setLastOperationType,
    bgRemovedImageUrl,
    setBgRemovedImageUrl,
    upscaledImageUrl,
    setUpscaledImageUrl,
    limparEstadosReplicate
  } = usePendingReplicate(MODELS);

  // Estados locais para controle de exibição de imagens
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [originalImageUrlToBgRemov, setOriginalImageUrlToBgRemov] = useState(null);
  const [lastSavedImageId, setLastSavedImageId] = useState(null);
  const [replicateId, setReplicateId] = useState(null);
  const [currentOperation, setCurrentOperation] = useState(null);

  // 🔥 CORREÇÃO 3: Declaração da função que faltava no useEffect
  const recuperarPrevisaoPendente = () => {
    console.log("Buscando previsões pendentes no localStorage...");
    const pendingId = localStorage.getItem('pending_replicate_id');
    if (pendingId) {
      setReplicateId(pendingId);
    }
  };

  useEffect(() => {
    recuperarPrevisaoPendente();
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));

      // 🔥 Limpa os estados internos do HOOK com segurança:
      limparEstadosReplicate();

      // 2. Limpa os seus estados locais (Exibição e Histórico)
      setOriginalImageUrl(null);           // Limpa a original do Upscaler
      setOriginalImageUrlToBgRemov(null);  // Limpa a original do RemoveBG
      setLastSavedImageId(null);           // Limpa o ponteiro do IndexedDB
      setReplicateId(null);                // Limpa o ID de previsão local
      setCurrentOperation(null);           // Limpa a operação atual, se houver

      // Limpa o localStorage para a nova sessão de tratamento
      localStorage.removeItem('pending_replicate_id');
      localStorage.removeItem('pending_replicate_type');

      console.log(`Tudo começa aqui: handleUpload`, file);
    }
  };


  const processImage = async (type) => {

    setLastOperationType(type);
    setLoading(true);

    if (!image) {
      return Swal.fire({
        icon: 'warning',
        title: 'Atenção!',
        text: 'Selecione uma imagem primeiro.',
      });
    }
    // Limpa resultados anteriores antes de começar
    setResult(null);
    setOriginalImageUrlToBgRemov(null);
    setBgRemovedImageUrl(null);

    // Mostra o alerta se o Pica ainda não carregou para o modo de upscaling
    if (type === MODELS.UPSCALER_ESRGAN && carregando) {
      return Swal.fire({
        icon: 'info',
        title: 'Aguarde!',
        text: 'Aguarde o carregamento do módulo para o processamento e upscale de imagem.',
      });
    }

    let dataToSend = {};
    let originalWidth, originalHeight, originalMaxSide;
    let expectedMaxSide;

    // Lógica específica para o Upscaler
    if (type === MODELS.UPSCALER_ESRGAN) {
      try {
        // 🔹 Calcula tamanho original para referência
        const originalBitmap = await createImageBitmap(image);
        originalWidth = originalBitmap.width;
        originalHeight = originalBitmap.height;
        originalMaxSide = Math.max(originalWidth, originalHeight);

        // 🔹 Calcula o tamanho esperado
        expectedMaxSide = Math.min(originalMaxSide * scaleFactor, 9000); // Teto de 9k
        console.log(`📏 Original: ${originalWidth}x${originalHeight} → Esperado: ${expectedMaxSide} px`);

        const base64Image = await ImageDownsizeCompression(image);
        dataToSend.image = base64Image;
        dataToSend.scale = scaleFactor;

      } catch (e) {
        setLoading(false);
        console.error("Erro ao preparar imagem:", e);
        return Swal.fire({
          icon: 'error',
          title: 'Erro de Preparação!',
          text: 'Falha ao preparar imagem para envio.',
        });
      }
    } else if (type === MODELS.REMOVE_BG) {
      // Lógica para Remover Fundo (multipart)
      const formData = new FormData();
      formData.append('image', image);
      dataToSend = formData;
    } else if (type === MODELS.NAFNet) {
      // 🆕 Lógica Específica para NAFNet (Remoção de Ruído/Desfoque)
      try {
        // 🔹 Calcula tamanho original para referência
        const originalBitmap = await createImageBitmap(image);
        originalWidth = originalBitmap.width;
        originalHeight = originalBitmap.height;
        originalMaxSide = Math.max(originalWidth, originalHeight);

        // 🔹 Calcula o tamanho esperado
        expectedMaxSide = Math.min(originalMaxSide * scaleFactor, 9000); // Teto de 9k
        console.log(`📏 Original: ${originalWidth}x${originalHeight} → Esperado: ${expectedMaxSide} px`);

        // O NAFNet espera apenas o Base64 da imagem (sem downsize complexo)
        const base64Image = await ImageDownsizeCompression(image);
        dataToSend.image = base64Image;
        dataToSend.scale = scaleFactor;

        console.log(`🧼 NAFNet: Imagem Base64 pronta para envio.`);

      } catch (e) {
        setLoading(false);
        console.error("Erro ao preparar imagem para NAFNet:", e);
        return Swal.fire({
          icon: 'error',
          title: 'Erro de Preparação!',
          text: 'Falha ao preparar imagem para remoção de ruído.',
        });
      }

    }

    const endpoint = `/imagens/${type}`;

    let res = null;
    let usarCarteira = null;

    try {
      /* Acessando a carteira */
      if (type === MODELS.UPSCALER_ESRGAN) {

        usarCarteira = await wallet({
          preco: MODELS.UPSCALER_ESRGAN_PRICE,
          fileName: "recraft-crisp-upscale",
        });

        if (usarCarteira.success) {
          res = await axios.post(endpoint, dataToSend, {
            headers: {
              'Content-Type': type === MODELS.UPSCALER_ESRGAN ? 'application/json' : 'multipart/form-data',
            },
          });
        } else {
          console.log(usarCarteira.success);
          return;
        }

      } else if (type === MODELS.NAFNet) {

        console.log(`Aqui MODELS.NAFNet`, MODELS.NAFNet);

        const price = MODELS.NAFNet_PRICE;
        const fileName = "nafnet-denoise";

        usarCarteira = await wallet({ preco: price, fileName: fileName });

        if (usarCarteira.success) {
          res = await axios.post(endpoint, dataToSend, {
            headers: {
              'Content-Type': type === MODELS.NAFNet ? 'application/json' : 'multipart/form-data',
            },
          });
        } else {
          setLoading(false);
          console.log("Falha na carteira:", usarCarteira.success);
          return;
        }

      } else if (type === MODELS.REMOVE_BG) {

        usarCarteira = await wallet({
          preco: MODELS.REMOVE_BG_PRICE,
          fileName: "recraft-remove-background",
        });

        if (usarCarteira.success) {
          res = await axios.post(endpoint, dataToSend, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } else {
          console.log(usarCarteira.success);
          return;
        }
      }

      console.log("Novo saldo:", usarCarteira.new_balance);

      // 1. Pegamos os dados de forma segura
      const data = res.data;
      const replicatePredictionId = data?.replicate_id;
      let outputUrlOrBase64 = data?.output_base64_or_url;

      // console.log("Retorno do PHP:", data);
      console.log("ID do Replicate capturado:", replicatePredictionId);
      // console.log("Output imediato capturado:", outputUrlOrBase64);
      // 2. Verificação simplificada: Se não veio a imagem, mas veio o ID, precisamos esperar.
      if (replicatePredictionId) {

        console.log("🚀 Condição aceita: Iniciando espera pelo resultado...");

        // Salva os metadados e o ID imediatamente no localStorage antes do polling
        localStorage.setItem('pending_replicate_id', replicatePredictionId);
        localStorage.setItem('pending_replicate_type', type);

        // 
        const finalUrl = await waitForReplicateResult(replicatePredictionId);

        if (finalUrl) {
          outputUrlOrBase64 = finalUrl; // Atualiza a variável local para o Pica usar
          setResult(finalUrl);          // Atualiza o estado para mostrar na tela
          console.log("✅ URL da imagem obtida com sucesso:", finalUrl);
        } else {
          console.error("❌ O polling falhou ou retornou vazio.");
          // Se falhou, limpa o ID do localStorage
          localStorage.removeItem('pending_replicate_id');
          localStorage.removeItem('pending_replicate_type');
          setLoading(false);
          return;
        }
      }

      if (!outputUrlOrBase64) {
        Swal.fire({
          icon: 'warning',
          title: 'Sem resultado!',
          text: 'O backend não retornou a imagem processada.',
        });

        return;
      }

      // Se for apenas remoção de fundo, salva o resultado direto em 'result'
      if (type === MODELS.REMOVE_BG) {

        setResult(outputUrlOrBase64);

        Swal.fire({
          icon: 'success',
          title: 'Imagem pronta!',
          text: `A imagem foi aprimorada e corrigida!`,
          timer: 2000,
          showConfirmButton: false
        });

      }

      // --- Lógica de Pós-Processamento para UPSCALER ---
      if (type === MODELS.UPSCALER_ESRGAN) {

        // 1. Salva o resultado RAW da IA para comparação
        setUpscaledImageUrl(outputUrlOrBase64);

        // 2. Obtém o output da IA e o transforma em ImageBitmap
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = outputUrlOrBase64;

        // Espera o carregamento da imagem da IA
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const imgBitmap = await createImageBitmap(img);

        const resultMaxSide = Math.max(imgBitmap.width, imgBitmap.height);
        console.log(`📈 IA: ${imgBitmap.width}x${imgBitmap.height} (max: ${resultMaxSide})`);

        let finalBase64 = outputUrlOrBase64;
        let finalWidth = imgBitmap.width;
        let finalHeight = imgBitmap.height;

        // ✅ Se a IA não atingiu o tamanho esperado, o Pica entra em ação
        if (resultMaxSide < expectedMaxSide && picaInstance) {

          // Calcula o fator de escala restante (ex: se IA deu 2x, mas queremos 4x, fator restante é 2)
          const fatorRestante = expectedMaxSide / resultMaxSide;

          // Calcula a largura e altura alvo mantendo a proporção da imagem da IA
          const targetW = Math.round(imgBitmap.width * fatorRestante);
          const targetH = Math.round(imgBitmap.height * fatorRestante);

          console.log(`⚙️ Aplicando Pica: aumento restante ${fatorRestante.toFixed(2)}x até ${targetW}x${targetH} `);

          // Chama o serviço  para aumentar o restante
          const resultadoPica = await ajustarImagemPica(imgBitmap, targetW, targetH, picaInstance);

          // Atualiza os resultados finais
          finalBase64 = resultadoPica.base64;
          finalWidth = resultadoPica.width;
          finalHeight = resultadoPica.height;

          console.log(`✅ Pica Concluído.Tamanho Final: ${finalWidth}x${finalHeight} `);

        } else {
          console.log("✅ Aumento da IA já suficiente — sem correção Pica.");
        }

        // 3. Salva o resultado FINAL (AI + Pica)
        setResult(finalBase64);

        Swal.fire({
          icon: 'success',
          title: 'Imagem pronta!',
          text: `A imagem foi aprimorada e corrigida! Tamanho: ${finalWidth}x${finalHeight} `,
          timer: 2000,
          showConfirmButton: false
        });
      }

      // 🔹 Lógica de Pós-Processamento e Contagem
      if (type === MODELS.NAFNet) {
        // NAFNet e RemoveBG simplesmente retornam o resultado processado
        setResult(outputUrlOrBase64);

        Swal.fire({
          icon: 'success',
          title: 'Imagem pronta!',
          text: `Processamento de ${type} concluído.`,
          timer: 2000,
          showConfirmButton: false
        });

      }

    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: `Falha na comunicação com o servidor: ${err.message} `,
      });

    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthenticatedLayout>
      <Head title="Tratamento de Imagens" />
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">

        <h2 className="text-4xl font-extrabold text-gray-800 mb-6 border-b pb-2 text-center">
          🪄 Tratamento de Imagens com IA.
        </h2>

        {/* Upload e Configurações */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-5">
          <label className="block text-lg font-bold text-gray-700">
            1. Carregar Imagem e Configurar
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
              Fator de Escala (para Aumentar Qualidade)
            </label>

            {/* Campo de Entrada Numérico */}
            <input
              id="scale-factor"
              type="number"
              min="4"
              max="10"
              step="1"
              value={scaleFactor}
              onChange={(e) => setScaleFactor(Math.min(10, Math.max(1, parseFloat(e.target.value) || 1)))}
              className="w-full sm:w-1/4 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 hidden sm:inline-block"
            />

            {/* Barra Deslizante (Slider) */}
            <input
              id="scale-factor-slider"
              type="range"
              min="4"
              max="10"
              step="1"
              value={scaleFactor}
              onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none sm:hidden"
            />

            {/* Exibe o valor atual para a barra deslizante */}
            <div className="text-sm font-semibold text-gray-900 mt-2 sm:hidden">
              Valor Atual: {scaleFactor}x
            </div>

            <p className="text-xs text-gray-500 mt-1">
              Defina o multiplicador de resolução. O nosso modelo suporta até 9000px.
            </p>
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
            {loading && MODELS.UPSCALER_ESRGAN === 'aumentar-qualidade' ? 'Aumentando Tamanho...' : '⏫ Aumentar Tamanho'}
          </button>

          <button
            onClick={() => processImage(MODELS.NAFNet)}
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md bg-blue-600 text-white hover:bg-blue-700 flex-1"
            disabled={loading || !image}
          >
            {loading && MODELS.NAFNet === 'remoção-de-ruído-desfoque' ? 'Aumentando Qualidade...' : '💎 Aumentar Qualidade'}
          </button>
        </div>

        {loading && <p className="mt-4 text-center text-indigo-600 font-medium animate-pulse">⏳ Processando imagem... Esta etapa pode levar alguns segundos.</p>}
        {erroPica && <p className="mt-4 text-center text-red-600 font-medium">❌ {erroPica}</p>}

        {/* Preview Principal Adaptativo */}
        {/* ================= SEÇÃO 1: RESULTADO DO PROCESSAMENTO ================= */}
        {result && (
          <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-fade-in">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-800">
                Resultado do Processamento
              </h3>
              {!image && (
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full uppercase tracking-wider">
                  Imagem Recuperada do Histórico
                </span>
              )}
            </div>

            {/* Layout adaptativo: se por acaso ainda houver o preview original na memória, mostra lado a lado, senão centraliza */}
            <div className={`grid grid-cols-1 ${imagePreview ? 'md:grid-cols-2' : 'max-w-2xl mx-auto'} gap-6`}>

              {/* Imagem Original (Opcional - só aparece se ainda estiver no estado) */}
              {imagePreview && (
                <div className="text-center bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center">
                  <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded mb-3">1. Imagem Original</span>
                  <img
                    src={imagePreview}
                    alt="Original"
                    className="w-full h-auto rounded-lg shadow-sm border border-gray-300 mx-auto"
                    style={{ maxHeight: '500px', objectFit: 'contain' }}
                  />
                </div>
              )}

              {/* Card do Resultado Final Processado */}
              <div className="relative text-center bg-indigo-50/50 p-4 rounded-xl border-2 border-indigo-500 flex flex-col items-center shadow-md">
                <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded mb-3">
                  {image ? `Resultado Corrigido (${scaleFactor}x)` : 'Imagem Processada'}
                </span>

                {/* Botão de Download flutuante */}
                <button
                  onClick={() => executarDownloadComLog(lastOperationType, result, MODELS)}
                  className="absolute top-3 right-3 p-2.5 bg-gray-900 bg-opacity-70 hover:bg-opacity-90 text-white rounded-xl transition duration-200 shadow-md z-10 hover:scale-105 active:scale-95"
                  title="Baixar Imagem Processada"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                </button>

                <img
                  src={result}
                  alt="Final Corrigido"
                  className="w-full h-auto rounded-lg shadow-lg border border-indigo-200 mx-auto"
                  style={{ maxHeight: '550px', objectFit: 'contain' }}
                  onError={(e) => console.error("🚨 Erro ao carregar imagem final:", e)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= SEÇÃO 2: PREVIEW DA IMAGEM CARREGADA ================= */}
        {/* Só renderiza se houver preview E NÃO houver um resultado processado ainda */}
        {!result && imagePreview && (
          <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200 max-w-2xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-800">
                Visualização da Imagem Carregada
              </h3>
            </div>

            <div className="text-center bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center">
              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded mb-3">Aguardando Processamento</span>
              <img
                src={imagePreview}
                alt="Preview Original"
                className="w-full h-auto rounded-lg shadow-sm border border-gray-300 mx-auto"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
              />
            </div>
          </div>
        )}

        {/* Histórico Secundário: Remoção de Fundo (Corrigido erros de string da classe grid) */}
        {originalImageUrlToBgRemov && (
          <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">Resultados Anteriores da Remoção de Fundo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center bg-gray-100 p-4 rounded-lg flex flex-col items-center">
                <p className="font-semibold mb-3 text-gray-700">Original de Origem</p>
                <img
                  src={originalImageUrlToBgRemov}
                  alt="Original"
                  className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>

              {bgRemovedImageUrl && (
                <div className="relative text-center bg-amber-50/50 p-4 rounded-lg border-2 border-amber-400 flex flex-col items-center">
                  <p className="font-semibold mb-3 text-amber-800">Resultado Final Sem Fundo</p>
                  <button
                    onClick={() => executarDownloadComLog(MODELS.REMOVE_BG, bgRemovedImageUrl, MODELS)}
                    className="absolute top-3 right-3 p-2 bg-gray-950 bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition duration-200 shadow-md z-10"
                    title="Baixar Imagem"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                  </button>
                  <img
                    src={bgRemovedImageUrl}
                    alt="Final Fundo Removido"
                    className="w-full h-auto rounded-lg shadow-md border border-amber-200 mx-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Histórico Secundário: Upscale */}
        {originalImageUrl && (
          <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">Resultados Anteriores de Upscale</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center bg-gray-100 p-4 rounded-lg flex flex-col items-center">
                <p className="font-semibold mb-3 text-gray-700">Original de Origem</p>
                <img
                  src={originalImageUrl}
                  alt="Original"
                  className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>

              {upscaledImageUrl && (
                <div className="relative text-center bg-amber-50/50 p-4 rounded-lg border-2 border-amber-400 flex flex-col items-center">
                  <p className="font-semibold mb-3 text-amber-800">Resultado Final Upscale</p>
                  <button
                    onClick={() => handleDownload(MODELS.UPSCALE, upscaledImageUrl)}
                    className="absolute top-3 right-3 p-2 bg-gray-950 bg-opacity-60 hover:bg-opacity-80 text-white rounded-lg transition duration-200 shadow-md z-10"
                    title="Baixar Imagem"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                  </button>
                  <img
                    src={upscaledImageUrl}
                    alt="Final Upscale"
                    className="w-full h-auto rounded-lg shadow-md border border-amber-200 mx-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      <Footer ano={2026} />
    </AuthenticatedLayout>
  );


}