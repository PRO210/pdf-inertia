import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

      let shouldDrawHeader = false;
      if (cabecalhoAtivo && cabecalhoTexto && cabecalhoTexto.some(t => t.trim() !== "")) {
        if (cabecalhoModo === "ambas") shouldDrawHeader = true;
        else if (cabecalhoModo === "impares" && isOddPage) shouldDrawHeader = true;
        else if (cabecalhoModo === "pares" && isEvenPage) shouldDrawHeader = true;
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

      const rotatedDataUrl = canvas.toDataURL("image/jpeg", 0.8);
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

      if (aspecto) {
        const scaleW = embeddedW > 0 ? availableW / embeddedW : 1;
        const scaleH = embeddedH > 0 ? availableH / embeddedH : 1;
        const scale = Math.min(scaleW, scaleH, 1.0);
        drawW = embeddedW * scale;
        drawH = embeddedH * scale;
        drawX = cellLeftX + (cellW - drawW) / 2;
        drawY = cellBottomY + (cellH - drawH) / 2 - (temCabecalho ? cabecalhoAltura / 2 : 0);
      } else {
        drawW = availableW;
        drawH = availableH;
        drawX = cellLeftX + totalBorderW / 2;
        drawY = cellBottomY + totalBorderH / 2;
      }

      page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });

      if (bordaX) {
        const tileWidth = bordaX.width || 1;
        const tilesX = Math.max(1, Math.ceil(drawW / tileWidth));
        const scaleX = Math.max(0.01, drawW / (tilesX * tileWidth));
        const yTopo = cellBottomY + cellH - fixedBorderHeight;
        const yBase = cellBottomY;

        for (let x = 0; x < tilesX; x++) {
          const tileX = drawX + x * tileWidth * scaleX;
          page.drawImage(bordaX, { x: tileX, y: yTopo, width: tileWidth * scaleX, height: fixedBorderHeight });
          page.drawImage(bordaX, { x: tileX, y: yBase, width: tileWidth * scaleX, height: fixedBorderHeight });
        }
      }

      if (bordaY) {
        const tileHeight = bordaY.height || 1;
        const tilesY = Math.max(1, Math.ceil(cellH / tileHeight));
        const scaleY = Math.max(0.01, cellH / (tilesY * tileHeight));

        for (let yi = 0; yi < tilesY; yi++) {
          const tileY = cellBottomY + yi * tileHeight * scaleY;
          page.drawImage(bordaY, { x: cellLeftX, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
          page.drawImage(bordaY, { x: cellLeftX + cellW - fixedBorderWidth, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
        }
      }

      if (shouldDrawHeader && headerFont) {
        const fontSizeCab = 12;
        const lineHeight = 15;
        const margemHorizontalRetangulo = 5;
        const paddingTextoX = 8;
        const cellTop = cellBottomY + cellH - (bordaX ? fixedBorderHeight : 0);
        const rectX = cellLeftX + (bordaY ? fixedBorderWidth : 0) + margemHorizontalRetangulo;
        const rectWidth = cellW - (bordaY ? fixedBorderWidth * 2 : 0) - (margemHorizontalRetangulo * 2);

        if (cabecalhoBorder) {
          page.drawRectangle({
            x: rectX,
            y: cellTop - cabecalhoAltura,
            width: rectWidth,
            height: cabecalhoAltura,
            borderWidth: 0.8,
            borderColor: rgb(0.6, 0.6, 0.6),
            color: rgb(0.98, 0.98, 0.98),
          });
        }

        cabecalhoTexto.forEach((linha, idx) => {
          const texto = linha;
          const y = cellTop - lineHeight * (idx + 1) - 2;
          page.drawText(texto, {
            x: rectX + paddingTextoX,
            y,
            size: fontSizeCab,
            font: boldFont,
            color: rgb(0.2, 0.2, 0.2),
          });
        });
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