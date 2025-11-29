import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Footer from '@/Components/Footer';
import imageCompression from 'browser-image-compression';
import { wallet } from '@/Services/Carteira/index.js';
import { downloadCount } from '@/Services/DownloadsCount/index.js';

export default function TratamentoImagens() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mapeamento exclusivo solicitado
  const MODELS = {
    QWEN_LORA_PHOTO_TO_ANIME: 'imagem-to-anime',
    QWEN_LORA_PHOTO_TO_ANIME_PRICE: 0.25,
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null); // Limpa resultado anterior
    }
  };

  /**
   * Ajusta o tamanho da imagem para o Replicate e retorna Base64
   */
  async function downsizeParaReplicate(file) {
    const MAX_PIXELS = 2096704; // Limite ~2.1MP
    const img = new Image();
    const tempUrl = URL.createObjectURL(file);
    img.src = tempUrl;

    await new Promise((resolve) => { img.onload = resolve; });

    const originalPixels = img.naturalWidth * img.naturalHeight;
    let targetMaxWidthOrHeight = Math.max(img.naturalWidth, img.naturalHeight);

    // Se for muito grande, calcula novo tamanho
    if (originalPixels > MAX_PIXELS) {
      const reductionFactor = Math.sqrt(originalPixels / MAX_PIXELS);
      targetMaxWidthOrHeight = Math.floor(targetMaxWidthOrHeight / reductionFactor);
      console.log(`⚠️ Redimensionando para: ${targetMaxWidthOrHeight}px (maior lado)`);
    }

    URL.revokeObjectURL(tempUrl);

    const options = {
      maxWidthOrHeight: targetMaxWidthOrHeight,
      useWebWorker: true,
      maxSizeMB: 2, // Tenta manter abaixo de 2MB
      initialQuality: 1.0, // Leve compressão
      fileType: 'image/jpeg',
    };

    try {
      const compressedBlob = await imageCompression(file, options);
      return await imageCompression.getDataUrlFromFile(compressedBlob);
    } catch (error) {
      console.error("Erro na compressão:", error);
      throw new Error("Falha ao preparar imagem.");
    }
  }

  const processImage = async () => {
    if (!image) {
      return Swal.fire({ icon: 'warning', title: 'Atenção!', text: 'Selecione uma imagem primeiro.' });
    }

    setLoading(true);
    setResult(null);

    // Define o tipo fixo conforme solicitado
    const type = MODELS.QWEN_LORA_PHOTO_TO_ANIME;
    const endpoint = `/imagens/${type}`;

    try {
      // 1. Verificar Carteira
      const usarCarteira = await wallet({
        preco: MODELS.QWEN_LORA_PHOTO_TO_ANIME_PRICE,
        fileName: "qwen-lora-photo-to-anime",
      });

      if (!usarCarteira.success) {
        return; // O serviço de wallet geralmente já exibe o erro ou aviso
      }

      console.log("💰 Saldo atualizado:", usarCarteira.new_balance);

      // 2. Preparar Imagem (Downsize + Base64)
      console.log("⏳ Preparando imagem...");
      const base64Image = await downsizeParaReplicate(image);

      // 3. Enviar para o Backend
      // IMPORTANTE: Certifique-se que seu backend espera a chave "image" ou ajuste conforme necessário
      const dataToSend = {
        image: base64Image,
        model_id: type
      };

      const res = await axios.post(endpoint, dataToSend, {
        headers: { 'Content-Type': 'application/json' },
      });

      const outputUrlOrBase64 = res.data?.output_base64_or_url || res.data?.replicate_id || null;

      if (!outputUrlOrBase64) {
        throw new Error("O backend não retornou a imagem processada.");
      }

      // 4. Sucesso
      setResult(outputUrlOrBase64);

      // Contabiliza uso específico do anime
      try {
        await axios.post(route('user.downloads.store'), {
          file_name: 'generated-anime-style',
        });
      } catch (e) { console.error("Erro ao logar uso:", e); }

      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Sua versão anime está pronta!',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (err) {
      console.error("Erro ao processar:", err);
      Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: err.message || 'Falha na comunicação com o servidor.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    try {
      const response = await fetch(result);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `anime_result_${Date.now()}.png`; // Sempre salva como PNG para garantir qualidade

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      // Log estatístico de download
      await downloadCount('anime-download-action');

    } catch (err) {
      console.error('Erro no download:', err);
      Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível baixar a imagem.' });
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Foto para Anime" />
      <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
       
        <h3 className="text-gray-600 font-bold mb-6 text-center text-2xl">
          A IA recria sua foto no estilo de animação  🎌.
        </h3>

        {/* Exemplos */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-5">
          
          <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">Exemplos</h3>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>
           
            <div className="text-center bg-gray-100 p-4 rounded-lg shadow-inner flex flex-col items-center">
              <p className="font-semibold mb-3 text-gray-700">Original</p>
              <img
                src="/imagens/modelo-imagem-to-anime.png"
                alt="Modelo"
                className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto py-4"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
              />
            </div>

            <div className="text-center bg-gray-100 p-4 rounded-lg shadow-inner flex flex-col items-center">
              <p className="font-semibold mb-3 text-gray-700">Modificada</p>
              <img
                src="/imagens/resultado-imagem-to-anime.png"
                alt="Resultado"
                className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto py-4"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
              />
            </div>

          </div>
        </div>
        <br />

          {/* Área de Upload */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-5">
            <label className="block text-lg font-bold text-gray-700">
              Carregar Foto
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
                       hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          {/* Botão de Processamento */}
          <div className="mt-6">
            <button
              onClick={processImage}
              className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all 
              ${loading || !image ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={loading || !image}
            >
              {loading ? '🎨 Desenhando Anime . . .' : '✨ Gerar Versão Anime'}
            </button>
          </div>

          {/* Área de Visualização */}
          {imagePreview && (
            <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Original */}
                <div className="flex flex-col items-center">
                  <p className="font-semibold mb-3 text-gray-700">Original</p>
                  <div className="p-2 bg-gray-100 rounded-lg shadow-inner w-full flex justify-center">
                    <img
                      src={imagePreview}
                      alt="Original"
                      className="rounded max-h-[500px] object-contain"
                    />
                  </div>
                </div>

                {/* Resultado */}
                <div className="flex flex-col items-center relative">
                  <p className="font-semibold mb-3 text-green-700">
                    {result ? "Resultado Anime" : "Aguardando comando. . ."}
                  </p>

                  <div className={`p-2 rounded-lg w-full flex justify-center min-h-[300px] items-center 
                  ${result ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-100 border-dashed border-2 border-gray-300'}`}>

                    {result ? (
                      <div className="relative group w-full flex justify-center">
                        <img
                          src={result}
                          alt="Anime Result"
                          className="rounded shadow-lg max-h-[500px] object-contain"
                        />
                        {/* Botão de Download Flutuante */}
                        <button
                          onClick={handleDownload}
                          className="absolute bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110"
                          title="Baixar Imagem"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center animate-pulse">
                        <span>{loading ? 'Processando...' : 'O resultado aparecerá aqui'}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
        <Footer ano={2025} />
    </AuthenticatedLayout>
  );
}

