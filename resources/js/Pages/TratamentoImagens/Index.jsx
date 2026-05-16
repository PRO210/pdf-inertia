import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import Footer from '@/Components/Footer';
import imageCompression from 'browser-image-compression';
import pica from 'pica';
import { wallet } from './Partials/usarCarteira';
import { downloadCount } from './Partials/downloadCount';
import { downloadImageFromSource } from '@/Services/DownloadHelper';
import { downloadImageFromReplicate } from '@/Services/DownloadReplicate';
import ImageStorage from '@/Services/ImageStorage/ImageStorage';

// Definição do componente principal
export default function TratamentoImagens() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(4);
  const [picaInstance, setPicaInstance] = useState(null);
  const [carregando, setCarregando] = useState(true); // Inicializa como true para esperar o Pica
  const [erroPica, setErroPica] = useState(null);
  const [lastOperationType, setLastOperationType] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [upscaledImageUrl, setUpscaledImageUrl] = useState(null);

  const [originalImageUrlToBgRemov, setOriginalImageUrlToBgRemov] = useState(null);
  const [bgRemovedImageUrl, setBgRemovedImageUrl] = useState(null);
  const [lastSavedImageId, setLastSavedImageId] = useState(null);

  const [replicateId, setReplicateId] = useState(null);
  const [currentOperation, setCurrentOperation] = useState(null);

  // Mapeamento dos modelos
  const MODELS = {
    REMOVE_BG: 'remover-fundo',
    REMOVE_BG_PRICE: 0.1,
    UPSCALER_ESRGAN: 'aumentar-qualidade',
    UPSCALER_ESRGAN_PRICE: 0.1,
    NAFNet: 'remoção-de-ruido-desfoque',
    NAFNet_PRICE: 0.1,
  };

  // // Exemplo: Função Reutilizável de Fetch
  // const fetchSavedImages = async (operationName) => {
  //   try {
  //     setCarregando(true);

  //     // 💡 1. Rota Única (sem parâmetros de URL) + Query Parameter na URL
  //     const url = route('upscale.temp.images') + `?operation=${operationName}`;
  //     // Exemplo de URL gerada: /dashboard/upscale/temp-images?operation=upscale

  //     const response = await axios.get(url);

  //     if (response.data.success) {

  //       const { original_image_url, result_image_url } = response.data;

  //       // 2. 💡 Atualiza os estados específicos com base no nome da operação
  //       if (operationName === 'upscale') {
  //         setOriginalImageUrl(original_image_url);
  //         setUpscaledImageUrl(result_image_url);

  //       } else if (operationName === 'removebg') {
  //         setOriginalImageUrlToBgRemov(original_image_url);
  //         setBgRemovedImageUrl(result_image_url);

  //       }
  //     }
  //   } catch (error) {
  //     console.error(`Erro ao buscar imagens salvas (${operationName}):`, error);
  //   } finally {
  //     setCarregando(false);
  //   }
  // };

  // // 💡 Uso no componente UpscalePage
  // useEffect(() => {
  //   // Basta passar o nome da operação desejada
  //   fetchSavedImages('upscale');
  // }, []);

  // // 💡 Uso no componente RemoveBgPage
  // useEffect(() => {
  //   // Basta passar o nome da operação desejada
  //   fetchSavedImages('removebg');
  // }, []);
  // Adicione esta função dentro do seu componente TratamentoImagens, após os outros hooks de estado:


  /**
     * Carrega a imagem original e processada salvas na IndexedDB e atualiza os estados 
     * corretos (para RemoveBG OU Upscaler) para exibição.
     */
  // const loadSavedImageFromDB = async () => {
  //   const { id, type } = lastSavedImageId;

  //   if (!id || !type) return;

  //   console.log(`⏳ Tentando carregar imagens da IndexedDB para ID: ${id}, Tipo: ${type}`);

  //   // --- 1. LIMPEZA DOS ESTADOS NÃO UTILIZADOS ---
  //   // Isso garante que apenas o resultado da operação atual será exibido.
  //   setOriginalImageUrlToBgRemov(null);
  //   setBgRemovedImageUrl(null);
  //   setOriginalImageUrl(null);
  //   setUpscaledImageUrl(null);

  //   try {
  //     const originalID = `original_${id}_${type}`;
  //     const processedID = `processed_${id}_${type}`;

  //     // 2. Carregar Imagens
  //     const originalBase64 = await ImageStorage._load(originalID);
  //     const processedContent = await ImageStorage._load(processedID); // Renomeado para 'processedContent'

  //     // Se não houver dados salvos, paramos aqui.
  //     if (!originalBase64 && !processedContent) {
  //       console.warn(`⚠️ Não foram encontrados dados salvos para a operação ${type}.`);
  //       return;
  //     }

  //     // 3. Configuração de MIME Type e Data URL

  //     // A Imagem Original (downsized) sempre é salva como Base64 (JPEG)
  //     const originalDataUrl = originalBase64 ? `data:image/jpeg;base64,${originalBase64}` : null;

  //     let processedDataUrl = null;
  //     if (processedContent) {
  //       // 💡 CORREÇÃO AQUI: Verifica se o conteúdo é uma URL externa (http/https) ou Data URL
  //       if (processedContent.startsWith('http') || processedContent.startsWith('data:')) {

  //         processedDataUrl = processedContent;
  //         console.log("💡 Conteúdo Processado é uma URL Externa/Pronta. Não será prefixado.");

  //       } else {
  //         // Se não for URL, assumimos que é uma string Base64 pura e adicionamos o prefixo
  //         const mimeType = (type === MODELS.REMOVE_BG) ? 'image/png' : 'image/jpeg';
  //         processedDataUrl = `data:${mimeType};base64,${processedContent}`;
  //         console.log("💡 Conteúdo Processado é Base64 pura. Foi prefixado com Data URL.");
  //       }
  //     }

  //     // 4. ATUALIZAÇÃO CONDICIONAL DOS ESTADOS

  //     if (type === MODELS.REMOVE_BG) {
  //       setOriginalImageUrlToBgRemov(originalDataUrl);
  //       setBgRemovedImageUrl(processedDataUrl);
  //       console.log(`✅ Resultado de REMOVE_BG carregado para visualização.`);

  //     } else if (type === MODELS.UPSCALER_ESRGAN) {
  //       setOriginalImageUrl(originalDataUrl);
  //       setUpscaledImageUrl(processedDataUrl);
  //       console.log(`✅ Resultado de UPSCALER_ESRGAN carregado para visualização.`);
  //     }

  //   } catch (error) {
  //     console.error("❌ Erro ao carregar imagens salvas do banco de dados:", error);
  //     Swal.fire({
  //       icon: 'error',
  //       title: 'Erro de Carga',
  //       text: 'Não foi possível carregar as imagens salvas do cache local.',
  //     });
  //   }
  // };
  // // Use este useEffect no seu componente, ele será disparado após o salvamento:
  // useEffect(() => {
  //   if (lastSavedImageId) {
  //     // Definimos o lastOperationType para ser usado no handleDownload se necessário
  //     setLastOperationType(lastSavedImageId.type);
  //     loadSavedImageFromDB();
  //   }
  // }, [lastSavedImageId]); // Dependência: só roda quando o ID salvo muda



  // Isso garante que o Pica seja carregado antes de qualquer processamento.


  // Recuperar imagem do localStorage ao carregar a página
  // Recuperar o ID do Replicate e checar status ao dar F5 ou mudar de página


  useEffect(() => {
    const savedId = localStorage.getItem('pending_replicate_id');
    const savedType = localStorage.getItem('pending_replicate_type');


    async function recuperarPrevisaoPendente() {
      if (savedId && savedType) {
        console.log(`🔄 Encontrado ID pendente no localStorage: ${savedId}. Verificando disponibilidade...`);
        setLoading(true);
        setLastOperationType(savedType);

        // Executa o seu próprio método de pooling para buscar o resultado
        const finalUrl = await waitForReplicateResult(savedId);
        console.log("✅ [TESTE] Todos os estados de imagem foram alimentados com:", finalUrl);

        if (finalUrl) {
          // 🚀 CORREÇÃO: Alimenta o estado principal 'result' que a interface precisa para renderizar
          setResult(finalUrl);

          // Alimenta os estados secundários de histórico por compatibilidade
          if (savedType === MODELS.REMOVE_BG) {
            setBgRemovedImageUrl(finalUrl);
          } else if (savedType === MODELS.UPSCALER_ESRGAN) {
            setUpscaledImageUrl(finalUrl);
          } else if (savedType === MODELS.NAFNet) {
            setUpscaledImageUrl(finalUrl);
          }
          console.log("✅ Imagem recuperada com sucesso após recarregamento!");
        } else {
          // Se a imagem sumiu do Replicate (passou de 1 hora) ou deu erro, limpa o cache
          console.log("⚠️ A imagem expirou no servidor do Replicate ou não está mais disponível.");
          localStorage.removeItem('pending_replicate_id');
          localStorage.removeItem('pending_replicate_type');
        }
        setLoading(false);
      }
    }

    // Certifique-se de só rodar se o componente não estiver carregando o Pica (opcional, dependendo do seu fluxo)
    recuperarPrevisaoPendente();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function inicializarPica() {
      try {
        // Inicializa o Pica com as funcionalidades necessárias
        const instance = pica({ features: ['js', 'wasm', 'ww'] });

        if (isMounted) {
          setPicaInstance(instance);
          setCarregando(false);
          console.log('%c✅ Pica.js inicializado com sucesso', 'color:#10B981; font-weight:bold;');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar Pica.js:', error);
        if (isMounted) {
          setErroPica('Erro ao carregar módulo de redimensionamento');
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

      // Limpa todos os resultados ao carregar uma nova imagem    
      setResult(null);
      setOriginalImageUrlToBgRemov(null);
      setBgRemovedImageUrl(null);
      setUpscaledImageUrl(null);

      // Limpa o localStorage para a nova sessão de tratamento
      localStorage.removeItem('pending_replicate_id');
      localStorage.removeItem('pending_replicate_type');

      console.log(`Tudo começa aqui: handleUpload`, file);
    }
  };

  const waitForReplicateResult = async (predictionId) => {
    let tentativas = 0;
    const maxTentativas = 30; // Aumentei um pouco pois o upscale pode demorar

    while (tentativas < maxTentativas) {
      try {
        // Garanta a barra "/" no início da URL
        const response = await axios.get(`/imagens/replicate-status/${predictionId}`);
        const data = response.data;

        console.log(`🔄 Status atual (${tentativas + 1}):`, data.status);

        if (data.status === 'succeeded') {
          // Trata se o output vier como array ["url"] ou string "url"
          return Array.isArray(data.output) ? data.output[0] : data.output;
        }

        if (data.status === 'failed') {
          return null;
        }
      } catch (err) {
        console.error("Erro no polling:", err);
      }

      tentativas++;
      await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3 seg
    }
    return null;
  };

  /**
 * Redimensiona o ImagemBitmap (imgBitmap) para se ajustar proporcionalmente
 * ao tamanho ideal (larguraIdeal, alturaIdeal), escalonando em múltiplos passos,
 *
 * @param {ImageBitmap} imgBitmap O objeto ImageBitmap (a imagem real).
 * @param {number} larguraIdeal A largura máxima desejada.
 * @param {number} alturaIdeal A altura máxima desejada.
 * @returns {Promise<{base64: string, blob: Blob, width: number, height: number}>} Objeto com os dados da imagem final.
 */
  async function ajustarImagemPica(imgBitmap, larguraIdeal, alturaIdeal) {
    const MAX_STEP = 2; // Fator máximo de escala por passo

    // Inicializa o canvas de origem com a imagem original
    let currentCanvas = document.createElement('canvas');
    currentCanvas.width = imgBitmap.width;
    currentCanvas.height = imgBitmap.height;
    currentCanvas.getContext('2d').drawImage(imgBitmap, 0, 0);

    // 1. Determina a proporção e o lado maior alvo
    const ratio = imgBitmap.height / imgBitmap.width;
    let isHeightGreater = imgBitmap.height > imgBitmap.width;
    let currentMaxSide = isHeightGreater ? imgBitmap.height : imgBitmap.width;
    const finalMaxSide = Math.max(larguraIdeal, alturaIdeal);

    // Cria a instância do Pica (usando a instância do estado)
    const p = picaInstance || pica();

    // Loop de redimensionamento progressivo (em múltiplos passos)
    while (currentMaxSide < finalMaxSide) {
      // 2. Calcula a escala para este passo, limitada a MAX_STEP (2x)
      let scale = Math.min(MAX_STEP, finalMaxSide / currentMaxSide);

      // Calcula o próximo lado maior que não ultrapasse o alvo final
      let nextMaxSide = Math.min(Math.round(currentMaxSide * scale), finalMaxSide);

      // Se não houver mudança, saímos do loop para evitar um ciclo infinito
      if (nextMaxSide <= currentMaxSide) {
        break;
      }

      // 3. Calcula as novas dimensões de Largura e Altura, respeitando o ratio
      let nextW, nextH;

      if (isHeightGreater) {
        nextH = nextMaxSide;
        nextW = Math.round(nextH / ratio);
      } else {
        nextW = nextMaxSide;
        nextH = Math.round(nextW * ratio);
      }

      // 4. Atualiza o lado maior atual para o próximo passo
      currentMaxSide = nextMaxSide;

      // 5. Configura as opções de redimensionamento e filtros de nitidez
      let resizeOptions = {
        quality: 3,
        alpha: true,
      };

      // Cria o canvas de destino para este passo
      const dst = document.createElement('canvas');
      dst.width = nextW; dst.height = nextH;

      // ⚡ Adiciona esse "respiro" para evitar travar a UI
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 6. Redimensiona usando o Pica
      await p.resize(currentCanvas, dst, resizeOptions);

      // O canvas de destino se torna o canvas de origem para o próximo passo
      currentCanvas = dst;
    }

    // Obtém o canvas final que está em 'currentCanvas'
    const resultadoCanvas = currentCanvas;
    const newWidth = resultadoCanvas.width;
    const newHeight = resultadoCanvas.height;

    // 7. Converte o Canvas para Blob (JPEG com qualidade 1.0)
    const blob = await new Promise(res => resultadoCanvas.toBlob(res, 'image/jpeg', 1.0));

    // 8. Converte o Blob para Base64
    const base64 = await imageCompression.getDataUrlFromFile(blob);

    // 9. Retorna o objeto de destino completo
    return { base64, blob, width: newWidth, height: newHeight };
  }


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

        const base64Image = await downsizeParaReplicate(image);
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
        // O NAFNet espera apenas o Base64 da imagem (sem downsize complexo)
        const base64Image = await imageCompression.getDataUrlFromFile(image);

        dataToSend.image = base64Image;

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

        // Guardar no localStorage
        try {
          localStorage.setItem('last_replicate_result', finalBase64);
          localStorage.setItem('last_replicate_type', type);
        } catch (e) {
          console.warn("localStorage cheio! A imagem é muito grande para o cache do navegador.");
        }

        try {
          // 'remover-fundo' é um bom nome para o 'file_name' no contexto do seu backend
          await axios.post(route('user.downloads.store'), {
            file_name: 'remover-fundo', // Nome da ação/download que você quer contar
          });
          console.log("✅ Uso do remover-fundo contabilizado com sucesso!");
        } catch (error) {
          // Se der erro na contagem, apenas logamos e não impedimos o usuário de ver a imagem
          console.error("⚠️ Erro ao contabilizar uso do remover-fundo:", error);
        }

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

          // Chama a função ajustada para aumentar o restante
          const resultadoPica = await ajustarImagemPica(imgBitmap, targetW, targetH);

          // Atualiza os resultados finais
          finalBase64 = resultadoPica.base64;
          finalWidth = resultadoPica.width;
          finalHeight = resultadoPica.height;

          console.log(`✅ Pica Concluído.Tamanho Final: ${finalWidth}x${finalHeight} `);

        } else {
          console.log("✅ Aumento da IA já suficiente ou Pica não disponível — Sem correção Pica.");
        }

        // 3. Salva o resultado FINAL (AI + Pica)
        setResult(finalBase64);

        // 💡 LÓGICA PARA CONTABILIZAR O USO DO UPSCALER 💡
        try {
          // 'upscaler' é um bom nome para o 'file_name' no contexto do seu backend
          await axios.post(route('user.downloads.store'), {
            file_name: 'upscaler_esrgan_usage', // Nome da ação/download que você quer contar
          });
          console.log("✅ Uso do Upscaler contabilizado com sucesso!");
        } catch (error) {
          // Se der erro na contagem, apenas logamos e não impedimos o usuário de ver a imagem
          console.error("⚠️ Erro ao contabilizar uso do Upscaler:", error);
        }

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

        // Contabiliza o uso
        const downloadFileName = 'codeformer';

        try {
          await axios.post(route('user.downloads.store'), { file_name: downloadFileName });
          console.log(`✅ Uso do ${downloadFileName} contabilizado com sucesso!`);
        } catch (error) {
          console.error(`⚠️ Erro ao contabilizar uso do ${downloadFileName}:`, error);
        }

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




  /**
   * Função para iniciar o download da imagem salva, logando o uso.
   *
   * @param {string} type - O tipo de operação (ex: MODELS.REMOVE_BG).
   * @param {string} resultUrl - A URL específica da imagem a ser baixada (upscaledImageUrl ou bgRemovedImageUrl).
   */
  const handleDownload = async (type, resultUrl) => {
    // ⚠️ Verifica se a URL específica foi fornecida
    if (!resultUrl) {
      console.warn(`URL de download não fornecida para o tipo: ${type} `);
      return;
    }

    const urlToDownload = resultUrl;
    let defaultExt = 'webp'; // Padrão

    // 1. Determina a extensão padrão com base no tipo
    if (type === MODELS.REMOVE_BG) {
      // Se for remoção de fundo, o PNG é preferível para manter a transparência.
      defaultExt = 'png';
    }
    // Você pode adicionar a lógica para MODELS.IMAGE_TO_ANIME aqui, se necessário.

    // 2. CHAMA A FUNÇÃO REUTILIZÁVEL DE DOWNLOAD
    //  downloadImageFromSource(urlToDownload, 'resultado_final_corrigido', defaultExt);
    await downloadImageFromReplicate(urlToDownload, 'resultado_final_corrigido', defaultExt);

    // 3. Lógica de Contagem de Uso (API Call)
    try {
      let fileName = (type === MODELS.REMOVE_BG)
        ? 'recraft-remove-background'
        : 'recraft-crisp-upscale';

      // Assumindo que downloadCount() é uma função de chamada de API
      await downloadCount(fileName);
      console.log(`Download logado para: ${fileName} `);

    } catch (err) {
      console.error('Erro ao logar download:', err);
    }
  };


  /**
   * Ajusta o tamanho da imagem de entrada para garantir que ela não exceda o limite de pixels
   * da GPU do Replicate (aprox. 2.1MP), mantendo a proporção original.  
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

      console.warn(`⚠️ Imagem original será reduzida.Novo max size: ${targetMaxWidthOrHeight} px`);
    } else {
      console.log(`✅ Imagem original está no limite.Não será redimensionada.`);
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

    console.log(`-- - AJUSTE CONCLUÍDO-- - `);
    console.log(`Tamanho final do Base64: ${(finalBase64.length / (1024 * 1024)).toFixed(2)} MB`);

    return finalBase64;
  }

  // return (
  //   <AuthenticatedLayout>
  //     <Head title="Tratamento de Imagens" />
  //     <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">

  //       <h2 className="text-4xl font-extrabold text-gray-800 mb-6 border-b pb-2 text-center">
  //         🪄 Tratamento de Imagens com IA.
  //       </h2>

  //       {/* Upload e Configurações */}
  //       <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-5">
  //         <label className="block text-lg font-bold text-gray-700">
  //           1. Carregar Imagem e Configurar
  //         </label>
  //         <input
  //           type="file"
  //           accept="image/*"
  //           onChange={handleUpload}
  //           className="block w-full text-sm text-gray-500
  //                      file:mr-4 file:py-2 file:px-4
  //                      file:rounded-full file:border-0
  //                      file:text-sm file:font-semibold
  //                      file:bg-indigo-50 file:text-indigo-700
  //                      hover:file:bg-indigo-100"
  //         />
  //         <div className="pt-4 border-t border-gray-100">
  //           <label htmlFor="scale-factor" className="block text-sm font-medium text-gray-700 mb-2">
  //             Fator de Escala (para Aumentar Qualidade)
  //           </label>

  //           {/* Campo de Entrada Numérico (Oculto em Telas Pequenas) */}
  //           <input
  //             id="scale-factor"
  //             type="number"
  //             min="4"
  //             max="10"
  //             step="1"
  //             value={scaleFactor}
  //             onChange={(e) => setScaleFactor(Math.min(10, Math.max(1, parseFloat(e.target.value) || 1)))}
  //             // Em telas pequenas, ocupa a largura total, mas é oculto.
  //             // Em telas grandes (sm:), ocupa 1/4 da largura e é visível.
  //             className="w-full sm:w-1/4 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 **hidden sm:inline-block**"
  //           />

  //           {/* Barra Deslizante (Slider) (Visível Apenas em Telas Pequenas) */}
  //           <input
  //             id="scale-factor-slider"
  //             type="range"
  //             min="4"
  //             max="10"
  //             step="1"
  //             value={scaleFactor}
  //             onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
  //             // Ocupa a largura total.
  //             // **A classe `sm: hidden` garante que a barra deslizante seja ocultada em telas grandes.**
  //             className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none **sm:hidden**"
  //           />

  //           {/* Exibe o valor atual para a barra deslizante em telas pequenas */}
  //           <div className="text-sm font-semibold text-gray-900 mt-2 **sm:hidden**">
  //             Valor Atual: {scaleFactor}x
  //           </div>

  //           <p className="text-xs text-gray-500 mt-1">
  //             Defina o multiplicador de resolução. O nosso modelo suporta até 9000px.
  //           </p>
  //         </div>


  //       </div>

  //       {/* Botões de Ação */}
  //       <div className="flex flex-col sm:flex-row gap-4 mt-6">
  //         <button
  //           onClick={() => processImage(MODELS.REMOVE_BG)}
  //           className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md btn-base bg-purple-600 text-white hover:bg-purple-700 flex-1"
  //           disabled={loading || !image}
  //         >
  //           {loading && MODELS.REMOVE_BG === 'remover-fundo' ? 'Removendo Fundo...' : '🗑️ Remover Fundo'}
  //         </button>

  //         <button
  //           onClick={() => processImage(MODELS.UPSCALER_ESRGAN)}
  //           className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md bg-emerald-600 text-white hover:bg-emerald-700 flex-1"
  //           disabled={loading || !image}
  //         >
  //           {loading && MODELS.UPSCALER_ESRGAN === 'aumentar-qualidade' ? 'Aumentando Tamanho...' : '⏫ Aumentar Tamanho'}
  //         </button>

  //         <button
  //           onClick={() => processImage(MODELS.NAFNet)}
  //           className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md bg-blue-600 text-white hover:bg-blue-700 flex-1"
  //           disabled={loading || !image}
  //         >
  //           {loading && MODELS.NAFNet === 'remoção-de-ruído-desfoque' ? 'Aumentando Qualidade...' : '💎 Aumentar Qualidade'}
  //         </button>

  //       </div>

  //       {loading && <p className="mt-4 text-center text-indigo-600 font-medium">⏳ Processando imagem... Esta etapa pode levar alguns segundos.</p>}
  //       {erroPica && <p className="mt-4 text-center text-red-600 font-medium">❌ {erroPica}</p>}

  //       {/* Preview das Imagens - Layout de 3 Colunas */}
  //       {imagePreview && (
  //         <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
  //           <h3 className="text-xl font-bold mb-4 text-gray-800">Comparação de Resultados</h3>
  //           <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>

  //             {/* 1. Original */}
  //             <div className="text-center bg-gray-100 p-4 rounded-lg shadow-inner flex flex-col items-center">
  //               <p className="font-semibold mb-3 text-gray-700">1. Original</p>
  //               <img
  //                 src={imagePreview}
  //                 alt="Original"
  //                 className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto"
  //                 style={{ maxHeight: '600px', objectFit: 'contain' }}
  //               />
  //             </div>

  //             {/* 3. Resultado Final Corrigido */}
  //             {result ? (
  //               <div className="relative text-center bg-green-50 p-4 rounded-lg shadow-xl border-4 border-green-500 flex flex-col items-center">
  //                 <p className="font-semibold mb-3 text-green-700">3. Resultado Final Corrigido ({scaleFactor}x)</p>

  //                 {/* Botão de Download Adicionado - Apenas no resultado final */}
  //                 <button
  //                   onClick={() => handleDownload(lastOperationType, result)}
  //                   className="absolute top-3 right-3 p-2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full transition duration-200 shadow-lg z-10"
  //                   title="Baixar Imagem Processada"
  //                 >
  //                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  //                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
  //                   </svg>

  //                 </button>

  //                 <img
  //                   src={result}
  //                   alt="Final Corrigido"
  //                   className="w-full h-auto rounded-lg shadow-xl border border-green-400 mx-auto"
  //                   style={{ maxHeight: '600px', objectFit: 'contain' }}
  //                   onError={(e) => console.error("🚨 Erro ao carregar imagem final:", e)}
  //                 />
  //               </div>
  //             ) : (
  //               <div className="text-center p-4 rounded-lg shadow-inner bg-gray-100 flex items-center justify-center min-h-[250px]">
  //                 <p className="text-gray-500">Aguardando correção . . .</p>
  //               </div>
  //             )}

  //           </div>
  //         </div>
  //       )}

  //       {/* Preview das Imagens Salvas do RmBg */}
  //       {originalImageUrlToBgRemov && (
  //         <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
  //           <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">Resultados Anteriores da Remoção de Fundo</h3>
  //           <div className={`grid grid-cols - 1 md:grid-cols-2 gap-6`}>

  //             {/* 3. Original */}
  //             <div className="text-center bg-gray-100 p-4 rounded-lg shadow-inner flex flex-col items-center">
  //               <p className="font-semibold mb-3 text-gray-700">3. Original</p>
  //               <img
  //                 src={originalImageUrlToBgRemov}
  //                 alt="Original"
  //                 className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto"
  //                 style={{ maxHeight: '600px', objectFit: 'contain' }}
  //               />
  //             </div>

  //             {/* 4. Resultado Final Corrigido */}
  //             {bgRemovedImageUrl && (
  //               <div className="relative text-center bg-yellow-50 p-4 rounded-lg shadow-xl border-4 border-yellow-500 flex flex-col items-center">
  //                 <p className="font-semibold mb-3 text-yellow-700">4. Resultado Final</p>

  //                 {/* Botão de Download Adicionado - Apenas no resultado final */}
  //                 <button
  //                   onClick={() => handleDownload(MODELS.REMOVE_BG, bgRemovedImageUrl)}
  //                   className="absolute top-3 right-3 p-2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full transition duration-200 shadow-lg z-10"
  //                   title="Baixar Imagem Processada"
  //                 >
  //                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  //                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
  //                   </svg>
  //                 </button>

  //                 <img
  //                   src={bgRemovedImageUrl}
  //                   alt="Final Corrigido"
  //                   className="w-full h-auto rounded-lg shadow-xl border border-green-400 mx-auto"
  //                   style={{ maxHeight: '600px', objectFit: 'contain' }}
  //                   onError={(e) => console.error("🚨 Erro ao carregar imagem final:", e)}
  //                 />
  //               </div>
  //             )}

  //           </div>
  //         </div>
  //       )}


  //       {/* Preview das Imagens Salvas de Upscale */}
  //       {originalImageUrl && (
  //         <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
  //           <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">Resultados Anteriores de Upscale</h3>
  //           <div className={`grid grid-cols - 1 md: grid-cols - 2 gap - 6`}>

  //             {/* 3. Original */}
  //             <div className="text-center bg-gray-100 p-4 rounded-lg shadow-inner flex flex-col items-center">
  //               <p className="font-semibold mb-3 text-gray-700">3. Original</p>
  //               <img
  //                 src={originalImageUrl}
  //                 alt="Original"
  //                 className="w-full h-auto rounded-lg shadow-md border border-gray-300 mx-auto"
  //                 style={{ maxHeight: '600px', objectFit: 'contain' }}
  //               />
  //             </div>

  //             {/* 4. Resultado Final Corrigido (AI + Pica) */}
  //             {upscaledImageUrl && (
  //               <div className="relative text-center bg-yellow-50 p-4 rounded-lg shadow-xl border-4 border-yellow-500 flex flex-col items-center">
  //                 <p className="font-semibold mb-3 text-yellow-700">4. Resultado Final</p>

  //                 {/* Botão de Download Adicionado - Apenas no resultado final */}
  //                 <button
  //                   onClick={() => handleDownload(MODELS.UPSCALE, upscaledImageUrl)}
  //                   className="absolute top-3 right-3 p-2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full transition duration-200 shadow-lg z-10"
  //                   title="Baixar Imagem Processada"
  //                 >
  //                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  //                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
  //                   </svg>
  //                 </button>

  //                 <img
  //                   src={upscaledImageUrl}
  //                   alt="Final Corrigido"
  //                   className="w-full h-auto rounded-lg shadow-xl border border-green-400 mx-auto"
  //                   style={{ maxHeight: '600px', objectFit: 'contain' }}
  //                   onError={(e) => console.error("🚨 Erro ao carregar imagem final:", e)}
  //                 />
  //               </div>
  //             )}

  //           </div>
  //         </div>
  //       )}


  //     </div>
  //     <Footer ano={2025} />
  //   </AuthenticatedLayout>
  // );


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
                  onClick={() => handleDownload(lastOperationType, result)}
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
                    onClick={() => handleDownload(MODELS.REMOVE_BG, bgRemovedImageUrl)}
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