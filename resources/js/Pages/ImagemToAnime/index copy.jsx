import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import Footer from '@/Components/Footer';
import imageCompression from 'browser-image-compression';
import { wallet } from '@/Services/Carteira/index.js';
import { downloadCount } from '@/Services/DownloadsCount/index.js';

// Definição do componente principal
export default function TratamentoImagens() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // 1. Original
  // O estado 'resulyt' será usado para o 3. Final Pica Corrected Result
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(4);
  const [carregando, setCarregando] = useState(true); // Inicializa como true para esperar o Pica
  const [lastOperationType, setLastOperationType] = useState(null);

  // Mapeamento dos modelos
  const MODELS = {   
    QWEN_LORA_PHOTO_TO_ANIME: 'imagem-to-anime',
    QWEN_LORA_PHOTO_TO_ANIME_PRICE: 0.25,
  };
  
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      // Limpa todos os resultados ao carregar uma nova imagem
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
    // Limpa resultados anteriores antes de começar
    setResult(null);

    let dataToSend = {};
   
    const endpoint = `/imagens/${type}`;

    let res = null;
    let usarCarteira = null;

    try {

      setLastOperationType('qwen-lora-photo-to-anime');

      usarCarteira = await wallet({
        preco: MODELS.QWEN_LORA_PHOTO_TO_ANIME_PRICE,
        fileName: "qwen-lora-photo-to-anime",
      });

      if (usarCarteira.success) {
        res = await axios.post(endpoint, dataToSend, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        console.log(usarCarteira.success);
        return;
      }

      console.log("Novo saldo:", usarCarteira.new_balance);
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


      // --- Lógica de Pós-Processamento para UPSCALER ---
      if (type === MODELS.QWEN_LORA_PHOTO_TO_ANIME) {

        // 1. Salva o resultado FINAL (AI + Pica)
        setResult(outputUrlOrBase64);

        // 💡 LÓGICA PARA CONTABILIZAR O USO DO UPSCALER 💡
        try {
          // 'upscaler' é um bom nome para o 'file_name' no contexto do seu backend
          await axios.post(route('user.downloads.store'), {
            file_name: 'qwen-lora-photo-to-anime ', // Nome da ação/download que você quer contar
          });
          console.log("✅ Uso do qwen-lora-photo-to-anime contabilizado com sucesso!");
        } catch (error) {
          // Se der erro na contagem, apenas logamos e não impedimos o usuário de ver a imagem
          console.error("⚠️ Erro ao contabilizar uso do qwen-lora-photo-to-anime:", error);
        }


        Swal.fire({
          icon: 'success',
          title: 'Imagem pronta!',
          text: `A imagem foi aprimorada e corrigida!`,
          timer: 2000,
          showConfirmButton: false
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
 * Função para iniciar o download da imagem Base64 ou URL.
 */
  const handleDownload = async (type) => {
    if (!result) return;

    const url = result;

    let ext = null;

    if (type === MODELS.REMOVE_BG) {
      // ✅ CORREÇÃO 1: Garante que o formato seja PNG se for remoção de fundo (para manter transparência).
      let ext = (type === MODELS.REMOVE_BG || url.startsWith('data:image/png'))
        ? 'png'
        : 'jpg';
    } else {
      ext = 'webp';
    }

    try {
      let link;

      // Lógica de download (funciona para Base64 e URL externa)
      const response = await fetch(url);
      const blob = await response.blob();

      link = document.createElement('a');
      link.href = URL.createObjectURL(blob);

      // Define o nome do arquivo com a extensão correta
      link.download = `resultado_final_corrigido.${ext}`;

      link.click();
      URL.revokeObjectURL(link.href);


      // ✅ CORREÇÃO 2: Contagem de uso (Nome da função deve ser genérico)
      let fileName = (lastOperationType === MODELS.REMOVE_BG)
        ? 'recraft-remove-background'
        : 'recraft-crisp-upscale';

      // Supondo que você renomeou 'upscaleCount' no seu backend para refletir o uso genérico
      await downloadCount(fileName);

      console.log(`Download logado para: ${fileName}`);

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
   * (Mantido como estava, pois é para pré-processamento do backend)
   */
  async function downsizeParaReplicate(file) {

    const MAX_PIXELS = 2096704;
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

    if (originalPixels > MAX_PIXELS) {
      const reductionFactor = Math.sqrt(originalPixels / MAX_PIXELS);
      targetMaxWidthOrHeight = Math.floor(Math.max(originalWidth, originalHeight) / reductionFactor);

      console.warn(`⚠️ Imagem original será reduzida. Novo max size: ${targetMaxWidthOrHeight}px`);
    } else {
      console.log(`✅ Imagem original está no limite. Não será redimensionada.`);
    }

    const options = {
      maxWidthOrHeight: targetMaxWidthOrHeight,
      useWebWorker: true,
      maxSizeMB: 2,
      initialQuality: 1.0,
      fileType: 'image/jpeg',
      alwaysKeepResolution: true,
    };

    const compressedBlob = await imageCompression(file, options);
    const finalBase64 = await imageCompression.getDataUrlFromFile(compressedBlob);

    console.log(`--- AJUSTE CONCLUÍDO ---`);
    console.log(`Tamanho final do Base64: ${(finalBase64.length / (1024 * 1024)).toFixed(2)} MB`);

    return finalBase64;
  }



  return (
    <AuthenticatedLayout>
      <Head title="Tratamento de Imagens" />
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 border-b pb-2">
          🪄 Tratamento de Imagens com IA.
        </h2>
        <p className="text-gray-600 font-bold mb-6">
          Selecione uma imagem para transformar em Anime.
        </p>

        {/* Upload e Configurações */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-5">
          <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">Comparação de Resultados</h3>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>

            {/* 1. Original */}
            <div className="text-center bg-gray-100 p-4 rounded-lg shadow-inner flex flex-col items-center">
              <p className="font-semibold mb-3 text-gray-700">Original</p>
              <img
                src="/imagens/modelo-imagem-to-anime.png"
                alt="Modelo"
                className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto"
                style={{ maxHeight: '600px', objectFit: 'contain' }}
              />
            </div>

            <div className="text-center bg-gray-100 p-4 rounded-lg shadow-inner flex flex-col items-center">
              <p className="font-semibold mb-3 text-gray-700">Modificada</p>
              <img
                src="/imagens/resultado-imagem-to-anime.png"
                alt="Resultado"
                className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto"
                style={{ maxHeight: '600px', objectFit: 'contain' }}
              />
            </div>

          </div>
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

        </div>
        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button
            onClick={() => processImage(MODELS.QWEN_LORA_PHOTO_TO_ANIME)}
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md bg-blue-600 text-white hover:bg-blue-700 flex-1"
            disabled={loading || !image}
          >
            {loading && MODELS.QWEN_LORA_PHOTO_TO_ANIME === 'imagem-to-anime' ? 'Trabalhando na Imagem . . .' : '🎨 Foto para Anime'}
          </button>

        </div>

        {loading && <p className="mt-4 text-center text-indigo-600 font-medium">⏳ Processando imagem... Esta etapa pode levar alguns segundos.</p>}

        {/* Preview das Imagens - Layout de 3 Colunas */}
        {imagePreview && (
          <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Comparação de Resultados</h3>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>

              {/* 1. Original */}
              <div className="text-center bg-gray-100 p-4 rounded-lg shadow-inner flex flex-col items-center">
                <p className="font-semibold mb-3 text-gray-700">1. Original</p>
                <img
                  src={imagePreview}
                  alt="Original"
                  className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto"
                  style={{ maxHeight: '600px', objectFit: 'contain' }}
                />
              </div>
            
              {/* 2. Resultado Final Corrigido  */}
              {result ? (
                <div className="relative text-center bg-green-50 p-4 rounded-lg shadow-xl border-4 border-green-500 flex flex-col items-center">
                  <p className="font-semibold mb-3 text-green-700">3. Resultado Final Corrigido ({scaleFactor}x)</p>

                  {/* Botão de Download Adicionado - Apenas no resultado final */}
                  <button
                    onClick={() => handleDownload(lastOperationType)}
                    className="absolute top-3 right-3 p-2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full transition duration-200 shadow-lg z-10"
                    title="Baixar Imagem Processada"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                  </button>

                  <img
                    src={result}
                    alt="Final Corrigido"
                    className="w-full h-auto rounded-lg shadow-xl border border-green-400 mx-auto"
                    style={{ maxHeight: '600px', objectFit: 'contain' }}
                    onError={(e) => console.error("🚨 Erro ao carregar imagem final:", e)}
                  />
                </div>
              ) : (
                <div className="text-center p-4 rounded-lg shadow-inner bg-gray-100 flex items-center justify-center min-h-[250px]">
                  <p className="text-gray-500">Aguardando correção . . .</p>
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