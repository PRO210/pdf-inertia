
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Função auxiliar para desenhar o cabeçalho em um slot específico
 */
const desenharCabecalhoNoPDF = (params) => {
  const {
    page,
    textoLinhas,
    font,
    alturaCabecalho,
    x,
    yTopoReferencia, // cellBottomY + cellH
    larguraDisponivel,
    temBordaX,
    alturaBordaX,
    temBordaY,
    larguraBordaY,
    comBordaGrafica
  } = params;

  const fontSizeCab = 12;
  const lineHeight = 15;

  /*
   * Padding INTERNO do retângulo do cabeçalho.
   *
   * Só usado quando existe borda gráfica.
   */
  const RECT_PADDING_X = comBordaGrafica ? 5 : 0;
  const RECT_PADDING_Y = comBordaGrafica ? 5 : 0;

  /*
   * Espaçamento interno do texto
   */
  const paddingTextoX = 5;

  /*
   * Topo real da área
   */
  const cellTop = yTopoReferencia - (temBordaX ? alturaBordaX : 0);

  /*
   * Área desenhada do retângulo
   *
   * Agora respeita padding
   */
  const rectX = x + RECT_PADDING_X;
  const rectY = cellTop - alturaCabecalho + RECT_PADDING_Y;
  const rectWidth = larguraDisponivel - (RECT_PADDING_X * 3);
  const rectHeight = alturaCabecalho - (RECT_PADDING_Y * 2);

  /*
   * Borda do cabeçalho
   */
  if (comBordaGrafica) {
    page.drawRectangle({
      x: rectX,
      y: rectY,
      width: rectWidth,
      height: rectHeight,
      borderWidth: 0.8,
      borderColor: rgb(0.6, 0.6, 0.6),
      color: rgb(0.98, 0.98, 0.98),
    });
  }

  /*
   * Texto respeita o mesmo padding
   */
  textoLinhas.forEach((linha, idx) => {
    const yTexto = cellTop - RECT_PADDING_Y - lineHeight * (idx + 1) - 2;

    page.drawText(linha, {
      x: rectX + paddingTextoX,
      y: yTexto,
      size: fontSizeCab,
      font,
      color: rgb(0.2, 0.2, 0.2)
    });
  });
};

const precisaCortarMargemBranca = (ctx, width, height, threshold = 240, tolerancia = 0.98) => {
  const { data } = ctx.getImageData(0, 0, width, height);
  const isWhite = (r, g, b) => r > threshold && g > threshold && b > threshold;

  const checkLinha = (y) => {
    let whitePixels = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isWhite(data[i], data[i + 1], data[i + 2])) whitePixels++;
    }
    return whitePixels / width;
  };

  const checkColuna = (x) => {
    let whitePixels = 0;
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      if (isWhite(data[i], data[i + 1], data[i + 2])) whitePixels++;
    }
    return whitePixels / height;
  };

  const topo = checkLinha(0);
  const base = checkLinha(height - 1);
  const esquerda = checkColuna(0);
  const direita = checkColuna(width - 1);

  return (
    topo > tolerancia ||
    base > tolerancia ||
    esquerda > tolerancia ||
    direita > tolerancia
  );
};


const cortarMargemBranca = (ctx, width, height, threshold = 240) => {
  const { data } = ctx.getImageData(0, 0, width, height);
  const isWhite = (r, g, b) => r > threshold && g > threshold && b > threshold;

  let top = 0, bottom = height, left = 0, right = width;

  // Máximo permitido para cortar (≈1 cm)
  const MAX_MARGIN_PERCENT = 0.035;

  const MAX_CROP_X = width * MAX_MARGIN_PERCENT;
  const MAX_CROP_Y = height * MAX_MARGIN_PERCENT;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isWhite(data[i], data[i + 1], data[i + 2])) {
        top = y;
        y = height;
        break;
      }
    }
  }

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isWhite(data[i], data[i + 1], data[i + 2])) {
        bottom = y;
        y = -1;
        break;
      }
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      if (!isWhite(data[i], data[i + 1], data[i + 2])) {
        left = x;
        x = width;
        break;
      }
    }
  }

  for (let x = width - 1; x >= 0; x--) {
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      if (!isWhite(data[i], data[i + 1], data[i + 2])) {
        right = x;
        x = -1;
        break;
      }
    }
  }

  // Limita o corte a no máximo ~1 cm
  top = Math.min(top, MAX_CROP_Y);
  left = Math.min(left, MAX_CROP_X);

  bottom = Math.max(bottom, height - MAX_CROP_Y);
  right = Math.max(right, width - MAX_CROP_X);

  const cropWidth = right - left;
  const cropHeight = bottom - top;

  return { left, top, cropWidth, cropHeight };
};

