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
  const margemHorizontalRetangulo = 5;
  const paddingTextoX = 8;

  // Ajuste de coordenadas base
  const cellTop = yTopoReferencia - (temBordaX ? alturaBordaX : 0);
  const rectX = x + (temBordaY ? larguraBordaY : 0) + margemHorizontalRetangulo;
  const rectWidth = larguraDisponivel - (temBordaY ? larguraBordaY * 2 : 0) - (margemHorizontalRetangulo * 2);

  // Desenha o retângulo de fundo/borda do cabeçalho
  if (comBordaGrafica) {
    page.drawRectangle({
      x: rectX,
      y: cellTop - alturaCabecalho,
      width: rectWidth,
      height: alturaCabecalho,
      borderWidth: 0.8,
      borderColor: rgb(0.6, 0.6, 0.6),
      color: rgb(0.98, 0.98, 0.98),
    });
  }

  // Desenha cada linha de texto
  textoLinhas.forEach((linha, idx) => {
    const yTexto = cellTop - lineHeight * (idx + 1) - 2;
    page.drawText(linha, {
      x: rectX + paddingTextoX,
      y: yTexto,
      size: fontSizeCab,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });
};

/**
 * Serviço de geração de PDF
 * 
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
  tamanhoCm = { largura: 19.0, altura: 27.7 },
  cabecalhoBorder = false,
  setPdfs

) => {
  if (!imagens || !imagens.some(Boolean)) {
    alert('Nenhuma imagem para gerar o PDF.');
    return;
  }

  try {

    const pdfDoc = await PDFDocument.create();

    // Carregar borda (se houver)
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

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const pageWidth = orientacao === 'retrato' ? A4_WIDTH : A4_HEIGHT;
    const pageHeight = orientacao === 'retrato' ? A4_HEIGHT : A4_WIDTH;

    const CM_TO_POINTS = 28.3465;
    const margin = 0.5 * CM_TO_POINTS;
    const gap = 3;

    const cols = Math.max(ampliacao?.colunas || 1, 1);
    const rows = Math.max(ampliacao?.linhas || 1, 1);
    const slotsPerPage = cols * rows;

    const usableW = pageWidth - margin * 2;
    const usableH = pageHeight - margin * 2;
    const cellW = (usableW - (cols - 1) * gap) / cols;
    const cellH = (usableH - (rows - 1) * gap) / rows;

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

    let cabecalhoAltura = 0;
    if (cabecalhoAtivo && cabecalhoTexto) {
      const linhasCab = cabecalhoTexto.length;
      if (linhasCab === 1) cabecalhoAltura = 20;
      else if (linhasCab === 2) cabecalhoAltura = 36;
      else if (linhasCab === 3) cabecalhoAltura = 52;
      else if (linhasCab === 4) cabecalhoAltura = 68;
      else if (linhasCab === 5) cabecalhoAltura = 84;
      else cabecalhoAltura = linhasCab * 16;
    }

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (let i = 0; i < totalSlots; i++) {
      const slotIndexInPage = i % slotsPerPage;
      const col = slotIndexInPage % cols;
      const row = Math.floor(slotIndexInPage / cols);

      if (!page || slotIndexInPage === 0) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
      }

      const pageIndex = slotIndexInPage;
      const isOddPage = (pageIndex % 2) === 0;
      const isEvenPage = (pageIndex % 2) !== 0;

      // Primeiro, vamos identificar o índice real da página (não do slot)
      const currentPageIndex = pdfDoc.getPageCount() - 1;

      let shouldDrawHeader = false;

      if (cabecalhoAtivo && cabecalhoTexto && cabecalhoTexto.some(t => t.trim() !== "")) {
        if (cabecalhoModo === "ambas") shouldDrawHeader = true;
        else if (cabecalhoModo === "impares" && isOddPage) shouldDrawHeader = true;
        else if (cabecalhoModo === "pares" && isEvenPage) shouldDrawHeader = true;
        else if (cabecalhoModo === "primeira_pagina" && currentPageIndex === 0) shouldDrawHeader = true;
      }

      const item = imagens[i];
      if (!item) continue;

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
      ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

      const rotatedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const base64 = rotatedDataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const embeddedImg = await pdfDoc.embedJpg(bytes);

      const embeddedW = embeddedImg.width || 1;
      const embeddedH = embeddedImg.height || 1;

      const topStartY = pageHeight - margin;
      const cellLeftX = margin + col * (cellW + gap);
      const cellBottomY = topStartY - (row + 1) * cellH - row * gap;
      const temCabecalho = shouldDrawHeader && cabecalhoAltura > 0;

      const availableW = Math.max(1, cellW - totalBorderW);
      const availableH = Math.max(1, cellH - totalBorderH - (temCabecalho ? cabecalhoAltura : 0));

      let drawW, drawH, drawX, drawY;

      // Identificar se a célula está nas extremidades
      const eColunaEsquerda = (cellLeftX <= margin + 1);
      const eColunaDireita = (cellLeftX + cellW >= pageWidth - margin - 1);

      let ajustedAvailableW = availableW;
      let ajustedDrawX = cellLeftX + (totalBorderW / 2);

      if (cabecalhoModo === "primeira_pagina") {

        const descontoEsquerda = eColunaEsquerda ? fixedBorderWidth : 0;
        const descontoDireita = eColunaDireita ? fixedBorderWidth : 0;

        ajustedAvailableW = cellW - (descontoEsquerda + descontoDireita);
        ajustedDrawX = cellLeftX + descontoEsquerda;
      }

      if (aspecto) {
        const scaleW = embeddedW > 0 ? ajustedAvailableW / embeddedW : 1;
        const scaleH = embeddedH > 0 ? availableH / embeddedH : 1;
        const scale = Math.min(scaleW, scaleH, 1.0);

        drawW = embeddedW * scale;
        drawH = embeddedH * scale;
        drawX = ajustedDrawX + (ajustedAvailableW - drawW) / 2;
        drawY = cellBottomY + (cellH - drawH) / 2 - (temCabecalho ? cabecalhoAltura / 2 : 0);
      } else {
        drawW = ajustedAvailableW;
        drawH = availableH;
        drawX = ajustedDrawX;
        drawY = cellBottomY + totalBorderH / 2;
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

        // Verificações de posição (Exemplo: se você souber o index da célula ou a posição X)
        const éColunaEsquerda = (cellLeftX <= margin + 1); // +1 de tolerância
        const éColunaDireita = (cellLeftX + cellW >= pageWidth - margin - 1);

        for (let yi = 0; yi < tilesY; yi++) {
          const tileY = cellBottomY + yi * tileHeight * scaleY;

          if (cabecalhoModo === "primeira_pagina") {
            // No modo full, só desenha se for a extremidade da página
            if (éColunaEsquerda) {
              page.drawImage(bordaY, { x: cellLeftX, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
            }
            if (éColunaDireita) {
              page.drawImage(bordaY, { x: cellLeftX + cellW - fixedBorderWidth, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
            }
          } else {
            // Modo normal: desenha ambos os lados de cada célula (comportamento original)
            page.drawImage(bordaY, { x: cellLeftX, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
            page.drawImage(bordaY, { x: cellLeftX + cellW - fixedBorderWidth, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
          }
        }
      }

      if (shouldDrawHeader && headerFont) {

        const isModoFull = cabecalhoModo === "primeira_pagina";

        // Cálculo do recuo lateral caso haja borda Y ativa
        const offsetLateral = (isModoFull && bordaY) ? fixedBorderWidth : 0;

        desenharCabecalhoNoPDF({
          page,
          textoLinhas: cabecalhoTexto,
          font: boldFont,
          alturaCabecalho: cabecalhoAltura,
          // Se for primeira página, começa na margem esquerda da folha, senão no X da célula
          x: isModoFull ? (margin + offsetLateral) : cellLeftX,
          yTopoReferencia: isModoFull
            ? (pageHeight - margin - (bordaX ? fixedBorderHeight : 0))
            : (cellBottomY + cellH),
          // Ajuste na largura: subtrai o offset lateral das duas pontas (esquerda e direita)
          larguraDisponivel: isModoFull ? (usableW - (offsetLateral * 2)) : cellW,
          temBordaX: isModoFull ? false : !!bordaX, // Na folha cheia, ignoramos borda do slot
          alturaBordaX: fixedBorderHeight,
          temBordaY: isModoFull ? false : !!bordaY, // Na folha cheia, ignoramos borda do slot
          larguraBordaY: fixedBorderWidth,
          comBordaGrafica: cabecalhoBorder
        })
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
    console.error('Gerado com Sucesso!');
  }
};