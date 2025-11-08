import { useCallback, useEffect, useRef, useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'

import * as pdfjsLib from 'pdfjs-dist'
import Footer from '@/Components/Footer'
import FullScreenSpinner from '@/Components/FullScreenSpinner'
pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'
import imageCompression from 'browser-image-compression';
import { resolucoesDeReferencia } from './Poster/Partials/resolucoesDeReferencia';
import axios from 'axios';
import pica from 'pica';
import Spinner from '@/Components/Spinner'
import { calcularRedimensionamentoProporcional } from './Poster/Partials/imagemUtils'
import { useInitialScreenInfo } from './hooks/useInitialScreenInfo';

export default function PdfEditor() {
  const { props } = usePage()
  const user = props.auth.user

  const [pdfUrl, setPdfUrl] = useState(null)
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState(null);
  const [imagemBase64, setImagemBase64] = useState(null)
  const [imagemBase64Original, setImagemBase64Original] = useState(null);

  const [ampliacao, setAmpliacao] = useState({ colunas: 2, linhas: 2 })
  const [orientacao, setOrientacao] = useState('retrato')
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false)
  const [updateImg, setUpdateImg] = useState(false)
  const [erroPdf, setErroPdf] = useState(null)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [aspecto, setAspecto] = useState(true)
  const pdfContainerRef = useRef(null)
  const [carregando, setCarregando] = useState(false)
  const [resumoTamanho, setResumoTamanho] = useState("")
  const [picaInstance, setPicaInstance] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [arquivoOriginal, setArquivoOriginal] = useState(null);
  const inputFileRef = useRef(null);

  // 1. Chame o Hook passando o estado de orientação
  const { isMobile, orientacaoLeitura } = useInitialScreenInfo(orientacao);

  // Função para converter o arquivo File para Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };



  const resetarConfiguracoes = () => {
    setPdfUrl(null)
    setPdfDownloadUrl(null)
    setImagemBase64(null)
    setImagemBase64Original(null);
    setAmpliacao({ colunas: 2, linhas: 2 })
    // setPartesRecortadas([])
    setOrientacao('retrato')
    setAlteracoesPendentes(false)
    setErroPdf(null)
    setPaginaAtual(1)
    setTotalPaginas(0)
    setZoom(1)
    setAspecto(true)
    if (inputFileRef.current) {
      inputFileRef.current.value = '';
    }
    setArquivoOriginal(null)

  }


  const enviarParaCorteBackend = async () => {
    try {
      const inicio = performance.now() // ⏱️ marca o início

      const response = await axios.post('/cortar-imagem', {
        imagem: imagemBase64,
        colunas: ampliacao.colunas,
        linhas: ampliacao.linhas,
        orientacao,
        aspecto,
      })

      const fim = performance.now() // ⏱️ marca o fim
      const tempoTotal = ((fim - inicio) / 1000).toFixed(2)

      console.log(`⏱️ Tempo total de resposta do backend: ${tempoTotal} segundos`)
      // console.log('Resposta do backend:', response.data.tamanhos_debug)

      const { partes } = response.data
      return partes
    } catch (error) {
      console.error('Erro ao cortar imagem no backend:', error)
      alert('Erro ao processar a imagem no servidor.')
      return null
    }
  }


  const enviarParaCorteFrontend = async () => {
    try {
      const inicio = performance.now();

      const partes = await cortarImagemFrontend(
        imagemBase64,
        ampliacao.colunas,
        ampliacao.linhas,
        orientacao,
        aspecto,
      );

      const fim = performance.now();
      console.log(`⏱️ Corte local feito em ${((fim - inicio) / 1000).toFixed(2)} segundos`);

      // console.log(`🔢 Partes geradas: ${partes.partes.length}`);

      return partes;
    } catch (error) {
      console.error('Erro ao cortar imagem localmente:', error);
      alert('Erro ao processar a imagem.');
      return null;
    }
  };

  const cortarImagemFrontend = async (imagemBase64, colunas, linhas, orientacao, aspecto) => {
    const img = new Image();
    img.src = imagemBase64;
    await img.decode();

    const partes = calcularRedimensionamentoProporcional(
      img,
      img.width,    // largura real da imagem
      img.height,   // altura real da imagem
      colunas,      // número de colunas
      linhas,       // número de linhas
      orientacao,   // 'retrato' ou 'paisagem'
      aspecto       // true ou false
    );

    console.log('🔢 Partes geradas:', partes.partes.length);

    return partes;

  };


  /**
   * Redimensiona usando browser-image-compression (modo mais natural)
  */
  async function ajustarImagemBIC(file, larguraIdeal, alturaIdeal) {

    const options = {
      maxWidthOrHeight: Math.max(larguraIdeal, alturaIdeal),
      useWebWorker: true,
      maxSizeMB: 30,
      initialQuality: 1.0,
      fileType: 'image/jpeg',
      alwaysKeepResolution: true,
    };

    console.log('--- DETALHES DO REDIMENSIONAMENTO (BIC) ---');
    console.log(`Ideal: ${larguraIdeal}px x ${alturaIdeal}px`);
    console.log('Opções:', options);

    const compressedBlob = await imageCompression(file, options);

    const finalBase64 = await imageCompression.getDataUrlFromFile(compressedBlob);

    // Cria uma URL temporária e carrega como imagem
    const tempURL = URL.createObjectURL(compressedBlob);

    const img = new Image();

    img.crossOrigin = "Anonymous";

    await new Promise((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(tempURL);
        resolve();
      };
      img.src = tempURL;
    });

    img.width = img.naturalWidth;
    img.height = img.naturalHeight;

    return { blob: compressedBlob, width: img.width, height: img.height, url: tempURL, base64: finalBase64 };
  }


  // Função para converter Base64 de volta para um Blob (Auxiliar para log)
  const base64ToBlob = (dataurl) => {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };


  /**
   * Função utilitária para converter um número decimal em uma fração simples (string).
   * Utiliza um algoritmo de frações contínuas com limite de denominador para manter a simplicidade.
   * @param {number} decimal O número decimal (proporção).
   * @returns {string} A fração formatada (ex: '3/2').
   */
  function toFraction(decimal) {
    if (decimal === 0) return '0/1';

    // Define a precisão da busca
    const tolerance = 1.0E-6;

    // Verifica se é inteiro
    if (Math.floor(decimal) === decimal) {
      return decimal.toString() + '/1';
    }

    let h1 = 1, h2 = 0;
    let k1 = 0, k2 = 1;
    let b = decimal;

    // Algorítmo de Frações Contínuas
    do {
      let a = Math.floor(b);
      let aux = h1;
      h1 = a * h1 + h2;
      h2 = aux;
      aux = k1;
      k1 = a * k1 + k2;
      k2 = aux;

      // Evita divisão por zero se b-a for muito pequeno
      if (b - a === 0) break;

      b = 1 / (b - a);
    } while (Math.abs(decimal - h1 / k1) > decimal * tolerance && k1 < 100); // Limita o denominador a 100

    return `${h1}/${k1}`;
  }


  /**
 * Redimensiona o ImagemBitmap (imgBitmap) para se ajustar proporcionalmente
 * ao tamanho ideal (larguraIdeal, alturaIdeal), escalonando em múltiplos passos,
 * onde cada passo aumenta o tamanho em, no máximo, 4x.
 *
 * @param {ImageBitmap} imgBitmap O objeto ImageBitmap (a imagem real).
 * @param {number} larguraIdeal A largura máxima desejada.
 * @param {number} alturaIdeal A altura máxima desejada.
 * @returns {Promise<{base64: string, blob: Blob, width: number, height: number}>} Objeto com os dados da imagem final.
 */

  async function ajustarImagemPica(imgBitmap, larguraIdeal, alturaIdeal) {
    const MAX_STEP = 3; // Fator máximo de escala por passo

    setUpdateImg(true);

    // Inicializa o canvas de origem com a imagem original (o ponto de partida)
    let currentCanvas = document.createElement('canvas');
    currentCanvas.width = imgBitmap.width;
    currentCanvas.height = imgBitmap.height;
    currentCanvas.getContext('2d').drawImage(imgBitmap, 0, 0);

    // --- LOGS INICIAIS ---
    // console.log('--- DETALHES DO REDIMENSIONAMENTO PICA (MULTI-PASSO) ---');
    // console.log(`Original: ${imgBitmap.width}px x ${imgBitmap.height}px`);
    // console.log(`Ideal (Alvo): ${larguraIdeal}px x ${alturaIdeal}px`);
    // ----------------------

    // 1. Determina a proporção e o lado maior alvo
    const ratio = imgBitmap.height / imgBitmap.width;
    let isHeightGreater = imgBitmap.height > imgBitmap.width;
    let currentMaxSide = isHeightGreater ? imgBitmap.height : imgBitmap.width;
    const finalMaxSide = Math.max(larguraIdeal, alturaIdeal);

    // Cria a instância do Pica (assumindo que está disponível no escopo)
    const p = pica();

    // Loop de redimensionamento progressivo (em múltiplos passos)
    while (currentMaxSide < finalMaxSide) {
      // 2. Calcula a escala para este passo, limitada a MAX_STEP (4x)
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
        alpha: true
      };

      // Se for o ÚLTIMO passo (quando for atingir a largura/altura ideal)
      if (nextMaxSide === finalMaxSide) {
        resizeOptions.unsharpAmount = 160;
        resizeOptions.unsharpRadius = 0.6;
        resizeOptions.unsharpThreshold = 2;
      }

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

    // --- LOG FINAL ---
    // console.log(`✅ Redimensionamento e Processamento Concluídos. Tamanho Final: ${newWidth}px x ${newHeight}px`);
    // -----------------

    // 7. Converte o Canvas para Blob (JPEG com qualidade 1.0)
    const blob = await new Promise(res => resultadoCanvas.toBlob(res, 'image/jpeg', 1.0));

    // 8. Converte o Blob para Base64 (requer a biblioteca 'imageCompression' ou similar)
    // ATENÇÃO: Estou assumindo que 'imageCompression' está disponível no escopo.
    const base64 = await imageCompression.getDataUrlFromFile(blob);

    setUpdateImg(false);

    // 9. Retorna o objeto de destino completo
    return { base64, blob, width: newWidth, height: newHeight };
  }

  const tratamentoDimensoesBase64 = (base64, colunas, margem = 0.10) => {

    return new Promise((resolve) => {
      const img = new Image();

      img.crossOrigin = "Anonymous";

      img.onload = async () => { // ⬅️ Tornar `onload` assíncrono para usar `await`

        // ============================================================
        // 1️⃣ ETAPA 1 — PRÉ-PROCESSAMENTO: Leitura e dados originais
        // ============================================================
        const originalBlob = base64ToBlob(base64);
        const originalSizeKB = (originalBlob.size / 1024).toFixed(2);

        console.log(`\n%c==================================`, 'color: #3182CE;');
        console.groupCollapsed(`%c📊 ETAPA 1 — ANÁLISE DE COMPRESSÃO/UPSCALE - INÍCIO`, 'color: #3182CE; font-weight: bold;');
        console.log(`%c📏 Dimensão Original: ${img.width} × ${img.height} pixels`, 'color: #3182CE;');
        console.log(`%c💾 Tamanho Original: ${originalSizeKB} KB`, 'color: #3182CE;');
        console.groupEnd(``);

        // ============================================================
        // 2️⃣ ETAPA 2 — OBTENDO DADOS DE REFERÊNCIA (NOVOS TAMANHOS)
        // ============================================================
        console.log(`%c==================================`, 'color: #10B981;');
        console.groupCollapsed(`%c📊 ETAPA 2 — OBTENÇÃO DOS DADOS REAIS `, 'color: #10B981; font-weight: bold;');
        const { larguraReferencia, alturaReferencia, nomeReferencia } = getTargetDimensions(img.width, img.height, colunas);
        console.groupEnd(``);

        // ============================================================
        // 3️⃣ ETAPA 3 — CÁLCULO DOS DESVIOS E DEFINIÇÃO DE AÇÃO
        // ============================================================
        console.log(`\n%c==================================`, 'color: #A855F7;');
        console.groupCollapsed(`%c📊 ETAPA 3 — CÁLCULO DOS DESVIOS E DEFINIÇÃO DE AÇÃO`, 'color: #A855F7; font-weight: bold;');

        const margemAbsoluta = Math.abs(Number(margem));

        const ladoMaiorImg = Math.max(img.width, img.height);
        const ladoMaiorRef = Math.max(larguraReferencia, alturaReferencia);

        const desvio = (ladoMaiorImg - ladoMaiorRef) / ladoMaiorRef;
        let acao = "manter";

        // 🔍 Determina o que fazer baseado apenas no maior lado
        if (Math.abs(desvio) > margemAbsoluta) {
          if (desvio > 0) {
            acao = "diminuir"; // está maior que a referência
          } else {
            acao = "aumentar"; // está menor que a referência
          }
        }

        // 🧾 Logs detalhados
        const ladoUsado = img.width > img.height ? "largura" : "altura";
        console.log(`%c📌 Referência (${nomeReferencia}): ${larguraReferencia} × ${alturaReferencia}`, 'color:#A855F7;');
        console.log(`%c📐 Lado usado para cálculo: ${ladoUsado.toUpperCase()} (${ladoMaiorImg}px vs ${ladoMaiorRef}px)`, 'color:#A855F7;');
        console.log(`%c📉 Desvio relativo: ${(desvio * 100).toFixed(2)}%`, 'color:#A855F7;');
        console.log(`%c⚙️ Margem: ${(margemAbsoluta * 100).toFixed(0)}%`, 'color:#A855F7;');

        let corAcao = "#A855F7";
        if (acao === "diminuir") corAcao = "#A855F7"; //#F97316"; // laranja
        if (acao === "aumentar") corAcao = "#10B981"; // verde

        console.log(`%c🧠 Resultado Final: Deve ${acao.toUpperCase()}`, `color:${corAcao}; font-weight:bold;`);
        console.groupEnd(``);
        console.log(`%c==================================`, 'color:#F77C2D;');

        // ============================================================
        // 4️⃣ ETAPA 4 — EXECUÇÃO DE AÇÃO DEFINIDA
        // ============================================================
        console.log('%c🔽 ETAPA 4 — EXECUÇÃO DE AÇÃO DEFINIDA', 'color:#E53E3E; font-weight:bold;');

        // 🔽 4.1 DIMINUIR
        if (acao === "diminuir") {
          console.groupCollapsed('%c🔽 ETAPA 4.1 — AÇÃO DIMINUIR DETECTADA: Chamando ajustarImagemBIC...', 'color:#E53E3E; font-weight:bold;');

          const fileOriginal = base64ToBlob(base64, 'image/jpeg');
          const resultadoBIC = await ajustarImagemBIC(fileOriginal, larguraReferencia, alturaReferencia);

          // 🔍 Pós-processamento
          const base64String = resultadoBIC.base64;
          const base64Length = base64String.length - (base64String.indexOf(',') + 1); // remove o cabeçalho data:image/jpeg;base64,
          const padding = base64String.endsWith('==') ? 2 : (base64String.endsWith('=') ? 1 : 0);
          const finalSizeBytes = (base64Length * 3 / 4) - padding;
          const finalSizeKB = (finalSizeBytes / 1024).toFixed(2);

          // --- 📉 Cálculo de redução em relação ao original ---
          const reducaoPercentual = (((originalBlob.size - finalSizeBytes) / originalBlob.size) * 100).toFixed(1);

          // --- 🧾 Logs detalhados ---
          console.log(`%c💾 Tamanho Final (Lib): ${finalSizeKB} KB`, 'color: #38A169; font-weight: bold;');
          console.log(`%c📉 REDUÇÃO TOTAL (Bytes): ${reducaoPercentual}%`, 'color: #E53E3E; font-weight: bold;');
          console.log(`%c==================================\n`, 'color: #A855F7;');
          console.groupEnd('')


          resolve(resultadoBIC.base64);
          return;
        }

        // 🔼 4.2 AUMENTAR
        else if (acao === "aumentar") {
          console.groupCollapsed('%c🚀 ETAPA 4.2 — INICIANDO PROCESSO DE AUMENTO COM PICA.JS', 'color:#9F7AEA; font-weight:bold; font-size:14px;');

          // if (!picaInstance) {
          //   const errorMessage = "O Pica.js ainda não foi carregado. (Verifique se /js/pica.min.js está acessível)";
          //   console.error('%c❌ ERRO CRÍTICO:', 'color:#E53E3E; font-weight:bold;', errorMessage);
          //   setCarregando(false);
          //   setErroPdf(errorMessage);
          //   return;
          // }

          // 🟣 ETAPA 4.2.1 — Orientação
          console.log('%c🔄 ETAPA 4.2.1 — Obtendo Blob Orientado...', 'color:#F6AD55; font-weight:bold;');
          const blobOrientado = originalBlob;

          // 🟣 ETAPA 4.2.2 — Dimensões Originais
          const originalWidth = img.width;
          const originalHeight = img.height;
          const originalSizeMB = (blobOrientado.size / 1024 / 1024).toFixed(2);

          // console.log(`%c📸 Dimensões Originais: ${originalWidth}×${originalHeight}px`, 'color:#A0AEC0; font-weight:bold;');
          // console.log(`💾 Tamanho Original: ${originalSizeMB} MB`);

          // 🟣 ETAPA 4.2.3 — Cálculo de Dimensões de Referência
          console.log('%c📏 ETAPA 4.2.3 — Cálculo de Dimensões Alvo', 'color:#38A169; font-weight:bold;');

          const refData = getTargetDimensions(originalWidth, originalHeight, ampliacao.colunas);
          const maxDimRef = Math.max(refData.larguraReferencia, refData.alturaReferencia);

          // console.table({
          //   'Largura Ref.': refData.larguraReferencia,
          //   'Altura Ref.': refData.alturaReferencia,
          //   'Dimensão Máxima': maxDimRef
          // });

          // 🟣 ETAPA 4.2.4 — Redimensionamento com Pica.js
          console.log('%c⚙️ ETAPA 4.2.4 — Redimensionamento de Alta Qualidade (Pica.js)...', 'color:#4299E1; font-weight:bold;');

          const inicio = performance.now();
          const compressedBlob = await ajustarImagemPica(img, refData.larguraReferencia, refData.alturaReferencia);
          const fim = performance.now();

          // 🟣 ETAPA 4.2.5 — Análise Final
          const finalSizeMB = (compressedBlob.blob.size / 1024 / 1024).toFixed(2);
          const diferencaPercentual = (((compressedBlob.blob.size - blobOrientado.size) / blobOrientado.size) * 100).toFixed(1);
          const status = diferencaPercentual > 0 ? 'AUMENTO' : 'REDUÇÃO';

          console.log('%c📊 ETAPA 4.2.5 — ANÁLISE FINAL', 'color:#805AD5; font-weight:bold; font-size:13px;');
          // console.table({
          //   'Tamanho Final (MB)': finalSizeMB,
          //   'Redução/Aumento (%)': `${status} de ${Math.abs(diferencaPercentual)}%`,
          //   'Duração (ms)': (fim - inicio).toFixed(2)
          // });
          console.groupEnd('%c✅ PROCESSO CONCLUÍDO COM SUCESSO', 'color:#48BB78; font-weight:bold; font-size:14px;');


          console.log('%c🔽 ETAPA 5 — AÇÃO de compactar: Chamando ajustarImagemBIC...', 'color:#E53E3E; font-weight:bold;');

          const inicioBIC = performance.now();
          const resultadoBIC = await ajustarImagemBIC(compressedBlob.blob, larguraReferencia, alturaReferencia);
          const fimBIC = performance.now();
          const duracaoBIC = (fimBIC - inicioBIC).toFixed(1);
          const tamanhoFinalMB = (resultadoBIC.blob.size / (1024 * 1024)).toFixed(2);

          // console.log('%c📈 ETAPA BIC — ANÁLISE FINAL', 'color:#805AD5; font-weight:bold;');
          // console.table({
          //   '📐 Dimensões Finais': `${resultadoBIC.width} × ${resultadoBIC.height}px`,
          //   '💾 Tamanho Final': `${tamanhoFinalMB} MB`,
          //   '⏱️ Duração': `${duracaoBIC} ms`,
          //   '🔗 Blob URL': resultadoBIC.url.slice(0, 60) + '...', // corta pra não poluir
          //   '📦 Base64 (preview)': resultadoBIC.base64.slice(0, 80) + '...',
          // });

          // console.log('%c✅ ETAPA BIC — Concluído com sucesso!', 'color:#48BB78; font-weight:bold; font-size:14px;');

          setImagemBase64(resultadoBIC.base64);
          setAlteracoesPendentes(true);
          setCarregando(false);
          return;
        }

        // 🔸 4.3 MANTER
        else {

          // console.log(`%c📏 ETAPA 4.3 — IMAGEM MANTIDA NO TAMANHO ORIGINAL: ${img.width} × ${img.height}px`, 'color: #38A169; font-weight: bold;');
          // resolve(base64);
          console.log('%c🔽 ETAPA 4.3 — AÇÃO MANTER: Chamando ajustarImagemBIC...', 'color:#E53E3E; font-weight:bold;');

          const fileOriginal = base64ToBlob(base64, 'image/jpeg');
          const resultadoBIC = await ajustarImagemBIC(fileOriginal, larguraReferencia, alturaReferencia);

          // 🔍 Pós-processamento
          const base64String = resultadoBIC.base64;
          const base64Length = base64String.length - (base64String.indexOf(',') + 1); // remove o cabeçalho data:image/jpeg;base64,
          const padding = base64String.endsWith('==') ? 2 : (base64String.endsWith('=') ? 1 : 0);
          const finalSizeBytes = (base64Length * 3 / 4) - padding;
          const finalSizeKB = (finalSizeBytes / 1024).toFixed(2);

          // --- 📉 Cálculo de redução em relação ao original ---
          const reducaoPercentual = (((originalBlob.size - finalSizeBytes) / originalBlob.size) * 100).toFixed(1);

          // --- 🧾 Logs detalhados ---
          // console.log(`%c💾 Tamanho Final (Lib): ${finalSizeKB} KB`, 'color: #38A169; font-weight: bold;');
          // console.log(`%c📉 REDUÇÃO TOTAL (Bytes): ${reducaoPercentual}%`, 'color: #E53E3E; font-weight: bold;');
          // console.log(`%c==================================\n`, 'color: #3182CE;');

          resolve(resultadoBIC.base64);
          return;
        }
      };

      img.src = base64;
    });

  };


  const rasterizarPdfParaBase64 = async (pdfUrl, paginaNum = 1, dpi = 300) => {
    try {
      console.log(`rasterizarPdfParaBase64 chamado com: pdfUrl=${pdfUrl}, paginaNum=${paginaNum}, dpi=${dpi}`);

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(paginaNum);

      // 1. Calcula o scale base com o DPI
      let scale = dpi / 72;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = { canvasContext: context, viewport };
      await page.render(renderContext).promise;

      // 🔹 Converte o canvas em imagem Base64 (JPEG)
      const base64Image = canvas.toDataURL('image/jpeg', 1.0);

      // 🔹 Limpa o canvas da memória
      canvas.width = canvas.height = 0;

      return base64Image;

    } catch (error) {
      console.error("Erro ao rasterizar PDF para Base64:", error);
      throw new Error("Não foi possível converter o PDF em imagem.");
    }
  };

  /**
   * Encontra a referência de pixels para a coluna alvo do pôster.
   * Prioriza a correspondência exata de colunas e usa a aproximação como fallback.
   * @param {number} colunas - Número de colunas do pôster (entrada do usuário).
   * @returns {{widthOriginal: number, heightOriginal: number, larguraReferencia: number, alturaReferencia:number ,nomeReferencia: string}} Dados para o Pica.js.
   */
  const getTargetDimensions = (width, height, colunas) => {
    // 1. Filtra entradas sem pixels
    const resolucoesValidas = resolucoesDeReferencia.filter(r => r.larguraPx);

    // [Omitindo o fallback de segurança do array vazio por brevidade]

    let refAlvo = resolucoesValidas[0]; // Assume o primeiro item como fallback inicial.

    // 2. TENTA ENCONTRAR A CORRESPONDÊNCIA EXATA DA COLUNA (Prioridade)
    const refAlvoExato = resolucoesValidas.find(r => r.colunas === colunas);

    if (refAlvoExato) {
      refAlvo = refAlvoExato;
    } else {
      // 3. SE NÃO ENCONTRAR (APLICA O FALLBACK DA APROXIMAÇÃO)
      refAlvo = resolucoesValidas.reduce((prev, curr) => {
        return (Math.abs(curr.colunas - colunas) < Math.abs(prev.colunas - colunas) ? curr : prev);
      }, refAlvo); // Usa o primeiro item como base se não achou nada.

      console.warn(`⚠️ Coluna ${colunas} não encontrada para correspondência exata. Usando a referência de pixel mais próxima: ${refAlvo.nome} (${refAlvo.colunas} colunas).`);
    }

    const larguraReferencia = refAlvo.larguraPx;
    const alturaReferencia = refAlvo.alturaPx;
    const nomeReferencia = refAlvo.nome;

    console.log(`%c🔗 Dados Finais do getTargetDimensions:`, 'color: #10B981; font-weight: bold;');
    console.log(`%cColunas Alvo: **${colunas}**`, 'color: #10B981; font-weight: bold;');
    console.log(`%cReferência de Pixels: **${nomeReferencia}** (${larguraReferencia}px)/(${alturaReferencia}px)`, 'color: #10B981; font-weight: bold;');
    console.log(`%cFatores Originais: ${width} × ${height}px`, 'color: #10B981; font-weight: bold;');

    // 4. Retorna os valores
    return {
      larguraReferencia: larguraReferencia,
      alturaReferencia: alturaReferencia,
      nomeReferencia: nomeReferencia
    };
  };

  const corrigirOrientacaoPura = (base64) => {
    return new Promise((resolve) => {
      const img = new Image();

      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Redimensionamento para o Canvas, mantendo o tamanho original.
        canvas.width = img.width;
        canvas.height = img.height;

        // Lógica de rotação pura (se necessário, você deve adicionar a sua lógica original de rotação aqui, 
        // que eu não tenho no contexto atual, então vou manter o desenho simples por enquanto)
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Retorna um Blob SEM COMPRESSÃO de qualidade (1.0) para a Lib atuar.
        canvas.toBlob(resolve, "image/jpeg", 1.0);
      };
      img.src = base64;
    });
  };


  const handleFileChange = async (e) => {

    console.clear();
    const file = e.target.files[0];
    if (!file) {
      console.warn("⚠️ Nenhum arquivo recebido em handleFileChange");
      return;
    }
    console.log("📂 handleFileChange iniciado:", file.name, file.type);
    setCarregando(true);
    const fileType = file.type;

    if (fileType === "application/pdf") {
      const pdfBlobUrl = URL.createObjectURL(file);
      setPdfUrl(pdfBlobUrl);

      console.log("📄 PDF detectado, rasterizando...");
      try {
        const base64Image = await rasterizarPdfParaBase64(pdfBlobUrl, 1, 150);
        console.log("✅ PDF rasterizado com sucesso");
        setImagemBase64(base64Image);
        setAlteracoesPendentes(true);
      } catch (error) {
        console.error("❌ Erro na rasterização PDF:", error);
        setErroPdf(error.message);
      } finally {
        setCarregando(false);
      }

      return;
    }

    // 🔹 Para imagens
    const reader = new FileReader();

    reader.onloadstart = () => console.groupCollapsed("⏳ FileReader iniciou leitura...");
    reader.onerror = (err) => console.error("❌ Erro FileReader:", err);
    reader.onload = async (e) => {
      const base64 = e.target.result;
      console.log("📸 FileReader terminou — Base64 gerado:", base64?.slice(0, 50), "...");

      setImagemBase64Original(base64);
      setCarregando(true);
      setErroPdf(null);

      try {
        console.log("🧩 Chamando tratamentoDimensoesBase64...");
        const novoTratamentoImg = await tratamentoDimensoesBase64(base64, ampliacao.colunas);
        console.log("✅ tratamentoDimensoesBase64 finalizado com sucesso!");
        setImagemBase64(novoTratamentoImg);
      } catch (err) {
        console.error("❌ Erro dentro do tratamentoDimensoesBase64:", err);
      } finally {
        setAlteracoesPendentes(true);
        setCarregando(false);
      }
    };

    reader.readAsDataURL(file);
    console.groupEnd("📥 FileReader.readAsDataURL chamado.");
  };


  // Função central que processa o arquivo (chamada no onChange e no onDrop)
  const processarArquivo = useCallback(async (file) => {
    if (file) {
      // 1. Guarda o arquivo File (Original)
      setArquivoOriginal(file);

      // 2. Converte e guarda o Base64 para visualização ou trabalho imediato
      try {
        handleFileChange({ target: { files: [file] } }); // já faz tudo

        console.log('Arquivo processado e Base64 gerado.');
      } catch (error) {
        console.error('Erro ao converter para Base64:', error);
        setImagemBase64(null);
      }
    } else {
      // Caso não haja arquivo (ex: limpeza)
      setArquivoOriginal(null);
      setImagemBase64(null);
    }
    setIsDragging(false); // Garante que o estado de arrasto seja limpo
  }, []);

  // --- Handlers de Eventos ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
    // setAlteracoesPendentes(true)

  };

  const handleDragLeave = () => {
    setIsDragging(false);
    // setAlteracoesPendentes(true)
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files ? e.dataTransfer.files[0] : null;
    if (!file) return;

    // 🔹 Faz o input original receber o arquivo (sincroniza visualmente)
    if (inputFileRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      inputFileRef.current.files = dataTransfer.files;
    }

    // 🔹 Processa normalmente
    processarArquivo(file);
    setAlteracoesPendentes(true);
  };

  const handleAreaClick = () => {
    inputFileRef.current.click();
    setAlteracoesPendentes(true)
  };


  /**
   * Função para baixar a imagem processada (imagemBase64)
   */
  const handleDownloadImagemProcessada = () => {
    // Verifica se há uma imagem no estado para baixar
    if (!imagemBase64) {
      alert("Não há imagem processada para baixar.");
      return;
    }

    // 1. Cria um elemento de link <a> na memória
    const link = document.createElement('a');

    // 2. Define o href do link como a string base64 (Data URL)
    link.href = imagemBase64;

    // 3. Define o nome do arquivo que será baixado
    link.download = 'imagem-processada-aumentada.jpg';

    // 4. Adiciona o link ao corpo do documento (necessário para o Firefox)
    document.body.appendChild(link);

    // 5. Simula um clique no link
    link.click();

    // 6. Remove o link do corpo do documento
    document.body.removeChild(link);
  };


  // 2. Use apenas este useEffect para instanciar Pica na montagem
  useEffect(() => {
    // Flag de montagem (boa prática do React para evitar "memory leak")
    let isMounted = true;

    try {
      // Cria a instância de forma síncrona, usando o módulo importado
      const instance = pica({
        features: ['js', 'wasm', 'ww']
      });

      if (isMounted) {
        setPicaInstance(instance);
        setCarregando(false);
        console.log('%c✅ Pica.js inicializado com sucesso (via Módulo)', 'color: #10B981; font-weight: bold;');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Pica.js:', error);
      if (isMounted) {
        setCarregando(false);
        // Opcional: setar erro para exibição
        // setErroPdf('Erro fatal ao inicializar Pica.js');
      }
    }

    // Função de limpeza (cleanup)
    return () => {
      isMounted = false;
    };
  }, []); // Array de dependência vazio [] garante que rode APENAS uma vez

  // Sempre que o PDF ou a página atual mudar, converte a página para imagem
  useEffect(() => {
    if (!pdfUrl) return;

    const converterPaginaParaImagem = async () => {
      setCarregando(true); // Opcional: mostrar spinner durante a rasterização
      setErroPdf(null);

      try {
        // ⚠️ PONTO CHAVE: Use o estado `paginaAtual`
        const base64Image = await rasterizarPdfParaBase64(pdfUrl, paginaAtual, 150); // 150 DPI
        setImagemBase64(base64Image); // Isso atualiza a imagem enviada para o backend
        // setAlteracoesPendentes(true); // Pode ser mantido se quiser que qualquer mudança de página force a aplicação, mas vamos manter o controle de alterações apenas para a interface.

        // Se a página atual foi alterada, a `imagemBase64` mudou, o que significa que o
        // usuário provavelmente deve aplicar a alteração para gerar o banner dessa página.
        // if (paginaAtual !== 1) {
        //   setAlteracoesPendentes(true);
        // }

      } catch (error) {
        setErroPdf(error.message);
        console.error("Erro ao converter página atual para imagem:", error);
      } finally {
        setCarregando(false);
      }
    };

    converterPaginaParaImagem();

  }, [pdfUrl, paginaAtual]); // Depende de pdfUrl e paginaAtual


  useEffect(() => {
    if (!pdfUrl) return
    setErroPdf(null)

    const renderPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        setTotalPaginas(pdf.numPages)

        const container = pdfContainerRef.current
        if (!container) return
        container.innerHTML = ''

        const page = await pdf.getPage(paginaAtual)
        const unscaledViewport = page.getViewport({ scale: 1 })

        let scale = zoom

        const viewport = page.getViewport({ scale })

        // DEBUG: Verifique qual valor de scale está sendo usado AQUI:
        console.log("Scale usado na renderização do PDF.js:", scale);
        console.log("Largura do Canvas:", viewport.width);

        const canvas = document.createElement('canvas')
        canvas.classList.add('mb-4', 'shadow-md', 'border', 'rounded')

        // Define tamanho canvas conforme viewport
        canvas.width = viewport.width
        canvas.height = viewport.height

        // CSS para limitar altura e manter proporção
        canvas.style.maxWidth = '100%'

        canvas.style.width = `${viewport.width}px`;

        if (isMobile) {
          canvas.style.height = 'auto';
        } else {
          if (orientacao === 'retrato') {
            canvas.style.height = '700px';
          } else {
            canvas.style.height = '600px';
          }

        }
        const context = canvas.getContext('2d')
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }


        await page.render(renderContext).promise
        container.appendChild(canvas)


      } catch (error) {
        setErroPdf('Erro ao renderizar o PDF. Verifique se o arquivo pdf.worker.min.js está disponível.')
        console.error("Erro ao renderizar PDF com PDF.js:", error)
      }
    }
    renderPDF()
  }, [pdfUrl, paginaAtual, zoom])


  useEffect(() => {
    if (!imagemBase64Original) return;

    const ajustarImagem = async () => {
      try {

        const novoTratamentoImg = await tratamentoDimensoesBase64(imagemBase64Original, ampliacao.colunas);
        setImagemBase64(novoTratamentoImg);

        console.log(`🔄 Imagem ajustada conforme ${ampliacao.colunas} colunas`);
      } catch (err) {
        console.error("Erro ao redimensionar imagem:", err);
      }
    };

    ajustarImagem();
  }, [ampliacao.colunas]);


  // const gerarPdfPhp = async (partesRecortadasParaUsar = partesRecortadas) => {

  //   setCarregando(true)

  //   const pdfDoc = await PDFDocument.create()

  //   const a4Retrato = [595.28, 841.89]
  //   const a4Paisagem = [841.89, 595.28]
  //   const [pageWidth, pageHeight] = orientacao === 'retrato' ? a4Retrato : a4Paisagem

  //   const CM_TO_POINTS = 28.3465
  //   const margem = 0 * CM_TO_POINTS // 1 cm em pontos

  //   let pageIndex = 0; // Adiciona um índice para a página atual, começando de 0

  //   for (const parte of partesRecortadasParaUsar) {
  //     const page = pdfDoc.addPage([pageWidth, pageHeight])
  //     const imageBytes = await fetch(parte).then(res => res.arrayBuffer())

  //     // const image = parte.includes('png')
  //     //   ? await pdfDoc.embedPng(imageBytes)
  //     //   : await pdfDoc.embedJpg(imageBytes)
  //     // 🔹 Sempre JPEG
  //     const image = await pdfDoc.embedJpg(imageBytes)

  //     // const escala = Math.min(
  //     //   (pageWidth - margem * 2) / image.width,
  //     //   (pageHeight - margem * 2) / image.height
  //     // )

  //     // Se as partes já vieram redimensionadas, mantém a escala 1:1
  //     // const escala = Math.min(1, (pageWidth - margem * 2) / image.width, (pageHeight - margem * 2) / image.height)
  //     // const largura = image.width * escala
  //     // const altura = image.height * escala

  //     const largura = image.width;
  //     const altura = image.height;

  //     // const x = margem
  //     // const y = pageHeight - altura - margem

  //     const x = margem; // A imagem sempre começa da margem esquerda

  //     // === INÍCIO DA NOVA LÓGICA DE POSICIONAMENTO Y ===

  //     // Determina a "linha" atual da imagem original que esta parte representa (0-based)
  //     const linhaDaImagemOriginal = Math.floor(pageIndex / ampliacao.colunas);

  //     let y;
  //     // Se for a primeira linha da imagem original (linha 0)
  //     if (linhaDaImagemOriginal === 0) {
  //       y = margem; // Alinha a parte inferior da imagem com a margem inferior da página
  //     }
  //     // Se for a última linha da imagem original
  //     else if (linhaDaImagemOriginal === ampliacao.linhas - 1) {
  //       y = pageHeight - altura - margem; // Alinha a parte superior da imagem com a margem superior da página
  //     }
  //     // Se for qualquer linha intermediária (não a primeira nem a última)
  //     else {
  //       y = pageHeight - altura - margem; // Alinha a parte superior da imagem com a margem superior da página
  //     }

  //     page.drawImage(image, { x, y, width: largura, height: altura })

  //     // Número da página
  //     page.drawText(`${pdfDoc.getPageCount()}`, {
  //       x: pageWidth - margem,
  //       y: margem - 10,
  //       size: 8,
  //       color: rgb(0, 0, 0),
  //     })

  //     pageIndex++; // Não esqueça de incrementar o índice da página

  //     // Pontilhado nas bordas
  //     const desenharLinhaPontilhada = (x1, y1, x2, y2, segmento = 5, espaco = 20) => {
  //       const dx = x2 - x1
  //       const dy = y2 - y1
  //       const comprimento = Math.sqrt(dx * dx + dy * dy)
  //       const passos = Math.floor(comprimento / (segmento + espaco))
  //       const incX = dx / comprimento
  //       const incY = dy / comprimento
  //       for (let i = 0; i < passos; i++) {
  //         const inicioX = x1 + (segmento + espaco) * i * incX
  //         const inicioY = y1 + (segmento + espaco) * i * incY
  //         const fimX = inicioX + segmento * incX
  //         const fimY = inicioY + segmento * incY
  //         page.drawLine({
  //           start: { x: inicioX, y: inicioY },
  //           end: { x: fimX, y: fimY },
  //           thickness: 0.5,
  //           color: rgb(0.7, 0.7, 0.7),
  //         })
  //       }
  //     }
  //     desenharLinhaPontilhada(margem, margem, pageWidth - margem, margem)
  //     desenharLinhaPontilhada(margem, pageHeight - margem, pageWidth - margem, pageHeight - margem)
  //     desenharLinhaPontilhada(margem, margem, margem, pageHeight - margem)
  //     desenharLinhaPontilhada(pageWidth - margem, margem, pageWidth - margem, pageHeight - margem)
  //   }

  //   const pdfBytes = await pdfDoc.save()
  //   const blob = new Blob([pdfBytes], { type: 'application/pdf' })

  //   // ⚡ PDF para preview
  //   setPdfUrl(URL.createObjectURL(blob))

  //   // ⚡ PDF para download (não será alterado ao folhear)
  //   setPdfDownloadUrl(URL.createObjectURL(blob));

  //   setCarregando(false)

  //   setPaginaAtual(1)
  // }



  // =========================================================
  // GERAÇÃO DE PDF
  // =========================================================

  const gerarPDF = async (dadosPartes) => {

    const { partes, dpiCanvas, larguraFinalCm: larguraParteCm, alturaFinalCm: alturaParteCm } = dadosPartes;

    // if (pdfUrl) { URL.revokeObjectURL(pdfUrl); }

    setCarregando(true)

    const pdfDoc = await PDFDocument.create();
    // USO DO PARÂMETRO 'orientacao' AQUI TAMBÉM
    const a4Retrato = [595.28, 841.89];
    const a4Paisagem = [841.89, 595.28];
    const [pageWidth, pageHeight] = orientacao === 'retrato' ? a4Retrato : a4Paisagem;

    console.log(`🖨️ Gerando PDF (${orientacao})`);
    console.log(`🧩 Cada parte: ${larguraParteCm.toFixed(2)}cm × ${alturaParteCm.toFixed(2)}cm`);

    const CM_TO_POINTS = 72 / 2.54;
    const margem = 1 * CM_TO_POINTS;

    for (const parte of partes) {

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const base64String = parte.split(',')[1];
      const imageBytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));

      let image;

      try {
        image = await pdfDoc.embedJpg(imageBytes);
      } catch (e) {
        console.error("Erro ao incorporar imagem como JPG. Tentando PNG:", e);
        try {
          // Tentar como PNG se a incorporação JPEG falhar.
          image = await pdfDoc.embedPng(imageBytes);
        } catch (e2) {
          console.error("Erro ao incorporar imagem como PNG também.", e2);
          continue;
        }
      }

      // 🔹 Converte o tamanho em cm para points
      const larguraPt = larguraParteCm * CM_TO_POINTS;
      const alturaPt = alturaParteCm * CM_TO_POINTS;

      // 🔹 Alinhar no topo e à esquerda (PDF-lib usa origem no canto inferior)
      const x = margem;
      const y = page.getHeight() - alturaPt - margem;
      //Centralizar
      // const x = margem + (pageWidth - margem * 2 - larguraPt) / 2;
      // const y = margem + (pageHeight - margem * 2 - alturaPt) / 2;

      page.drawImage(image, { x, y, width: larguraPt, height: alturaPt });

      // Número da página
      page.drawText(`${pdfDoc.getPageCount()}`, {
        x: pageWidth - margem,
        y: margem - 10,
        size: 8,
        color: rgb(0, 0, 0),
      })

      // Pontilhado nas bordas
      const desenharLinhaPontilhada = (x1, y1, x2, y2, segmento = 5, espaco = 30) => {
        const dx = x2 - x1
        const dy = y2 - y1
        const comprimento = Math.sqrt(dx * dx + dy * dy)
        const passos = Math.floor(comprimento / (segmento + espaco))
        const incX = dx / comprimento
        const incY = dy / comprimento
        for (let i = 0; i < passos; i++) {
          const inicioX = x1 + (segmento + espaco) * i * incX
          const inicioY = y1 + (segmento + espaco) * i * incY
          const fimX = inicioX + segmento * incX
          const fimY = inicioY + segmento * incY
          page.drawLine({
            start: { x: inicioX, y: inicioY },
            end: { x: fimX, y: fimY },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
          })
        }
      }

      desenharLinhaPontilhada(margem, margem, pageWidth - margem, margem)
      desenharLinhaPontilhada(margem, pageHeight - margem, pageWidth - margem, pageHeight - margem)
      desenharLinhaPontilhada(margem, margem, margem, pageHeight - margem)
      desenharLinhaPontilhada(pageWidth - margem, margem, pageWidth - margem, pageHeight - margem)
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    console.log("✅ PDF final respeitando tamanho físico real (cm)");

    // ⚡ PDF para preview
    setPdfUrl(url);

    // ⚡ PDF para download (não será alterado ao folhear)
    setPdfDownloadUrl(url);

    setCarregando(false);

    setPaginaAtual(1);

    return url;

  };


  const downloadPDF = async (fileName, pdfUrl) => {
    if (!pdfUrl) return

    try {
      const response = await axios.post(route('user.downloads.store'), {
        file_name: fileName,
      })

      const total = response.data.total_downloads

      const nomeArquivo = `Poster-${total}.pdf`

      const a = document.createElement('a')
      a.href = pdfUrl
      a.download = nomeArquivo
      a.click()

    } catch (error) {
      console.error(error)
      alert('Erro ao contabilizar o download.')
    }

  }

  useEffect(() => {
    if (!imagemBase64) {
      setResumoTamanho("");
      return;
    }

    const img = new Image();

    img.crossOrigin = "Anonymous";
    img.src = imagemBase64;

    img.onload = () => {
      // medidas A4 em pontos
      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;
      const CM_TO_POINTS = 28.3465;

      // orientação
      const pageWidth = orientacao === "retrato" ? A4_WIDTH : A4_HEIGHT;
      const pageHeight = orientacao === "retrato" ? A4_HEIGHT : A4_WIDTH;

      // margem (1 cm usado no gerarPDF)
      const margem = 1 * CM_TO_POINTS;

      // grid
      const cols = Math.max(ampliacao?.colunas || 1, 1);
      const rows = Math.max(ampliacao?.linhas || 1, 1);

      // pixels da imagem original
      const originalPxW = img.width;
      const originalPxH = img.height;

      // pixels de uma parte (recorte)
      const partPxW = originalPxW / cols;
      const partPxH = originalPxH / rows;

      // área disponível dentro da página (em pontos)
      const availableW = pageWidth - margem * 2;
      const availableH = pageHeight - margem * 2;

      // escalas possíveis
      const widthScale = availableW / partPxW;
      const heightScale = availableH / partPxH;

      // se aspecto = true → mantém proporção (fit)
      // se aspecto = false → força altura cheia (fill by height)
      const escala = aspecto
        ? Math.min(widthScale, heightScale)
        : heightScale;

      // tamanho impresso de cada parte em pontos
      const printedPartW_pts = partPxW * escala;
      const printedPartH_pts = partPxH * escala;

      // tamanho total do banner
      const bannerW_pts = cols * printedPartW_pts;
      const bannerH_pts = rows * printedPartH_pts;

      const toCm = (pts) => (pts / CM_TO_POINTS).toFixed(1);

      setResumoTamanho({
        banner: {
          largura: toCm(bannerW_pts),
          altura: toCm(bannerH_pts),
          partes: cols * rows,
          parte: {
            largura: toCm(printedPartW_pts),
            altura: toCm(printedPartH_pts),
          },
          meta: {
            originalPxW,
            originalPxH,
            cols,
            rows,
            widthScale: +widthScale.toFixed(3),
            heightScale: +heightScale.toFixed(3),
            escala: +escala.toFixed(3),
            pageWidth,
            pageHeight,
            margem,
          },
        },
      });
    };

    img.onerror = () => {
      setResumoTamanho("");
      console.error("Erro ao carregar imagemBase64 para cálculo do banner.");
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagemBase64, ampliacao, orientacao, aspecto]);

  const removerImagem = () => {
    setImagemBase64(null);
    setImagemBase64Original(null);
    setAlteracoesPendentes(false); // opcional, se quiser resetar alterações pendentes
    setResumoTamanho("");          // opcional, se quiser limpar o resumo
  };


  return (
    <AuthenticatedLayout>
      <Head title="Editor" />

      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-start gap-4 min-h-screen">

          {/* Coluna das Opções */}
          <div className="w-full lg:w-1/3 flex flex-col justify-start items-center" id="opcoes">
            <div className="flex flex-col items-center justify-center gap-4 w-full" >
              <div className="w-full text-center text-2xl font-bold mt-4">
                <h1>Opções</h1>
              </div>

              <div className='w-full'>
                <div className='flex flex-col md:flex-row justify-center items-center'>
                  <label className="block mb-1 pro-label text-center text-xl">Imagem/Pdf:</label>
                  <input
                    type="file"
                    accept="image/*, application/pdf"
                    onChange={handleFileChange}
                    ref={inputFileRef}
                    className="
                          pro-btn-blue file:mr-4  file:rounded-full file:border-0
                          file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100 cursor-pointer
                        " />
                </div>
              </div>



              {/* Orientação */}
              <div className="w-full">
                <div className='flex flex-col md:flex-row justify-center items-center'>
                  <label className="block mb-1 pro-label text-center text-xl">Orientação:</label>
                  <select
                    className="px-2 w-full rounded-full pro-input"
                    name="orientacao"
                    id="orientacao"
                    value={orientacao}
                    onChange={(e) => {
                      setOrientacao(e.target.value)
                      setAlteracoesPendentes(true)
                    }}
                  >
                    <option value="retrato">Retrato</option>
                    <option value="paisagem">Paisagem</option>
                  </select>
                </div>
              </div>

              {/* Aspecto */}
              <div className="w-full">
                <div className='flex flex-col md:flex-row justify-center items-center'>
                  <label className="block mb-1 pro-label text-center text-xl">Aspecto:</label>
                  <select
                    className="px-2 w-full rounded-full pro-input"
                    name="aspecto"
                    id="aspecto"
                    value={aspecto}
                    onChange={(e) => {
                      setAspecto(e.target.value === "true")
                      setAlteracoesPendentes(true)
                    }}
                  >
                    <option value="true">Manter o aspecto original</option>
                    <option value="false">Preencher toda a folha</option>
                  </select>
                </div>
              </div>

              <div className="w-full flex flex-col">
                <label className="block mb-2 pro-label text-xl text-center">Ampliação:</label>
                <div className="flex gap-4 w-full">
                  <div className="flex-1">
                    <label className="block mb-2 pro-label text-center">Colunas</label>
                    <select
                      className="pro-input rounded-full w-full"
                      value={ampliacao.colunas}
                      onChange={(e) => {
                        setAmpliacao((prev) => ({
                          ...prev,
                          colunas: parseInt(e.target.value) || 1,
                        }));
                        setAlteracoesPendentes(true);
                      }}
                    >
                      {[...Array(10)].map((_, i) => {
                        const valor = i + 1;
                        return (
                          <option key={valor} value={valor}>
                            {valor}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-end justify-center px-2">
                    <span className="text-xl font-bold">×</span>
                  </div>

                  <div className="flex-1">
                    <label className="block mb-2 pro-label text-center">Linhas</label>
                    <select
                      className="pro-input rounded-full w-full"
                      value={ampliacao.linhas}
                      onChange={(e) => {
                        setAmpliacao((prev) => ({
                          ...prev,
                          linhas: parseInt(e.target.value) || 1,
                        }));
                        setAlteracoesPendentes(true);
                      }}
                    >
                      {[...Array(10)].map((_, i) => {
                        const valor = i + 1;
                        return (
                          <option key={valor} value={valor}>
                            {valor}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                </div>
              </div>

              <br />

              <div className="flex flex-col gap-2 w-full">
                {user && (
                  <>
                    {imagemBase64 && alteracoesPendentes && (
                      <button
                        // O botão fica desabilitado se `updateImg` OU `carregando` for true
                        disabled={updateImg || carregando}

                        onClick={async () => {
                          // Se o botão estiver desabilitado, o onClick não será executado, mas a checagem é segura.
                          if (updateImg || carregando) return;

                          setCarregando(true); // Inicia o estado de carregamento para as ações do backend

                          // const partes = await enviarParaCorteBackend();
                          const partes = await enviarParaCorteFrontend();

                          if (partes) {
                            await gerarPDF(partes);
                            setAlteracoesPendentes(false);
                          }

                          setCarregando(false);
                        }}
                        // Mantemos a classe de cor principal
                        className={alteracoesPendentes ? "pro-btn-red" : "pro-btn-purple"}
                      >
                        {/* Lógica para decidir o texto do botão */}
                        {updateImg ? (
                          'Atualizando Imagem...' // Quando a imagem está sendo redimensionada/comprimida (Pica/BIC)
                        ) : carregando ? (
                          'Preparando Alterações...' // Quando o backend e o PDF estão sendo gerados
                        ) : (
                          'Aplicar alterações ' // Estado padrão
                        )}
                      </button>
                    )}

                    <>
                      <h3 className="p-2 text-center font-bold sm:text-xl">
                        Resumo das atividades:
                      </h3>
                      <div className="p-3 mb-3 border rounded text-center bg-gray-50 sm:text-lg">
                        <p>
                          {resumoTamanho?.banner ? (
                            <>
                              🖼️ <b>Banner:</b> {resumoTamanho.banner.largura} × {resumoTamanho.banner.altura} cm aproximadamente
                              {' '}({resumoTamanho.banner.partes} partes — cada parte ≈ {resumoTamanho.banner.parte.largura} × {resumoTamanho.banner.parte.altura} cm)
                            </>
                          ) : (
                            <>Nenhum banner calculado</>
                          )}
                        </p>
                      </div>
                    </>

                    {pdfDownloadUrl && !alteracoesPendentes && (
                      <button
                        onClick={() => downloadPDF('poster.pdf', pdfDownloadUrl)}
                        className="pro-btn-green mt-2"
                        disabled={!pdfDownloadUrl}
                      >
                        Baixar PDF
                      </button>
                    )}


                    {pdfDownloadUrl && (
                      <div className="flex justify-center gap-2 mt-2">
                        <button
                          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.25))}
                          disabled={zoom <= 0.25}
                          className="pro-btn-blue px-3 py-1 rounded"
                        >
                          -
                        </button>
                        <span className="flex items-center px-2">{(zoom * 100).toFixed(0)}%</span>
                        <button
                          onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
                          disabled={zoom >= 3}
                          className="pro-btn-blue px-3 py-1 rounded"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className='w-full'>
                <button onClick={resetarConfiguracoes} className="pro-btn-slate">
                  Resetar Configurações
                </button>
              </div>

            </div>
          </div>

          {/* Coluna do Preview */}
          <div className="w-full lg:w-2/3 flex flex-col justify-center items-center mb-4">
            <div className="flex flex-col items-center justify-center gap-4 w-full" id="preview">

              <div className="mx-auto mb-2 p-2 rounded-2xl">
                <h1 className="sm:text-xl lg:text-2xl text-center font-bold whitespace-nowrap">
                  Preview{" "}
                  <span>{pdfUrl ? " do Banner em PDF " : "da Imagem"}</span>
                </h1>

                {/* Paginação */}
                {pdfUrl && totalPaginas > 1 && (
                  <div className="mt-4 px-4 flex justify-center items-center gap-4">
                    <button
                      onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
                      disabled={paginaAtual === 1}
                      className={`pro-btn-blue md:text-nowrap ${paginaAtual === 1 ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                    >
                      Anterior
                    </button>
                    <span className="text-lg whitespace-nowrap">
                      {paginaAtual} / {totalPaginas}
                    </span>
                    <button
                      onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
                      disabled={paginaAtual === totalPaginas}
                      className={`pro-btn-blue md:text-nowrap ${paginaAtual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
              <div className="">

                {/* Preview da Imagem ou PDF */}
                <div
                  className={`mx-auto w-full max-w-[842px] max-h-[700px] flex items-center justify-center relative
    ${!pdfUrl ? "border bg-white rounded-lg" : ""} 
    ${orientacao === "retrato" ? "aspect-[595/700]" : "aspect-[700/595]"}
  `}
                >
                  {/* Contêiner para os Botões de Ação */}
                  {(pdfUrl || imagemBase64) && (
                    <>
                      {/* ⬅️ Botão de Download (lado esquerdo) */}
                      {(imagemBase64 && !pdfUrl) && (
                        <div className="absolute top-2 left-2 z-20 ">
                          <button
                            title="Baixar Imagem Processada"
                            onClick={handleDownloadImagemProcessada}
                            className="bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full
                             p-2 shadow text-xs sm:text-sm font-bold w-full flex justify-center items-center"
                          >
                            {updateImg ? <Spinner size={20} borderWidth={3} texto='' /> : '⬇️'}
                          </button>
                        </div>
                      )}


                      {/* ❌ Botão de Remover (lado direito) */}
                      <div className="absolute top-2 right-2 z-20">
                        <button
                          title="Remover PDF / Imagem"
                          onClick={() => {
                            setPdfUrl(null);
                            setPdfDownloadUrl(null);
                            setImagemBase64(null);
                            setAlteracoesPendentes(false);
                            setPaginaAtual(1);
                            setResumoTamanho("");
                          }}
                          className="bg-white bg-opacity-80 
          hover:bg-opacity-100 rounded-full p-2 shadow text-xs sm:text-sm font-bold"
                        >
                          ❌
                        </button>
                      </div>
                    </>
                  )}

                  {/* 🔄 Botão Restaurar Imagem Original */}
                  {imagemBase64Original && !imagemBase64 && (
                    <div className="absolute top-2 left-2 z-20">
                      <button
                        title="Restaurar Imagem Original"
                        onClick={() => {
                          setImagemBase64(imagemBase64Original)
                          setPdfUrl(null);
                          setPdfDownloadUrl(null);
                          setAlteracoesPendentes(true);
                          setPaginaAtual(1);
                          setResumoTamanho("");
                        }}
                        className="bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full
                     p-2 shadow text-xs sm:text-sm font-bold w-full flex justify-center items-center"
                      >
                        🔄
                      </button>
                    </div>
                  )}


                  {/* Conteúdo do PDF ou imagem */}
                  {pdfUrl ? (
                    <div
                      key={pdfUrl}
                      ref={pdfContainerRef}
                      style={{ display: "flex", justifyContent: "center" }}
                    />
                  ) : imagemBase64 ? (
                    <img
                      src={imagemBase64}
                      alt="Pré-visualização da imagem carregada"
                      className="rounded-md mx-auto"
                      style={{
                        ...(orientacao === "retrato"
                          ? { width: "100%", maxWidth: "595px", aspectRatio: "595 / 700" }
                          : { width: "100%", maxWidth: "700px", aspectRatio: "700 / 595" }),
                        objectFit: aspecto ? "contain" : "fill",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 px-6">

                      {/* Área de Drag and Drop */}
                      <div className={`${orientacao === 'retrato' ? 'min-h-96 m-6' : 'min-h-64'}
                                                    flex flex-col items-center justify-center w-full p-10 border-2
                                                    border-dashed rounded-lg cursor-pointer transition-all
                                                    ${isDragging
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                        }
        `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleAreaClick}
                      >
                        <p className="text-gray-500 text-sm mb-2 text-center">
                          {isDragging ? "Solte o arquivo aqui!" : "Arraste e solte o arquivo, ou clique para selecionar."}
                        </p>

                        {/* Pré-visualização e/ou Nome do Arquivo */}
                        {arquivoOriginal && imagemBase64Original && (
                          <div className="mt-4 text-center ">
                            {/* <p className="text-blue-700 font-semibold">
                                                            Arquivo Original: {arquivoOriginal.name}
                                                        </p> */}
                            {imagemBase64 && arquivoOriginal.type.startsWith('image/') && (
                              <img src={imagemBase64} alt="Pré-visualização" className="mt-2 max-w-full h-auto max-h-40 object-contain mx-auto border" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  )}

                  {/* Overlay de carregamento */}
                  {carregando && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60">
                      <FullScreenSpinner />
                    </div>
                  )}
                </div>


                {erroPdf && (
                  <div className="text-red-600 mt-2 text-center">{erroPdf}</div>
                )}

              </div>
            </div>
          </div>


        </div>
      </div>

      <Footer ano={2025} />


    </AuthenticatedLayout>
  )
}
