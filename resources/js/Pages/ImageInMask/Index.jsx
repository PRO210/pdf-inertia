import Footer from '@/Components/Footer';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
  PDFDocument, rgb, StandardFonts, PageSizes, pushGraphicsState,
  popGraphicsState,
  clip,
  endPath
} from 'pdf-lib';

import * as pdfjsLib from 'pdfjs-dist'
import { aplicarMascaraCanvas } from './Partials/mask';
import Swal from 'sweetalert2';
import FullScreenSpinner from '@/Components/FullScreenSpinner';
import { getOriginalImageDimensions } from './Partials/getOriginalImageDimensions';
import { ajustarImagemBic } from './Partials/ajustarImagemBic';
import { downloadCount } from '@/Services/DownloadsCount';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'


const initialPath =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_APP_URL
    : import.meta.env.VITE_TESTE_APP_URL;


export default function Index() {
  const { user } = usePage().props;

  const [ampliacao, setAmpliacao] = useState({ colunas: 2, linhas: 2 })
  const [modoReducao, setModoReducao] = useState("grid");
  const [tamanhoQuadro, setTamanhoQuadro] = useState({ larguraCm: 14.4, alturaCm: 10 });
  const [espacamentoCm, setEspacamentoCm] = useState(1);

  const [orientacao, setOrientacao] = useState('paisagem')
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false)
  const [imagens, setImagens] = useState([]);
  const [imagensMask, setImagensMask] = useState([]);
  const uploadInputRef = useRef(null);
  const [mascaraSelecionada, setMascaraSelecionada] = useState('circulo');
  const [repeatMode, setRepeatMode] = useState("all");
  const [tamanhoCm, setTamanhoCm] = useState({ largura: 29.7, altura: 21.0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* Criar o Pdf */
  const previewRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfImageBase64, setPdfImageBase64] = useState(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [isLoading, setIsLoading] = useState(false);
  const CM_TO_PT = 28.3465;
  const [resumoTamanho, setResumoTamanho] = useState(
    { texto: "", larguraCm: 0, alturaCm: 0, totalBlocos: 0 });



  const rasterizarPdfParaBase64 = async (pdfUrl, paginaNum = 1, dpi = 150) => {
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

  useEffect(() => {
    // Esta função será o gatilho para a visualização
    const carregarPaginaVisualizacao = async () => {
      if (pdfUrl && totalPaginas > 0) {
        // Chama a função de rasterização com o número de página atual
        const base64 = await rasterizarPdfParaBase64(pdfUrl, paginaAtual, 150);
        setPdfImageBase64(base64); // Atualiza a visualização
        console.log(`Página ${paginaAtual} carregada para visualização.`);
      }
    };

    carregarPaginaVisualizacao();

  }, [paginaAtual, pdfUrl, totalPaginas]);


  // const SeuComponente = ({ pdfUrl, rasterizarPdfParaBase64 }) => {
  //   const [pdfImageBase64, setPdfImageBase64] = useState(null);
  //   const [isLoadingImage, setIsLoadingImage] = useState(false);
  //   const [imageError, setImageError] = useState(null);

  //   useEffect(() => {
  //     // 1. Verifica se há um URL e se a função existe
  //     if (pdfUrl && rasterizarPdfParaBase64) {
  //       const renderPdfPage = async () => {
  //         setIsLoadingImage(true);
  //         setImageError(null);
  //         setPdfImageBase64(null); // Limpa o estado anterior

  //         try {
  //           // 2. Chama a função de rasterização
  //           const base64 = await rasterizarPdfParaBase64(pdfUrl, 1, 150);
  //           setPdfImageBase64(base64);
  //         } catch (err) {
  //           console.error("Erro no componente ao renderizar PDF:", err);
  //           setImageError("Não foi possível carregar a pré-visualização do PDF.");
  //         } finally {
  //           setIsLoadingImage(false);
  //         }
  //       };

  //       renderPdfPage();
  //     } else {
  //       setPdfImageBase64(null); // Limpa se o URL for removido
  //     }
  //   }, [pdfUrl, rasterizarPdfParaBase64]);
  //   // ... (o restante do componente)
  // }


  // Função para converter File (usuário) ou URL (máscara) em ArrayBuffer
  const carregarImagemParaBuffer = async (imagemSource) => {

    if (imagemSource instanceof File) {
      // Imagem carregada pelo usuário (File)    
      return await imagemSource.arrayBuffer();
    } else if (typeof imagemSource === 'string') {
      // Imagem de máscara (URL da pasta public/Laravel)      
      const response = await fetch(imagemSource);
      if (!response.ok) throw new Error(`Falha ao carregar a máscara: ${response.statusText}`);
      return await response.arrayBuffer();
    }
    throw new Error('Fonte de imagem inválida.');
  };

  // // A função que você já usa, adaptada para o novo endpoint e dados
  // const enviarParaCorteBackend = async () => {
  //   try {
  //     const formData = new FormData();

  //     // Enviar todas as imagens
  //     imagens.forEach((img, index) => {
  //       formData.append(`imagens[]`, img);
  //     });

  //     // Enviar ampliacao
  //     formData.append("colunas", ampliacao.colunas);
  //     formData.append("linhas", ampliacao.linhas);
  //     formData.append("mascara", mascaraSelecionada);
  //     formData.append("orientacao", orientacao);

  //     const response = await axios.post(
  //       "/dashboard/image-in-mask",
  //       formData,
  //       { headers: { "Content-Type": "multipart/form-data" } }
  //     );

  //     console.log("Resposta:", response.data);
  //     return response.data;

  //   } catch (error) {
  //     console.error("Erro ao enviar imagens:", error);
  //   }
  // };

  const gerarPdf = async () => {
    // 🚩 Garante que haja imagens antes de começar
    if (!imagensMask || imagensMask.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Nenhuma Imagem",
        text: "Por favor, carregue as imagens primeiro.",
      });
      return;
    }

    if (modoReducao === "cm") {
      await gerarPdfComQuadroCm();
    } else {
      await gerarPdfComGrid();
    }
  };


  /**
   * Gera o documento PDF com o grid (grade) e renderiza todas as imagens mascaradas
   * em múltiplas páginas, respeitando as dimensões e preenchendo as células vazias
   * da última página.
   * * Dependências externas:
   * - PDFDocument, rgb, pushGraphicsState, clip, endPath, popGraphicsState (do pdf-lib)
   * - O array 'imagensMask' (dados processados)
   * - O objeto 'ampliacao' (colunas/linhas)
   * - O objeto 'tamanhoCm' e 'orientacao' (dimensões da página)
   * - Funções de estado (setIsLoading, setPdfUrl, setResumoTamanho, etc.)
   */
  const gerarPdfComGrid = async () => {
    console.log("========== 🟣 INICIANDO GERAR PDF MULTIPÁGINA (SIMPLIFICADO) ==========");

    // ================================
    // 📌 Histórico para exibir no Swal
    // ================================
    let resumo = [];
    const addResumo = (txt) => resumo.push(`• ${txt}`);
    setIsLoading(true);

    if (pdfUrl) {
      console.log("🔁 Limpando PDF anterior...");
      addResumo("PDF anterior removido");
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      console.log("📏 Tamanho em cm recebido:", tamanhoCm);
      addResumo("Tamanho da página carregado");

      const { largura, altura } = tamanhoCm;

      // Cálculo das dimensões da página (em pontos/pixels: 1 cm ≈ 28.35 pt)
      const pageDimensions = orientacao === "retrato"
        ? [altura * 28.35, largura * 28.35]
        : [largura * 28.35, altura * 28.35];

      addResumo("Dimensões convertidas para pontos/pixels");

      const pdfDoc = await PDFDocument.create();
      addResumo("PDF inicializado");

      const { width: pageW, height: pageH } = {
        width: pageDimensions[0],
        height: pageDimensions[1]
      };

      const margem = 10;
      const drawW = pageW - margem * 2;
      const drawH = pageH - margem * 2;

      const numCols = ampliacao.colunas;
      const numRows = ampliacao.linhas;
      const totalCells = numCols * numRows; // Células por página

      const cellW = drawW / numCols;
      const cellH = drawH / numRows;

      // Converter células para cm para usar no resumo
      const cellWcm = (cellW / 28.35).toFixed(2);
      const cellHcm = (cellH / 28.35).toFixed(2);

      addResumo(`Grade configurada: ${numCols} colunas × ${numRows} linhas`);
      addResumo(`Total de células do grid por página: ${totalCells}`);
      addResumo(`Cada célula mede ${cellWcm} × ${cellHcm} cm`);

      const totalImagensOriginais = imagensMask.length;

      if (!totalImagensOriginais) {
        pdfDoc.addPage(pageDimensions); // Adiciona pelo menos uma página vazia
        throw new Error("Nenhuma imagem para processar.");
      }

      // ==========================================================
      // 🚀 MODIFICAÇÃO: Lógica de Repetição/Preenchimento Completo (Se Poucas Imagens)
      // ==========================================================

      let imagensParaRenderizar = [...imagensMask]; // Cria um array que será usado para renderizar

      // Verifica se o total de imagens é MENOR que o total de células na primeira página
      if (totalImagensOriginais > 0 && totalImagensOriginais < totalCells) {

        addResumo(`Poucas imagens (${totalImagensOriginais}) para preencher o grid (${totalCells}). Repetindo a lista para completar a página.`);

        let index = 0;
        // Repete as imagens disponíveis até preencher a primeira página
        while (imagensParaRenderizar.length < totalCells) {
          imagensParaRenderizar.push(imagensMask[index % totalImagensOriginais]);
          index++;
        }

      } else {
        addResumo(`Imagens suficientes para pelo menos uma página completa.`);
      }

      const totalImagensRender = imagensParaRenderizar.length; // Novo total após a repetição
      const totalDePaginas = Math.ceil(totalImagensRender / totalCells);
      addResumo(`Total de itens a renderizar: ${totalImagensRender}. Serão geradas ${totalDePaginas} página(s).`);

      // ==========================================================
      // 🚀 LOOP PRINCIPAL: RENDERIZAÇÃO DE MÚLTIPLAS PÁGINAS E IMAGENS
      // ==========================================================

      let paginaAtual = null;
      let imagemIndex = 0; // Índice que percorre o novo array 'imagensParaRenderizar' sequencialmente

      // Loop externo: Percorre o número total de páginas necessárias
      for (let pageIndex = 0; pageIndex < totalDePaginas; pageIndex++) {

        // Adiciona e configura a nova página
        paginaAtual = pdfDoc.addPage(pageDimensions);

        // Desenha a borda externa da página
        // paginaAtual.drawRectangle({
        //   x: margem, y: margem, width: drawW, height: drawH,
        //   borderWidth: 1, borderColor: rgb(1, 0, 0),
        // });

        // Loop interno: Percorre as células desta página
        for (let i = 0; i < totalCells; i++) {

          const col = i % numCols;
          const row = Math.floor(i / numCols);
          const x = col * cellW + margem;
          const y = margem + (drawH - row * cellH - cellH);

          // --- 1. Lógica de Preenchimento / Fim das Imagens ---
          // Verifica se já percorremos todos os itens do array de renderização
          let isPlaceholder = imagemIndex >= totalImagensRender;

          if (isPlaceholder) {
            // Desenha o placeholder (célula vazia)
            paginaAtual.drawRectangle({
              x, y, width: cellW, height: cellH,
              borderWidth: 0.1, borderColor: rgb(0.7, 0.7, 0.7), // Cor clara para preenchimento
            });
            continue; // Pula para a próxima célula
          }

          // --- 2. Processa Imagem Real (ou Repetida) ---
          const imagemObj = imagensParaRenderizar[imagemIndex];

          // ** MUITO IMPORTANTE: Avança o índice da imagem para a próxima célula/página **
          imagemIndex++;

          if (!imagemObj?.maskedBase64) {
            // Trata erro se o item no índice for nulo/inválido (mesmo após a checagem inicial)
            paginaAtual.drawRectangle({
              x, y, width: cellW, height: cellH,
              borderWidth: 0.1, borderColor: rgb(0.7, 0.7, 0.7),
            });
            continue;
          }

          const base64 = imagemObj.maskedBase64;
          let pdfImage;

          // Lógica de conversão Base64 para buffer e embedar no PDF
          try {
            const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
            const imgBuffer = Uint8Array.from(atob(cleanBase64), (c) =>
              c.charCodeAt(0)
            );
            pdfImage = await pdfDoc
              .embedPng(imgBuffer)
              .catch(() => pdfDoc.embedJpg(imgBuffer));
          } catch {
            continue;
          }

          const { width: imgW, height: imgH } = pdfImage;

          // Lógica de ajuste (fit/contain) da imagem na célula
          let drawW_img = cellW;
          let drawH_img = cellH;
          let drawX_img = x;
          let drawY_img = y;

          const ratio = imgW / imgH;

          if (cellW / cellH < ratio) {
            // Largura da imagem é o fator limitante (ajusta a altura)
            drawH_img = cellW / ratio;
            drawY_img = y + (cellH - drawH_img) / 2; // Centraliza verticalmente
          } else {
            // Altura da imagem é o fator limitante (ajusta a largura)
            drawW_img = cellH * ratio;
            drawX_img = x + (cellW - drawW_img) / 2; // Centraliza horizontalmente
          }

          // Clipping (Recorte para garantir que a imagem não vaze da célula)
          paginaAtual.pushOperators(pushGraphicsState());
          paginaAtual.drawRectangle({ x, y, width: cellW, height: cellH, opacity: 0 });
          paginaAtual.pushOperators(clip(), endPath());

          // Desenhar imagem
          paginaAtual.drawImage(pdfImage, {
            x: drawX_img,
            y: drawY_img,
            width: drawW_img,
            height: drawH_img,
          });

          // Restaura o estado gráfico
          paginaAtual.pushOperators(popGraphicsState());

          // borda da célula
          paginaAtual.drawRectangle({
            x, y, width: cellW, height: cellH,
            borderWidth: 0.1, borderColor: rgb(0.1, 0.1, 0.1),
          });
        }

        addResumo(`Página ${pageIndex + 1}/${totalDePaginas} renderizada.`);
      }

      addResumo(`Total de ${totalDePaginas} páginas renderizadas.`);

      const pdfBytes = await pdfDoc.save();
      addResumo("PDF finalizado e convertido em bytes");

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // ==========================================================
      // 🚀 MODIFICAÇÃO: Lógica de Paginação (PDF.js)
      // ==========================================================
      // Obtém o total de páginas do PDF finalizado para o controle de paginação
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      setTotalPaginas(pdf.numPages);

      // Define a página inicial para 1. O useEffect (externo) cuidará da rasterização.
      setPaginaAtual(1);

      addResumo("PDF disponível para visualização");

      // Enviar resumo para o componente
      setResumoTamanho({
        totalBlocos: totalCells,
        larguraCm: cellWcm,
        alturaCm: cellHcm
      });

      setAlteracoesPendentes(false);


    } catch (error) {
      console.error("❌ ERRO CRÍTICO ao gerar PDF:", error);

      Swal.fire({
        icon: "error",
        title: "Erro ao gerar PDF",
        text: "Verifique o console para mais detalhes sobre a falha.",
      });

    } finally {
      // Garante que o estado de carregamento seja desativado
      setTimeout(() => {
        setIsLoading(false);
      }, 0);
    }
  };

  const gerarPdfComQuadroCm = async () => {
    console.log("========== 🟣 INICIANDO GERAR PDF (QUADRO CM) - PAGINADO ==========");

    // ================================
    // 📌 Configurações Iniciais e Limpeza
    // ================================
    let resumo = [];
    const addResumo = (txt) => resumo.push(`• ${txt}`);
    setIsLoading(true);

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      if (!imagensMask || !imagensMask.length) {
        throw new Error("Nenhuma imagem disponível em imagensMask");
      }

      const { largura, altura } = tamanhoCm;


      // 🔁 Alterna entre RETRATO e PAISAGEM
      const pageW =
        orientacao === "retrato"
          ? altura * CM_TO_PT
          : largura * CM_TO_PT;

      const pageH =
        orientacao === "retrato"
          ? largura * CM_TO_PT
          : altura * CM_TO_PT;

      const pageDimensions = [pageW, pageH];

      const margem = 10;
      const espacamento = 0 * 28.35; // Espaçamento entre quadros
      const drawW = pageW - margem * 2;
      const drawH = pageH - margem * 2;

      const quadroW = tamanhoQuadro.larguraCm * 28.35;
      const quadroH = tamanhoQuadro.alturaCm * 28.35;

      // ==========================================================
      // 1️⃣ CÁLCULO DA GRADE
      // ==========================================================

      // O número de colunas e linhas que CABEM na página, baseado no tamanho CM
      const numCols = Math.floor(drawW / (quadroW + espacamento));
      const numRows = Math.floor(drawH / (quadroH + espacamento));
      // A variável totalCells será usada APENAS para controlar o loop de desenho
      // e a repetição, mas o limite físico será dado pela checagem de atualY.
      const totalCells = numCols * numRows;

      if (numCols < 1 || numRows < 1) {
        throw new Error("O quadro fixo em CM é muito grande para as margens da página.");
      }

      addResumo(`Grade CM calculada: ${numCols} colunas × ${numRows} linhas`);
      addResumo(`Capacidade Máxima Teórica por página: ${totalCells}`);

      // ==========================================================
      // 2️⃣ LÓGICA DE REPETIÇÃO/PREENCHIMENTO
      // ==========================================================

      const totalImagensOriginais = imagensMask.length;
      let imagensParaRenderizar = [...imagensMask];

      // Se houver menos imagens do que cabe na primeira página, preenche com repetição
      if (totalImagensOriginais > 0 && totalImagensOriginais < totalCells) {
        addResumo(`Poucas imagens (${totalImagensOriginais}). Repetindo para preencher a primeira página.`);
        let index = 0;
        while (imagensParaRenderizar.length < totalCells) {
          // Repete as imagens originais
          imagensParaRenderizar.push(imagensMask[index % totalImagensOriginais]);
          index++;
        }
      }

      const totalImagensRender = imagensParaRenderizar.length; // Novo total de itens a desenhar
      const totalDePaginas = Math.ceil(totalImagensRender / totalCells);
      addResumo(`Total de itens a renderizar: ${totalImagensRender}. Serão geradas ${totalDePaginas} página(s).`);

      // ==========================================================
      // 3️⃣ LOOP PRINCIPAL: RENDERIZAÇÃO E PAGINAÇÃO
      // ==========================================================

      const pdfDoc = await PDFDocument.create();
      let paginaAtual = null;
      let imagemIndex = 0;

      for (let pageIndex = 0; pageIndex < totalDePaginas; pageIndex++) {

        // Adiciona uma nova página a cada iteração
        paginaAtual = pdfDoc.addPage(pageDimensions);

        // Variáveis de posição reiniciadas para a nova página
        let atualX = margem;
        let atualY = pageH - margem - quadroH;

        // Desenha a borda externa da página (opcional)
        // paginaAtual.drawRectangle({
        //   x: margem, y: margem, width: drawW, height: drawH,
        //   borderWidth: 1, borderColor: rgb(1, 0, 0),
        // });

        // Loop interno: Percorre as células que caberiam teoricamente
        for (let i = 0; i < totalCells; i++) {

          // --- A. Checagem de Preenchimento / Fim ---
          let isPlaceholder = imagemIndex >= totalImagensRender;

          if (isPlaceholder) {
            // Célula de Placeholder
            paginaAtual.drawRectangle({
              x: atualX, y: atualY, width: quadroW, height: quadroH,
              borderWidth: 0.1, borderColor: rgb(0.7, 0.7, 0.7),
            });

          } else {
            // --- B. Processa Imagem Real/Repetida ---
            const imagemObj = imagensParaRenderizar[imagemIndex];
            const base64 = imagemObj?.maskedBase64;

            if (!base64) {
              // Se o item for nulo, desenha o placeholder
              paginaAtual.drawRectangle({
                x: atualX, y: atualY, width: quadroW, height: quadroH,
                borderWidth: 0.1, borderColor: rgb(0.7, 0.7, 0.7),
              });
            } else {
              // Desenha Imagem
              const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
              const imgBuffer = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));

              const pdfImage = await pdfDoc
                .embedPng(imgBuffer)
                .catch(() => pdfDoc.embedJpg(imgBuffer));

              // Desenha o quadro (borda)
              paginaAtual.drawRectangle({
                x: atualX, y: atualY, width: quadroW, height: quadroH,
                borderWidth: 0.1, borderColor: rgb(0, 0, 0),
              });

              // Desenha a imagem (sem ajuste de proporção, pois o quadro é fixo)
              paginaAtual.drawImage(pdfImage, {
                x: atualX, y: atualY, width: quadroW, height: quadroH,
              });
            }

            // Avança o índice da imagem APENAS quando processamos um item
            imagemIndex++;
          }

          // --- C. Avanço da Coordenada X ---
          atualX += quadroW + espacamento;

          // --- D. Avanço da Coordenada Y (Nova Linha) ---
          if (atualX + quadroW + margem > pageW) {
            // 1. Resetar X para a próxima linha
            atualX = margem;

            // 2. Calcular a coordenada Y da PRÓXIMA linha
            const nextY = atualY - (quadroH + espacamento);

            // 🚀 CORREÇÃO CRÍTICA AQUI: Checa se há espaço para a próxima linha
            if (nextY < margem) {
              // Se a próxima linha cair abaixo da margem, encerra o loop interno
              break;
            }

            // 3. Aplicar o avanço (Se houver espaço)
            atualY = nextY;
          }
        }
        addResumo(`Página ${pageIndex + 1}/${totalDePaginas} renderizada.`);
      }

      // ... (O restante da finalização e lógica de resumo/paginação é mantido)

      // ==========================================================
      // 4️⃣ FINALIZAÇÃO E LÓGICA DE RESUMO (Adaptada)
      // ==========================================================

      const totalQuadrosDesenhados = imagemIndex;

      setResumoTamanho({
        texto: `
    📐 RESULTADOS\n
    • Quadros/Página (Máx.): ${totalCells}
    • Total de Itens Desenhados: ${totalQuadrosDesenhados}
    • Páginas Geradas: ${totalDePaginas}

    📏 Tamanho do Quadro Fixo\n
    • Largura: ${tamanhoQuadro.larguraCm.toFixed(2)} cm
    • Altura: ${tamanhoQuadro.alturaCm.toFixed(2)} cm
  `,
        larguraCm: tamanhoQuadro.larguraCm,
        alturaCm: tamanhoQuadro.alturaCm,
        totalBlocos: totalCells
      });

      // ====================================================
      // 5️⃣ SALVA PDF E INICIA RASTERIZAÇÃO
      // ====================================================
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });

      const novoPdfUrl = URL.createObjectURL(blob);
      setPdfUrl(novoPdfUrl);

      setAlteracoesPendentes(false);

      // 🚀 LÓGICA DE PAGINAÇÃO (PDF.js)
      const loadingTask = pdfjsLib.getDocument(novoPdfUrl);
      const pdf = await loadingTask.promise;
      setTotalPaginas(pdf.numPages);
      setPaginaAtual(1); // O useEffect externo cuidará da primeira rasterização.


    } catch (error) {
      console.error("❌ ERRO CRÍTICO ao gerar PDF (Quadro CM):", error);
      alert("Erro ao gerar PDF: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removerImagem = (indexParaRemover) => {
    setImagens(prevImagens => {
      const novasImagens = prevImagens.filter(
        (_, index) => index !== indexParaRemover
      );

      // Se não restar nenhuma imagem
      if (novasImagens.length === 0) {
        // Limpa também as imagens mascaradas
        setImagensMask([]);

        // Fecha modal se estiver aberto
        setIsModalOpen(false);

        // Limpa input file
        if (uploadInputRef.current) {
          uploadInputRef.current.value = "";
        }

        // Marca que houve alteração
        setAlteracoesPendentes(true);
      }

      return novasImagens;
    });
  };


  const resetarConfiguracoes = () => {
    setAmpliacao({ colunas: 2, linhas: 1 })
    setOrientacao('paisagem')
    setAlteracoesPendentes(false)
    setImagens([]);
    setImagensMask([]);
    setRepeatMode("all");
    uploadInputRef.current.value = null;
    pdfUrl && URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setMascaraSelecionada('circulo');
    setTamanhoQuadro({ larguraCm: 5, alturaCm: 6 });
    setEspacamentoCm(1);
    setModoReducao("grid");
    setTamanhoCm({ largura: 27.7, altura: 19.0 });
    setIsModalOpen(false);
    setResumoTamanho({ texto: "", larguraCm: 0, alturaCm: 0, totalBlocos: 0 });

  }


  const aplicarMascaraNaImagem = async () => {

    setIsLoading(true);

    console.log("🟣 Iniciando aplicação de máscara em todas as imagens...");
    // ... (restante dos logs)

    if (!imagens.length) {
      console.warn("⚠️ Nenhuma imagem encontrada no array.");
      Swal.fire({
        title: 'Aviso !',
        text: 'Nenhum imagem Selecionada :)',
        icon: 'warning',
        confirmButtonText: 'OK',
        timer: 10000,
        timerProgressBar: true,
      });
      setIsLoading(false);
      return;
    }

    const mascaraPath = `${initialPath}/imagens/mascaras/${mascaraSelecionada}.png`;
    const inicio = performance.now();

    const mascaradas = await Promise.all(

      imagens.map(async (file, index) => {
        console.log("\n------------------------------");
        console.log(`🔵 Processando imagem ${index + 1}/${imagens.length}`);
        console.log("📦 File recebido:", file);

        try {
          if (!(file instanceof File)) {
            console.error("❌ Item não é File!", file);
            throw new Error("Item do array não é File válido.");
          }

          // ==========================================================
          // 🚀 NOVO PASSO 1: Obter dimensões originais
          // ==========================================================
          const { width: originalWidth, height: originalHeight } = await getOriginalImageDimensions(file);

          // ==========================================================
          // 🚀 NOVO PASSO 2: Calcular redução de 25% (75% do original)
          // ==========================================================
          const newWidth = Math.round(originalWidth * 0.75);
          const newHeight = Math.round(originalHeight * 0.75);

          console.log(`📐 Original: ${originalWidth}x${originalHeight}. Reduzindo para: ${newWidth}x${newHeight}`);

          // ==========================================================
          // 🚀 NOVO PASSO 3: Redimensionar/Comprimir
          // ==========================================================
          // Chama a função 'ajustarImagemBIC' para criar o Blob redimensionado
          const { blob: compressedBlob } = await ajustarImagemBic(file, newWidth, newHeight);

          // O Blob redimensionado será o arquivo que usaremos
          const fileToProcess = compressedBlob;

          // ==========================================================

          console.log("⏳ Criando URL temporária (do arquivo redimensionado)...");
          // Usa o Blob redimensionado/comprimido para criar a URL
          const caminhoImagem = URL.createObjectURL(fileToProcess);

          console.log("👉 Caminho temporário:", caminhoImagem);

          console.log("⏳ Aplicando máscara...");
          // A função aplicarMascaraCanvas agora usa a URL do arquivo redimensionado
          const base64 = await aplicarMascaraCanvas(caminhoImagem, mascaraPath);

          console.log("✅ Máscara aplicada!");
          console.log("📤 Base64 gerada (tamanho):", base64.length);

          // liberar memória
          URL.revokeObjectURL(caminhoImagem);

          return {
            fileOriginal: file, // Mantém a referência ao original
            fileResized: fileToProcess, // Opcional: Referência ao Blob redimensionado
            name: file.name,
            maskedBase64: base64,
          };

        } catch (err) {
          console.error("❌ Erro ao processar ou aplicar máscara:", err);
          // O setIsLoading(false) deve ficar no finally ou fora do loop, 
          // mas é aceitável aqui para falhas críticas de processamento.
          setIsLoading(false);
          return null;
        }
      })
    );

    // ... (restante da função)
    setIsLoading(false); // Melhor colocar aqui para garantir que o estado seja limpo

    // remove nulls (em caso de erro)
    const filtradas = mascaradas.filter(Boolean);

    // ... (logs de finalização e setImagensMask)
    setImagensMask(filtradas);
  };

  useEffect(() => {
    if (imagensMask.length > 0) {
      gerarPdf();
    }
  }, [imagensMask])

  const handleDownloadPdf = async () => {
    if (!pdfUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Aviso',
        text: 'Nenhum PDF disponível para download.',
      });
      return;
    }

    try {
      // 🔒 Garante que o blob ainda é válido
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('PDF indisponível');
      }
      
      // 📊 Log estatístico
      const total = await downloadCount('Imagem-em-Formas.pdf');

      const blob = await response.blob();

      const link = document.createElement('a');
      const blobUrl = URL.createObjectURL(blob);

      link.href = blobUrl;
      link.download = `Imagem-em-Formas-${total}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);

    } catch (err) {
      console.error('Erro no download do PDF:', err);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Não foi possível baixar o PDF.',
      });
    }
  };


  return (
    <>
      <Head title="Fotos em Formas" />

      <div className="flex flex-col lg:flex-row items-start gap-4 min-h-screen">

        <div className="w-full lg:w-1/3 flex flex-col justify-start items-center px-4" id="opcoes">
          <div className="flex flex-col items-center justify-center gap-4 w-full" >
            <div className="w-full text-center text-2xl font-bold mt-4">
              <h1>Opções</h1>
            </div>

            {/* Orientação e Aspecto (sem alterações) */}
            <div className="w-full">
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

            <label className="block pro-label text-xl text-center">Modo de Redução:</label>

            <select
              className="pro-input rounded-full w-full mb-4"
              value={modoReducao}
              onChange={(e) => {
                // 1. Atualiza o valor do modo de redução (como já fazia)
                setModoReducao(e.target.value);

                // 2. SETA ALTERAÇÕES PENDENTES COMO TRUE
                setAlteracoesPendentes(true);
              }}
            >
              <option value="grid">Por Colunas x Linhas</option>
              <option value="cm">Por Tamanho em CM</option>
            </select>

            {/* Ampliacao (colunas / linhas) - mantém igual */}
            {modoReducao === "grid" && (
              <>
                <label className="block  pro-label text-xl text-center">Redução:</label>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <div className="flex gap-2 w-full">
                    <div className="flex-1" id='colunas-input'>
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
                        {[...Array(11)].map((_, i) => {
                          return (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-end justify-center px-2">
                      <span className="text-xl font-bold">×</span>
                    </div>

                    <div className="flex-1" id='linhas-select'>
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
                        {[...Array(11)].map((_, i) => {
                          return (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                  </div>
                </div>
              </>
            )}

            {modoReducao === "cm" && (() => {

              // 📄 Limites dinâmicos conforme orientação (A4)
              const limitesCm = {
                largura: orientacao === "paisagem" ? 29.7 : 21,
                altura: orientacao === "paisagem" ? 21 : 29.7,
              };

              return (
                <>
                  <label className="block pro-label text-xl text-center">
                    Redução (Tamanho Fixo em CM)
                  </label>

                  <div className="flex flex-col sm:flex-row gap-6 w-full">

                    {/* 🔹 LARGURA */}
                    <div className="flex-1">
                      <label className="block sm:hidden mb-2 pro-label text-center">
                        Largura (cm)
                        <span className="block sm:hidden text-sm font-bold">
                          {tamanhoQuadro.larguraCm.toFixed(1)} cm
                          <span className="text-xs block opacity-70">
                            máx {limitesCm.largura} cm
                          </span>
                        </span>
                      </label>

                      {/* 📱 MOBILE → SLIDER */}
                      <input
                        type="range"
                        min="1"
                        max={limitesCm.largura}
                        step="0.1"
                        value={tamanhoQuadro.larguraCm}
                        className="w-full sm:hidden"
                        onChange={(e) => {
                          const valor = parseFloat(e.target.value);

                          setTamanhoQuadro(prev => ({
                            ...prev,
                            larguraCm: Math.min(valor, limitesCm.largura),
                          }));

                          setAlteracoesPendentes(true);
                        }}
                      />

                      {/* 💻 DESKTOP → INPUT ORIGINAL */}
                      <input
                        type="number"
                        step="0.01"
                        value={tamanhoQuadro.larguraCm}
                        max={limitesCm.largura}
                        className="pro-input rounded-full w-full hidden sm:block"
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parsed = parseFloat(raw);

                          setTamanhoQuadro(prev => ({
                            ...prev,
                            larguraCm:
                              raw === ""
                                ? 1
                                : Math.min(
                                  isNaN(parsed) ? 1 : parsed,
                                  limitesCm.largura
                                ),
                          }));

                          setAlteracoesPendentes(true);
                        }}
                      />
                    </div>

                    {/* 🔹 ALTURA */}
                    <div className="flex-1">
                      <label className="block sm:hidden mb-2 pro-label text-center">
                        Altura (cm)
                        <span className="block sm:hidden text-sm font-bold">
                          {tamanhoQuadro.alturaCm.toFixed(1)} cm
                          <span className="text-xs block opacity-70">
                            máx {limitesCm.altura} cm
                          </span>
                        </span>
                      </label>

                      {/* 📱 MOBILE → SLIDER */}
                      <input
                        type="range"
                        min="1"
                        max={limitesCm.altura}
                        step="0.1"
                        value={tamanhoQuadro.alturaCm}
                        className="w-full sm:hidden"
                        onChange={(e) => {
                          const valor = parseFloat(e.target.value);

                          setTamanhoQuadro(prev => ({
                            ...prev,
                            alturaCm: Math.min(valor, limitesCm.altura),
                          }));

                          setAlteracoesPendentes(true);
                        }}
                      />

                      {/* 💻 DESKTOP → INPUT ORIGINAL */}
                      <input
                        type="number"
                        step="0.01"
                        value={tamanhoQuadro.alturaCm}
                        max={limitesCm.altura}
                        className="pro-input rounded-full w-full hidden sm:block"
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value);

                          setTamanhoQuadro(prev => ({
                            ...prev,
                            alturaCm: Math.min(parsed || 1, limitesCm.altura),
                          }));

                          setAlteracoesPendentes(true);
                        }}
                      />
                    </div>

                  </div>
                </>
              );
            })()}


            {/* Repetir ou não as imagens */}
            {/* <div className="w-full">
              <label className="block mb-1 pro-label text-center text-xl">Ativar Repetição:</label>
              <select
                value={repeatMode}
                onChange={(e) => {
                  setRepeatMode(e.target.value);
                  setAlteracoesPendentes(true);
                }}
                className="px-2 w-full rounded-full pro-input"
              >
                <option value="none">Não repetir</option>
                <option value="all">Repetir em todas as páginas</option>
              </select>
            </div> */}


            {/* Input de Imagens e Controle de Visualização */}
            <div className="w-full mt-4">
              <label className="block mb-1 pro-label text-center text-xl">Carregar Imagens:</label>
              <div className='flex flex-col gap-2'>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={uploadInputRef}
                  onChange={(e) => {
                    const novosArquivos = Array.from(e.target.files);
                    setImagens(prev => [...prev, ...novosArquivos]);
                    setAlteracoesPendentes(true);
                  }}
                  className="px-2 w-full rounded-lg pro-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />

              </div>
            </div>

            {/* Botão para abrir o Modal (Visível se o checkbox estiver marcado) */}
            {imagens.length > 0 && (
              <div className='w-full'>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="pro-btn-blue w-full"
                >
                  Visualizar Imagens Carregadas ({imagens.length})
                </button>
              </div>
            )}


            {/*  Seleção do Tipo de Máscara */}
            <div className="w-full mt-4">
              <label className="block mb-1 pro-label text-center text-xl">Formato da Máscara:</label>
              <select
                className="px-2 w-full rounded-full pro-input"
                value={mascaraSelecionada}
                onChange={(e) => {
                  setMascaraSelecionada(e.target.value);
                  setAlteracoesPendentes(true);
                }}
              >
                <option value="retangulo">Retângulo</option>
                <option value="circulo">Círculo</option>
                <option value="coracao">Coração</option>

              </select>
            </div>


            <div className='w-full'>
              <button onClick={resetarConfiguracoes} className="pro-btn-slate">
                Resetar Configurações
              </button>
            </div>

            {/* ÁREA DOS BOTÕES */}
            <div className="w-full mt-4 flex flex-col items-center gap-2">

              {/* 1. Quando há alterações pendentes */}
              {alteracoesPendentes && (
                <button
                  onClick={aplicarMascaraNaImagem}
                  className="pro-btn-green my-2"
                // disabled={imagens.length === 0 }
                >
                  Aplicar alterações
                </button>
              )}

              {/* 2. Quando NÃO há alterações pendentes e já existe PDF */}
              {!alteracoesPendentes && pdfUrl && (
                <button
                  onClick={handleDownloadPdf}
                  className="pro-btn-red my-2"
                >
                  📥 Baixar PDF
                </button>

              )}
            </div>

            <h3 className='p-2 text-center font-bold sm:text-xl'>Resumo das atividades:</h3>
            <div className="p-2 mb-3 border rounded text-center bg-gray-50 sm:text-lg">
              {resumoTamanho && resumoTamanho.totalBlocos > 0 ? (
                <div className="space-y-1">
                  <p>🔢 <b>Total de blocos:</b> {resumoTamanho.totalBlocos}</p>
                  <p>📐 <b>Tamanho de cada bloco:</b> {resumoTamanho.larguraCm} × {resumoTamanho.alturaCm} cm</p>
                  <p>🧩 <i>(Distribuição automática das imagens aplicada)</i></p>
                </div>
              ) : (
                <>Nenhuma informação disponível</>
              )}
            </div>

          </div>

        </div>

        {/* Coluna do Preview */}
        <div className="w-full lg:w-2/3 flex flex-col justify-center items-center" id="preview">

          <h2 className="sm:text-xl lg:text-2xl text-center font-bold whitespace-nowrap mt-4">
            {pdfUrl ? 'Preview do PDF ' : 'Instruções'}
          </h2>

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

          {/* Contêiner de Visualização */}
          <div className="w-full bg-gray-100 shadow-xl p-3 rounded-2xl max-h-[70vh] overflow-hidden flex items-center justify-center">

            {pdfUrl ? (
              <div className="w-full h-full flex items-center justify-center">

                {/* 🔹 1. Estado de Carregamento */}
                {isLoadingImage && (
                  <div className="text-center text-blue-500 p-4">
                    <svg className="animate-spin h-5 w-5 mr-3 inline text-blue-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Carregando pré-visualização...
                  </div>
                )}

                {/* 🔹 2. Pré-visualização */}
                {!isLoadingImage && pdfImageBase64 && (
                  <img
                    src={pdfImageBase64}
                    alt="Pré-visualização do PDF"
                    className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-md"
                  />
                )}

                {/* 🔹 3. Estado de Erro */}
                {!isLoadingImage && imageError && (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-red-500 text-lg m-3">⚠️ {imageError}</p>

                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow mt-2"
                    >
                      Abrir PDF Original
                    </a>
                  </div>
                )}

              </div>
            ) : (
              <div class="mt-4 p-4 md:p-8 lg:p-12 w-full mx-auto border-4 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p class="text-center text-gray-500 dark:text-gray-400 p-4">
                  1) 🔄 Escola a orientação do papel se Paisagem ou Retrato;<br /><br />
                  2) 📏 A quantidade por folha ou o tamanho específico;<br /><br />
                  3) 🖼️ Carregue as suas imagens;<br /><br />
                  4) 📄 Clique em <b>Gerar PDF</b> para visualizar o documento final;<br /><br />
                  5) ⬇️ Baixe o arquivo pronto.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Overlay de carregamento */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60">
          <FullScreenSpinner />
        </div>
      )}


      {/* MODAL PARA VISUALIZAÇÃO DE IMAGENS CARREGADAS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[120vh] overflow-hidden flex flex-col">

            {/* Cabeçalho do Modal */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Imagens Carregadas ({imagens.length})
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                aria-label="Fechar Modal"
              >
                <svg className="w-6 h-6 hover:text-purple-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Corpo do Modal - Grid de Imagens */}
            <div className="p-4 overflow-y-auto">
              {imagens.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400">Nenhuma imagem carregada.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {imagens.map((imagem, index) => (
                    // Container da Imagem com Posição Relativa para o Botão
                    <div
                      key={index}
                      className="relative aspect-square overflow-hidden rounded-lg shadow-md border border-gray-200 dark:border-gray-600 group"
                    >

                      {/* Imagem */}
                      <img
                        src={URL.createObjectURL(imagem)}
                        alt={`Imagem ${index + 1}`}
                        className="object-cover w-full h-full"
                      />

                      {/* Botão Flutuante de REMOVER (Sempre visível ou visível ao passar o mouse) */}
                      <button
                        onClick={() => removerImagem(index)}
                        title="Remover Imagem"
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg opacity-80 hover:opacity-100 transition duration-200"
                      >
                        {/* Ícone "X" */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>

                      <span className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              {/* Botão + para adicionar mais */}
              <button
                onClick={() => uploadInputRef.current.click()}
                title="Adicionar Mais Imagens"
                className="pro-btn-purple text-center"
              >
                {/* Ícone + */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </button>

              {/* Botão Concluído */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="pro-btn-slate text-purple-600"
              >
                Concluído
              </button>
            </div>


          </div>
        </div>
      )}

      <Footer ano={2025} />
    </>

  );
}

Index.layout = (page) => (
  <AuthenticatedLayout
    auth={page.props.auth}
    header={
      <h2 className="text-xl text-center font-semibold leading-tight text-gray-800">
        Aplicar Mascaras em Imagens
      </h2>
    }
  >
    {page}
  </AuthenticatedLayout>
);