/**
 * Serviço de geração de PDF
 */
export const gerarPDFService = async (
  imagens,
  ampliacao,
  orientacao,
  aspecto,
  setPdfUrl,
  setPaginaAtual,
  setAlteracoesPendentes,
  setErroPdf,
  repeatBorder = "none",
  alturaBorda = 5,
  larguraBorda = 5,
  cabecalhoTexto = "",
  cabecalhoAtivo = false,
  cabecalhoModo = "ambas",
  modoDimensionamento = "grid",
  tamanhoCm = { largura: 29.7, altura: 21 },
  cabecalhoBorder = false,
  setPdfs,
  cabecalhoTipo = "texto",
  cabecalhoImagem = null,
) => {
  if (!imagens || !imagens.some(Boolean)) {
    alert('Nenhuma imagem para gerar o PDF.');
    return;
  }

  try {
    const pdfDoc = await PDFDocument.create();

    let bordaX = null;
    let bordaY = null;

    if (repeatBorder && repeatBorder !== "none") {
      const respX = await fetch(`/imagens/bordas/${repeatBorder}.png`);
      const bytesX = new Uint8Array(await respX.arrayBuffer());
      bordaX = await pdfDoc.embedPng(bytesX);

      const respY = await fetch(`/imagens/bordas/${repeatBorder}Y.png`);
      const bytesY = new Uint8Array(await respY.arrayBuffer());
      bordaY = await pdfDoc.embedPng(bytesY);
    }

    const CM_TO_POINTS = 28.3465;
    const margin = 0.5 * CM_TO_POINTS;
    const gap = 5;

    let pageWidth;
    let pageHeight;

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    pageWidth = orientacao === 'retrato' ? A4_WIDTH : A4_HEIGHT;
    pageHeight = orientacao === 'retrato' ? A4_HEIGHT : A4_WIDTH;

    const usableW = pageWidth - margin * 2;
    const usableH = pageHeight - margin * 2;

    let cols, rows, cellW, cellH;

    if (modoDimensionamento === "custom") {
      cellW = tamanhoCm.largura * CM_TO_POINTS;
      cellH = tamanhoCm.altura * CM_TO_POINTS;
      cols = Math.max(1, Math.floor((usableW + gap) / (cellW + gap)));
      rows = Math.max(1, Math.floor((usableH + gap) / (cellH + gap)));
    } else {
      cols = Math.max(ampliacao?.colunas || 1, 1);
      rows = Math.max(ampliacao?.linhas || 1, 1);
      cellW = (usableW - (cols - 1) * gap) / cols;
      cellH = (usableH - (rows - 1) * gap) / rows;
    }

    const slotsPerPage = cols * rows;
    const totalSlots = imagens.length;
    let page = null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const fixedBorderHeight = alturaBorda * CM_TO_POINTS / 10;
    const fixedBorderWidth = larguraBorda * CM_TO_POINTS / 10;
    const totalBorderW = bordaY ? fixedBorderWidth * 2 : 0;
    const totalBorderH = bordaX ? fixedBorderHeight * 2 : 0;

    let headerFont = null;
    if (cabecalhoTexto && cabecalhoAtivo) {
      headerFont = await pdfDoc.embedFont(StandardFonts.Courier);
    }

    let headerImageEmbedded = null;

    if (cabecalhoImagem && (cabecalhoTipo === "imagem" || cabecalhoTipo === "ambos" || cabecalhoTipo === "banner")) {
      const imageBytes = await fetch(cabecalhoImagem).then(res => res.arrayBuffer());
      try {
        headerImageEmbedded = await pdfDoc.embedPng(imageBytes);
      } catch {
        headerImageEmbedded = await pdfDoc.embedJpg(imageBytes);
      }
    }

    let cabecalhoAltura = 0;

    // Altura do Cabeçalho ou imagem
    if (cabecalhoAtivo) {
      // Modificado de 80 para 90 pontos para garantir mais de 3cm de altura mínima disponível
      if (cabecalhoTipo === "imagem" || cabecalhoTipo === "ambos" || cabecalhoTipo === "banner") {
        cabecalhoAltura = 100;
      } else {
        const linhasCab = Array.isArray(cabecalhoTexto)
          ? cabecalhoTexto.filter(t => t.trim()).length
          : String(cabecalhoTexto).split("\n").filter(t => t.trim()).length;

        const fontSizeCab = 12;
        const lineHeight = 15;
        const paddingVertical = 15;

        cabecalhoAltura = (linhasCab * lineHeight) + paddingVertical;
      }
    }

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const totalLoop = (modoDimensionamento === 'grid') ? totalSlots : slotsPerPage;

    for (let i = 0; i < totalLoop; i++) {
      const slotIndexInPage = i % slotsPerPage;
      const col = slotIndexInPage % cols;
      const row = Math.floor(slotIndexInPage / cols);

      if (!page || slotIndexInPage === 0) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
      }

      const pageIndex = slotIndexInPage;
      const isOddPage = (pageIndex % 2) === 0;
      const isEvenPage = (pageIndex % 2) !== 0;

      const currentPageIndex = pdfDoc.getPageCount() - 1;
      let shouldDrawHeader = false;

      const temTexto = cabecalhoTexto?.some(t => t.trim() !== "");
      const temImagem = !!headerImageEmbedded;

      if (cabecalhoAtivo && (temTexto || temImagem)) {
        if (cabecalhoModo === "ambas") shouldDrawHeader = true;
        else if (cabecalhoModo === "impares" && isOddPage) shouldDrawHeader = true;
        else if (cabecalhoModo === "pares" && isEvenPage) shouldDrawHeader = true;
        else if (cabecalhoModo === "primeira_pagina" && slotIndexInPage === 0) shouldDrawHeader = true;
      }

      const item = imagens[i % imagens.length];
      const dataUrl = typeof item === "string" ? item : item.src;
      if (!dataUrl) continue;

      const img = new Image();
      const loadedImg = await new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.src = dataUrl;
      });

      canvas.width = loadedImg.width;
      canvas.height = loadedImg.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(loadedImg, 0, 0);

      // ==========================================
      // NOVO: Aplica filtro de nitidez leve (Sharpen)
      // ==========================================
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Passamos a imagem e o nível de nitidez (0.1 a 0.3 é o ideal para um "filtro leve")
        const sharpenedData = aplicarFiltroNitidez(imageData, ctx, 0.3, 240);
        ctx.putImageData(sharpenedData, 0, 0);
      } catch (e) {
        console.warn("Não foi possível aplicar o filtro de nitidez (talvez CORS):", e);
      }
      // ==========================================

      const precisaCortar = precisaCortarMargemBranca(ctx, canvas.width, canvas.height);
      let finalCanvas = canvas;

      if (precisaCortar) {
        const { left, top, cropWidth, cropHeight } = cortarMargemBranca(ctx, canvas.width, canvas.height);
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");

        tempCanvas.width = cropWidth;
        tempCanvas.height = cropHeight;
        tempCtx.drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        finalCanvas = tempCanvas;
      }

      const rotatedDataUrl = finalCanvas.toDataURL("image/jpeg", 1);
      const base64 = rotatedDataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const embeddedImg = await pdfDoc.embedJpg(bytes);

      const embeddedW = embeddedImg.width || 1;
      const embeddedH = embeddedImg.height || 1;

      const topStartY = pageHeight - margin;
      const cellLeftX = margin + col * (cellW + gap);
      const cellBottomY = topStartY - (row + 1) * cellH - row * gap;

      const temCabecalho = shouldDrawHeader && cabecalhoAltura > 0;
      const gapHcabecalho = 5;

      const availableW = Math.max(1, cellW - totalBorderW);

      const availableH = Math.max(1, cellH - totalBorderH - (temCabecalho ? (cabecalhoAltura + gapHcabecalho) : 0));

      let drawW, drawH, drawX, drawY;

      const eColunaEsquerda = (cellLeftX <= margin + 1);
      const eColunaDireita = (cellLeftX + cellW >= pageWidth - margin - 1);

      let ajustedAvailableW = availableW;
      let ajustedDrawX = cellLeftX + (totalBorderW / 2);

      // if (aspecto) {
      //   const scaleW = embeddedW > 0 ? ajustedAvailableW / embeddedW : 1;
      //   const scaleH = embeddedH > 0 ? availableH / embeddedH : 1;
      //   const scale = Math.min(scaleW, scaleH, 1.0);

      //   drawW = embeddedW * scale;
      //   drawH = embeddedH * scale;
      //   drawX = ajustedDrawX + (ajustedAvailableW - drawW) / 2;
      //   drawY = cellBottomY + (cellH - drawH) / 2 - (temCabecalho ? (cabecalhoAltura + gapHcabecalho) / 2 : 0);
      // } else {
      //   drawW = ajustedAvailableW;
      //   drawH = availableH;
      //   drawX = ajustedDrawX;
      //   drawY = cellBottomY + totalBorderH / 2 - (gapHcabecalho / 2);
      // }
      // ======================================================
      // CÁLCULO DE DIMENSÃO DA IMAGEM (CORRIGIDO)
      // ======================================================
      if (aspecto) {
        // Mudança chave: A largura alvo é SEMPRE a largura máxima disponível da célula
        drawW = ajustedAvailableW;

        // Calcula a altura proporcional baseada na largura que definimos
        const proporcaoImagem = embeddedH / embeddedW;
        drawH = drawW * proporcaoImagem;

        // Se a altura proporcional for maior que a altura disponível (estourar a página para baixo),
        // aí sim recalculamos baseando-se na altura máxima para não cortar o PDF.
        if (drawH > availableH) {
          drawH = availableH;
          drawW = drawH / proporcaoImagem;
        }

        // X original (ajustado com as bordas)
        drawX = ajustedDrawX;

        // O Y agora posiciona a imagem exatamente abaixo do cabeçalho
        // Se o cabeçalho estiver ativo, o topo da imagem começa logo abaixo dele
        const topoDisponivel = cellBottomY + cellH - (temCabecalho ? (cabecalhoAltura + gapHcabecalho) : 0);
        drawY = topoDisponivel - drawH;

      } else {
        // Modo sem aspecto (Preencher tudo / Esticar)
        drawW = ajustedAvailableW;
        drawH = availableH;
        drawX = ajustedDrawX;
        drawY = cellBottomY + totalBorderH / 2 - (gapHcabecalho / 2);
      }


      page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });

      if (bordaX) {
        const larguraAlvo = (cabecalhoModo === "primeira_pagina") ? cellW : drawW;
        const xInicial = (cabecalhoModo === "primeira_pagina") ? cellLeftX : drawX;

        const tileWidth = bordaX.width || 1;
        const tilesX = Math.max(1, Math.ceil(larguraAlvo / tileWidth));
        const scaleX = Math.max(0.01, larguraAlvo / (tilesX * tileWidth));

        const yTopo = cellBottomY + cellH - fixedBorderHeight;
        const yBase = cellBottomY;

        for (let x = 0; x < tilesX; x++) {
          const tileX = xInicial + x * tileWidth * scaleX;
          page.drawImage(bordaX, { x: tileX, y: yTopo, width: tileWidth * scaleX, height: fixedBorderHeight });
          page.drawImage(bordaX, { x: tileX, y: yBase, width: tileWidth * scaleX, height: fixedBorderHeight });
        }
      }

      if (bordaY) {
        const tileHeight = bordaY.height || 1;
        const tilesY = Math.max(1, Math.ceil(cellH / tileHeight));
        const scaleY = Math.max(0.01, cellH / (tilesY * tileHeight));

        const éColunaEsquerda = (cellLeftX <= margin + 1);
        const éColunaDireita = (cellLeftX + cellW >= pageWidth - margin - 1);

        for (let yi = 0; yi < tilesY; yi++) {
          const tileY = cellBottomY + yi * tileHeight * scaleY;

          if (cabecalhoModo === "primeira_pagina") {
            if (éColunaEsquerda) {
              page.drawImage(bordaY, { x: cellLeftX, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
            }
            if (éColunaDireita) {
              page.drawImage(bordaY, { x: cellLeftX + cellW - fixedBorderWidth, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
            }
          } else {
            page.drawImage(bordaY, { x: cellLeftX, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
            page.drawImage(bordaY, { x: cellLeftX + cellW - fixedBorderWidth, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
          }
        }
      }

      // ======================================================
      // CABEÇALHO
      // ======================================================
      if (shouldDrawHeader) {
        const isModoFull = cabecalhoModo === "primeira_pagina";

        const HEADER_PADDING_X = 0;
        const HEADER_PADDING_Y = 0;
        const GAP_IMAGEM_TEXTO = 8;
        const GAP_IMAGEM_BORDA = 5;
        const GAP_TEXTO_BORDA = 5;

        const bordaEsquerda = (!isModoFull && bordaY) ? fixedBorderWidth : 0;
        const bordaTopo = (!isModoFull && bordaX) ? fixedBorderHeight : 0;

        const headerBox = {
          x: (isModoFull ? margin : cellLeftX) + bordaEsquerda,
          y: (isModoFull ? pageHeight - margin : cellBottomY + cellH) - bordaTopo,
          width: (isModoFull ? usableW : cellW) - (bordaEsquerda * 2),
          height: cabecalhoAltura
        };

        const contentX = headerBox.x + HEADER_PADDING_X;
        const contentY = headerBox.y - HEADER_PADDING_Y;
        const contentWidth = headerBox.width - (HEADER_PADDING_X * 2);
        const contentHeight = headerBox.height - (HEADER_PADDING_Y * 2);

        let imageOffsetX = 0;

        // ======================================================
        // IMAGEM
        // ======================================================
        if (headerImageEmbedded) {
          const temTexto = cabecalhoTexto?.some(t => t.trim() !== "");
          const isBanner = cabecalhoTipo === 'banner';

          const imageAreaWidth = (isBanner || !temTexto ? contentWidth : contentWidth * 0.35) - (bordaY ? GAP_IMAGEM_BORDA * 2 : 0);
          const imageAreaHeight = contentHeight - (bordaX ? GAP_IMAGEM_BORDA * 2 : 0);

          const scale = Math.min(imageAreaWidth / headerImageEmbedded.width, imageAreaHeight / headerImageEmbedded.height);

          const imageWidth = headerImageEmbedded.width * scale;
          const imageHeight = headerImageEmbedded.height * scale;

          const imgX = isBanner
            ? contentX + ((contentWidth - imageWidth) / 2)
            : contentX + ((bordaY) ? GAP_IMAGEM_BORDA : 0);

          const imgY = contentY - ((contentHeight - imageHeight) / 2) - imageHeight - (bordaX ? GAP_IMAGEM_BORDA : 0);

          page.drawImage(
            headerImageEmbedded,
            {
              x: imgX,
              y: imgY,
              width: imageWidth,
              height: imageHeight
            }
          );

          if (temTexto && !isBanner) {
            imageOffsetX = imageWidth + GAP_IMAGEM_TEXTO;
          }
        }

        // ======================================================
        // TEXTO
        // ======================================================
        if (headerFont && cabecalhoTexto?.some(t => t.trim() !== "") && cabecalhoTipo !== "banner") {
          const textoX = contentX + imageOffsetX + ((bordaY) ? GAP_TEXTO_BORDA : 0);

          desenharCabecalhoNoPDF({
            page,
            textoLinhas: cabecalhoTexto,
            font: boldFont,
            alturaCabecalho: contentHeight,
            x: textoX,
            yTopoReferencia: contentY,
            larguraDisponivel: contentWidth - imageOffsetX,
            temBordaX: false,
            alturaBordaX: 0,
            temBordaY: false,
            larguraBordaY: 0,
            comBordaGrafica: cabecalhoBorder
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    setPdfUrl(url);
    setPaginaAtual(1);

    setPdfs(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      return [...currentList, { id: Date.now(), url }];
    });

  } catch (err) {
    console.error('Erro gerando PDF:', err);
    setErroPdf('Erro ao gerar o PDF no front-end.');
  } finally {
    console.log('Gerado com Sucesso!');
  }

  //   /**
  //  * Aplica um filtro de nitidez (Sharpening) leve em uma ImageData de Canvas
  //  * @param {ImageData} imageData Dados dos pixels do canvas
  //  * @param {CanvasRenderingContext2D} ctx Contexto do canvas
  //  * @param {number} mix Intensidade do efeito (ex: 0.2 para leve, 0.5 para forte)
  //  */
  //   function aplicarFiltroNitidez(imageData, ctx, mix = 0.2) {
  //     const w = imageData.width;
  //     const h = imageData.height;
  //     const src = imageData.data;
  //     const output = ctx.createImageData(w, h);
  //     const dst = output.data;

  //     // Matriz de Nitidez (Laplacian Kernel modificado)
  //     // [  0, -1,  0 ]
  //     // [ -1,  5, -1 ]
  //     // [  0, -1,  0 ]

  //     // Para evitar que as bordas quebrem, clonamos os pixels originais primeiro
  //     dst.set(src);

  //     // Varre os pixels internos (pulando a primeira e última linha/coluna)
  //     for (let y = 1; y < h - 1; y++) {
  //       for (let x = 1; x < w - 1; x++) {
  //         const idx = (y * w + x) * 4;

  //         // Índices dos pixels vizinhos (cima, baixo, esquerda, direita)
  //         const acima = ((y - 1) * w + x) * 4;
  //         const baixo = ((y + 1) * w + x) * 4;
  //         const esquerda = (y * w + (x - 1)) * 4;
  //         const direita = (y * w + (x + 1)) * 4;

  //         // Aplica o filtro separadamente para R, G e B
  //         for (let c = 0; c < 3; c++) {
  //           const pixelOriginal = src[idx + c];

  //           // Kernel de nitidez padrão
  //           const pixelNitido = (pixelOriginal * 5)
  //             - src[acima + c]
  //             - src[baixo + c]
  //             - src[esquerda + c]
  //             - src[direita + c];

  //           // Faz a mistura (mix) entre a imagem original e o filtro para ficar suave
  //           let valorFinal = pixelOriginal + (pixelNitido - pixelOriginal) * mix;

  //           // Garante que o valor fique entre 0 e 255
  //           dst[idx + c] = Math.min(255, Math.max(0, valorFinal));
  //         }
  //         // O canal Alpha (dst[idx + 3]) se mantém o original por conta do dst.set(src)
  //       }
  //     }
  //     return output;
  //   }
  /**
   * Aplica um filtro de nitidez apenas em áreas que não sejam brancas/claras
   * @param {ImageData} imageData Dados dos pixels do canvas
   * @param {CanvasRenderingContext2D} ctx Contexto do canvas
   * @param {number} mix Intensidade do efeito (0.2 a 0.3)
   * @param {number} limiarBranco Tons acima deste valor (0-255) não serão tocados
   */
  function aplicarFiltroNitidez(imageData, ctx, mix = 0.3, limiarBranco = 235) {
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const output = ctx.createImageData(w, h);
    const dst = output.data;

    // Clonamos os pixels originais para a saída
    dst.set(src);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;

        const r = src[idx];
        const g = src[idx + 1];
        const b = src[idx + 2];

        // Calcula a luminosidade/média simples do pixel atual
        const brilho = (r + g + b) / 3;

        // SE O PIXEL FOR MUITO CLARO (perto do branco), pula o filtro
        // Isso impede que o fundo branco ganhe granulação
        if (brilho > limiarBranco) {
          continue;
        }

        const acima = ((y - 1) * w + x) * 4;
        const baixo = ((y + 1) * w + x) * 4;
        const esquerda = (y * w + (x - 1)) * 4;
        const direita = (y * w + (x + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const pixelOriginal = src[idx + c];

          const pixelNitido = (pixelOriginal * 5)
            - src[acima + c]
            - src[baixo + c]
            - src[esquerda + c]
            - src[direita + c];

          let valorFinal = pixelOriginal + (pixelNitido - pixelOriginal) * mix;

          dst[idx + c] = Math.min(255, Math.max(0, valorFinal));
        }
      }
    }
    return output;
  }

  //

};