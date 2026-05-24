// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// /**
//  * Função auxiliar para desenhar o cabeçalho em um slot específico
//  */
// const desenharCabecalhoNoPDF = (params) => {
//   const {
//     page,
//     textoLinhas,
//     font,
//     alturaCabecalho,
//     x,
//     yTopoReferencia, // cellBottomY + cellH
//     larguraDisponivel,
//     temBordaX,
//     alturaBordaX,
//     temBordaY,
//     larguraBordaY,
//     comBordaGrafica
//   } = params;

//   const fontSizeCab = 12;
//   const lineHeight = 15;

//   /*
//    * Padding INTERNO do retângulo do cabeçalho.
//    *
//    * Só usado quando existe borda gráfica.
//    *
//    * Isso evita:
//    * - texto encostar na borda
//    * - imagem encostar na borda
//    * - fundo cobrir conteúdo
//    */
//   const RECT_PADDING_X = comBordaGrafica ? 5 : 0;
//   const RECT_PADDING_Y = comBordaGrafica ? 5 : 0;

//   /*
//    * Espaçamento interno do texto
//    */
//   const paddingTextoX = 5;

//   /*
//    * Topo real da área
//    */
//   const cellTop = yTopoReferencia - (temBordaX ? alturaBordaX : 0);

//   /*
//    * Área desenhada do retângulo
//    *
//    * Agora respeita padding
//    */
//   const rectX = x + RECT_PADDING_X;

//   const rectY = cellTop - alturaCabecalho + RECT_PADDING_Y;

//   const rectWidth = larguraDisponivel - (RECT_PADDING_X * 3);

//   const rectHeight = alturaCabecalho - (RECT_PADDING_Y * 2);

//   /*
//    * Borda do cabeçalho
//    */
//   if (comBordaGrafica) {
//     page.drawRectangle({
//       x: rectX,
//       y: rectY,
//       width: rectWidth,
//       height: rectHeight,

//       borderWidth: 0.8,

//       borderColor: rgb(
//         0.6,
//         0.6,
//         0.6
//       ),

//       color: rgb(
//         0.98,
//         0.98,
//         0.98
//       ),
//     });
//   }

//   /*
//    * Texto respeita o mesmo padding
//    */
//   textoLinhas.forEach((linha, idx) => {

//     const yTexto = cellTop - RECT_PADDING_Y - lineHeight * (idx + 1) - 2;

//     page.drawText(linha, {
//       x: rectX + paddingTextoX,

//       y: yTexto,
//       size: fontSizeCab,
//       font,

//       color:
//         rgb(
//           0.2,
//           0.2,
//           0.2
//         )
//     });

//   });
// };

// const precisaCortarMargemBranca = (ctx, width, height, threshold = 240, tolerancia = 0.98) => {
//   const { data } = ctx.getImageData(0, 0, width, height);

//   const isWhite = (r, g, b) => r > threshold && g > threshold && b > threshold;

//   const checkLinha = (y) => {
//     let whitePixels = 0;
//     for (let x = 0; x < width; x++) {
//       const i = (y * width + x) * 4;
//       if (isWhite(data[i], data[i + 1], data[i + 2])) whitePixels++;
//     }
//     return whitePixels / width;
//   };

//   const checkColuna = (x) => {
//     let whitePixels = 0;
//     for (let y = 0; y < height; y++) {
//       const i = (y * width + x) * 4;
//       if (isWhite(data[i], data[i + 1], data[i + 2])) whitePixels++;
//     }
//     return whitePixels / height;
//   };

//   // testa bordas
//   const topo = checkLinha(0);
//   const base = checkLinha(height - 1);
//   const esquerda = checkColuna(0);
//   const direita = checkColuna(width - 1);

//   return (
//     topo > tolerancia ||
//     base > tolerancia ||
//     esquerda > tolerancia ||
//     direita > tolerancia
//   );
// };

// const cortarMargemBranca = (ctx, width, height, threshold = 240) => {
//   const { data } = ctx.getImageData(0, 0, width, height);

//   const isWhite = (r, g, b) => r > threshold && g > threshold && b > threshold;

//   let top = 0, bottom = height, left = 0, right = width;

//   // topo
//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       const i = (y * width + x) * 4;
//       if (!isWhite(data[i], data[i + 1], data[i + 2])) {
//         top = y;
//         y = height;
//         break;
//       }
//     }
//   }

//   // base
//   for (let y = height - 1; y >= 0; y--) {
//     for (let x = 0; x < width; x++) {
//       const i = (y * width + x) * 4;
//       if (!isWhite(data[i], data[i + 1], data[i + 2])) {
//         bottom = y;
//         y = -1;
//         break;
//       }
//     }
//   }

//   // esquerda
//   for (let x = 0; x < width; x++) {
//     for (let y = 0; y < height; y++) {
//       const i = (y * width + x) * 4;
//       if (!isWhite(data[i], data[i + 1], data[i + 2])) {
//         left = x;
//         x = width;
//         break;
//       }
//     }
//   }

//   // direita
//   for (let x = width - 1; x >= 0; x--) {
//     for (let y = 0; y < height; y++) {
//       const i = (y * width + x) * 4;
//       if (!isWhite(data[i], data[i + 1], data[i + 2])) {
//         right = x;
//         x = -1;
//         break;
//       }
//     }
//   }

//   const cropWidth = right - left;
//   const cropHeight = bottom - top;

//   return { left, top, cropWidth, cropHeight };
// };

// /**
//  * Serviço de geração de PDF
//  * 
//  */
// export const gerarPDFService = async (
//   imagens,
//   ampliacao,
//   orientacao,
//   aspecto,
//   setPdfUrl,
//   setPaginaAtual,
//   setAlteracoesPendentes,
//   setErroPdf,
//   repeatBorder = "none",
//   alturaBorda = 5,
//   larguraBorda = 5,
//   cabecalhoTexto = "",
//   cabecalhoAtivo = false,
//   cabecalhoModo = "ambas",
//   modoDimensionamento = "grid",
//   tamanhoCm = { largura: 29.7, altura: 21 },
//   cabecalhoBorder = false,
//   setPdfs,
//   cabecalhoTipo = "texto",
//   cabecalhoImagem = null,

// ) => {
//   if (!imagens || !imagens.some(Boolean)) {
//     alert('Nenhuma imagem para gerar o PDF.');
//     return;
//   }

//   try {

//     const pdfDoc = await PDFDocument.create();

//     // Carregar borda (se houver)
//     let bordaX = null;
//     let bordaY = null;

//     if (repeatBorder && repeatBorder !== "none") {
//       const respX = await fetch(`/imagens/bordas/${repeatBorder}.png`);
//       const bytesX = new Uint8Array(await respX.arrayBuffer());
//       bordaX = await pdfDoc.embedPng(bytesX);

//       const respY = await fetch(`/imagens/bordas/${repeatBorder}Y.png`);
//       const bytesY = new Uint8Array(await respY.arrayBuffer());
//       bordaY = await pdfDoc.embedPng(bytesY);
//     }

//     const CM_TO_POINTS = 28.3465;
//     const margin = 0.5 * CM_TO_POINTS;
//     const gap = 5;

//     let pageWidth;
//     let pageHeight;

//     // A4 padrão
//     const A4_WIDTH = 595.28;
//     const A4_HEIGHT = 841.89;

//     pageWidth = orientacao === 'retrato' ? A4_WIDTH : A4_HEIGHT;
//     pageHeight = orientacao === 'retrato' ? A4_HEIGHT : A4_WIDTH;

//     const usableW = pageWidth - margin * 2;
//     const usableH = pageHeight - margin * 2;

//     let cols, rows, cellW, cellH;

//     if (modoDimensionamento === "custom") {
//       // 🔥 tamanho fixo vindo do front
//       cellW = tamanhoCm.largura * CM_TO_POINTS;
//       cellH = tamanhoCm.altura * CM_TO_POINTS;

//       console.log('cellW: ' + cellW);
//       console.log('cellH: ' + cellH);

//       // 🔥 calcula quantos cabem na página
//       cols = Math.max(1, Math.floor((usableW + gap) / (cellW + gap)));
//       rows = Math.max(1, Math.floor((usableH + gap) / (cellH + gap)));

//       console.log('cols: ' + cols);
//       console.log('rows: ' + rows);

//     } else {
//       // 🔹 comportamento antigo (grid)
//       cols = Math.max(ampliacao?.colunas || 1, 1);
//       rows = Math.max(ampliacao?.linhas || 1, 1);

//       cellW = (usableW - (cols - 1) * gap) / cols;
//       cellH = (usableH - (rows - 1) * gap) / rows;
//     }

//     const slotsPerPage = cols * rows;
//     console.log('slotsPerPage: ' + slotsPerPage);

//     const totalSlots = imagens.length;
//     let page = null;
//     console.log('totalSlots: ' + totalSlots);

//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');

//     const fixedBorderHeight = alturaBorda * CM_TO_POINTS / 10;
//     const fixedBorderWidth = larguraBorda * CM_TO_POINTS / 10;
//     const totalBorderW = bordaY ? fixedBorderWidth * 2 : 0;
//     const totalBorderH = bordaX ? fixedBorderHeight * 2 : 0;

//     let headerFont = null;
//     if (cabecalhoTexto && cabecalhoAtivo) {
//       headerFont = await pdfDoc.embedFont(StandardFonts.Courier);
//     }

//     let headerImageEmbedded = null;

//     if (cabecalhoImagem && (cabecalhoTipo === "imagem" || cabecalhoTipo === "ambos" || cabecalhoTipo === "banner")) {

//       const imageBytes = await fetch(cabecalhoImagem)
//         .then(res => res.arrayBuffer());

//       try {
//         headerImageEmbedded = await pdfDoc.embedPng(imageBytes);
//       } catch {
//         headerImageEmbedded = await pdfDoc.embedJpg(imageBytes);
//       }
//     }

//     let cabecalhoAltura = 0;

//     //Altura do Cabeçalho ou imagem
//     if (cabecalhoAtivo) {

//       if (cabecalhoTipo === "imagem") {
//         cabecalhoAltura = 80;
//       }
//       else if (cabecalhoTipo === "ambos") {
//         cabecalhoAltura = 80;
//       } else {

//         const linhasCab = Array.isArray(cabecalhoTexto)
//           ? cabecalhoTexto.filter(t => t.trim()).length
//           : String(cabecalhoTexto)
//             .split("\n")
//             .filter(t => t.trim())
//             .length;

//         const fontSizeCab = 12;
//         const lineHeight = 15;
//         const paddingVertical = 15; //Distancia entre o texto e as imagens da célula

//         cabecalhoAltura = (linhasCab * lineHeight) + paddingVertical;
//       }
//     }

//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     const totalLoop = (modoDimensionamento === 'grid') ? totalSlots : slotsPerPage;

//     for (let i = 0; i < totalLoop; i++) {
//       const slotIndexInPage = i % slotsPerPage;
//       const col = slotIndexInPage % cols;
//       const row = Math.floor(slotIndexInPage / cols);

//       if (!page || slotIndexInPage === 0) {
//         page = pdfDoc.addPage([pageWidth, pageHeight]);
//       }

//       const pageIndex = slotIndexInPage;
//       const isOddPage = (pageIndex % 2) === 0;
//       const isEvenPage = (pageIndex % 2) !== 0;

//       // Primeiro, vamos identificar o índice real da página (não do slot)
//       const currentPageIndex = pdfDoc.getPageCount() - 1;

//       let shouldDrawHeader = false;

//       const temTexto = cabecalhoTexto?.some(t => t.trim() !== "");

//       const temImagem =
//         !!headerImageEmbedded;

//       if (cabecalhoAtivo && (temTexto || temImagem)) {

//         if (cabecalhoModo === "ambas")
//           shouldDrawHeader = true;

//         else if (
//           cabecalhoModo === "impares" &&
//           isOddPage
//         )
//           shouldDrawHeader = true;

//         else if (
//           cabecalhoModo === "pares" &&
//           isEvenPage
//         )
//           shouldDrawHeader = true;

//         else if (
//           cabecalhoModo === "primeira_pagina" &&
//           currentPageIndex === 0
//         )
//           shouldDrawHeader = true;
//       }


//       const item = imagens[i % imagens.length];

//       const dataUrl = typeof item === "string" ? item : item.src;
//       if (!dataUrl) continue;

//       const img = new Image();
//       const loadedImg = await new Promise((resolve) => {
//         img.onload = () => resolve(img);
//         img.src = dataUrl;
//       });

//       // desenha imagem original
//       canvas.width = loadedImg.width;
//       canvas.height = loadedImg.height;
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       ctx.drawImage(loadedImg, 0, 0);

//       // 🔎 verifica se precisa cortar
//       const precisaCortar = precisaCortarMargemBranca(ctx, canvas.width, canvas.height);

//       let finalCanvas = canvas;

//       if (precisaCortar) {
//         const { left, top, cropWidth, cropHeight } =
//           cortarMargemBranca(ctx, canvas.width, canvas.height);

//         const tempCanvas = document.createElement("canvas");
//         const tempCtx = tempCanvas.getContext("2d");

//         tempCanvas.width = cropWidth;
//         tempCanvas.height = cropHeight;

//         tempCtx.drawImage(
//           canvas,
//           left,
//           top,
//           cropWidth,
//           cropHeight,
//           0,
//           0,
//           cropWidth,
//           cropHeight
//         );

//         finalCanvas = tempCanvas;
//       }

//       const rotatedDataUrl = finalCanvas.toDataURL("image/jpeg", 1);
//       const base64 = rotatedDataUrl.split(",")[1];
//       const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
//       const embeddedImg = await pdfDoc.embedJpg(bytes);

//       const embeddedW = embeddedImg.width || 1;
//       const embeddedH = embeddedImg.height || 1;

//       const topStartY = pageHeight - margin;
//       const cellLeftX = margin + col * (cellW + gap);
//       const cellBottomY = topStartY - (row + 1) * cellH - row * gap;

//       const temCabecalho = shouldDrawHeader && cabecalhoAltura > 0;
//       const gapHcabecalho = temCabecalho ? 0 : 0;

//       const availableW = Math.max(1, cellW - totalBorderW);
//       const availableH = Math.max(1, cellH - totalBorderH - (temCabecalho ? (cabecalhoAltura + gapHcabecalho) : 0));

//       let drawW, drawH, drawX, drawY;

//       // Identificar se a célula está nas extremidades
//       const eColunaEsquerda = (cellLeftX <= margin + 1);
//       const eColunaDireita = (cellLeftX + cellW >= pageWidth - margin - 1);

//       let ajustedAvailableW = availableW;
//       let ajustedDrawX = cellLeftX + (totalBorderW / 2);


//       if (aspecto) {

//         const scaleW = embeddedW > 0 ? ajustedAvailableW / embeddedW : 1;
//         const scaleH = embeddedH > 0 ? availableH / embeddedH : 1;
//         const scale = Math.min(scaleW, scaleH, 1.0);

//         drawW = embeddedW * scale;
//         drawH = embeddedH * scale;
//         drawX = ajustedDrawX + (ajustedAvailableW - drawW) / 2;
//         drawY = cellBottomY + (cellH - drawH) / 2 - (temCabecalho ? (cabecalhoAltura + gapHcabecalho) / 2 : 0);

//       } else {
//         drawW = ajustedAvailableW;
//         drawH = availableH;
//         drawX = ajustedDrawX;
//         drawY = cellBottomY + totalBorderH / 2 - (gapHcabecalho / 2);
//       }

//       page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });

//       if (bordaX) {
//         const larguraAlvo = (cabecalhoModo === "primeira_pagina") ? cellW : drawW;
//         const xInicial = (cabecalhoModo === "primeira_pagina") ? cellLeftX : drawX;

//         const tileWidth = bordaX.width || 1;
//         const tilesX = Math.max(1, Math.ceil(larguraAlvo / tileWidth));
//         const scaleX = Math.max(0.01, larguraAlvo / (tilesX * tileWidth));

//         const yTopo = cellBottomY + cellH - fixedBorderHeight;
//         const yBase = cellBottomY;

//         for (let x = 0; x < tilesX; x++) {
//           const tileX = xInicial + x * tileWidth * scaleX;
//           page.drawImage(bordaX, { x: tileX, y: yTopo, width: tileWidth * scaleX, height: fixedBorderHeight });
//           page.drawImage(bordaX, { x: tileX, y: yBase, width: tileWidth * scaleX, height: fixedBorderHeight });
//         }
//       }

//       if (bordaY) {
//         const tileHeight = bordaY.height || 1;
//         const tilesY = Math.max(1, Math.ceil(cellH / tileHeight));
//         const scaleY = Math.max(0.01, cellH / (tilesY * tileHeight));

//         // Verificações de posição (Exemplo: se você souber o index da célula ou a posição X)
//         const éColunaEsquerda = (cellLeftX <= margin + 1); // +1 de tolerância
//         const éColunaDireita = (cellLeftX + cellW >= pageWidth - margin - 1);

//         for (let yi = 0; yi < tilesY; yi++) {
//           const tileY = cellBottomY + yi * tileHeight * scaleY;

//           if (cabecalhoModo === "primeira_pagina") {
//             // No modo full, só desenha se for a extremidade da página
//             if (éColunaEsquerda) {
//               page.drawImage(bordaY, { x: cellLeftX, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
//             }
//             if (éColunaDireita) {
//               page.drawImage(bordaY, { x: cellLeftX + cellW - fixedBorderWidth, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
//             }
//           } else {
//             // Modo normal: desenha ambos os lados de cada célula (comportamento original)
//             page.drawImage(bordaY, { x: cellLeftX, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
//             page.drawImage(bordaY, { x: cellLeftX + cellW - fixedBorderWidth, y: tileY, width: fixedBorderWidth, height: tileHeight * scaleY });
//           }
//         }
//       }


//       // ======================================================
//       // CABEÇALHO
//       // ======================================================
//       if (shouldDrawHeader) {

//         const isModoFull = cabecalhoModo === "primeira_pagina";

//         /*
//          * PASSO 1
//          * Define espaçamentos internos do cabeçalho
//          *
//          * Isso evita cálculos espalhados.
//          */
//         const HEADER_PADDING_X = 0;
//         const HEADER_PADDING_Y = 0;
//         const GAP_IMAGEM_TEXTO = 8;
//         const GAP_IMAGEM_BORDA = 5;
//         const GAP_TEXTO_BORDA = 5;

//         /*
//          * PASSO 2
//          * Calcula quanto a borda ocupa
//          */
//         const bordaEsquerda =
//           (!isModoFull && bordaY)
//             ? fixedBorderWidth
//             : 0;

//         const bordaTopo =
//           (!isModoFull && bordaX)
//             ? fixedBorderHeight
//             : 0;

//         /*
//          * PASSO 3
//          * Define a CAIXA REAL do cabeçalho
//          *
//          * Essa caixa será referência para:
//          * - imagem
//          * - texto
//          * - borda
//          */
//         const headerBox = {
//           x:
//             (isModoFull ? margin : cellLeftX)
//             + bordaEsquerda,

//           y:
//             (isModoFull
//               ? pageHeight - margin
//               : cellBottomY + cellH)
//             - bordaTopo,

//           width:
//             (isModoFull
//               ? usableW
//               : cellW)
//             - (bordaEsquerda * 2),

//           height:
//             cabecalhoAltura
//         };

//         /*
//          * PASSO 4
//          * Área útil interna
//          */
//         const contentX =
//           headerBox.x +
//           HEADER_PADDING_X;

//         const contentY =
//           headerBox.y -
//           HEADER_PADDING_Y;

//         const contentWidth =
//           headerBox.width -
//           (HEADER_PADDING_X * 2);

//         const contentHeight =
//           headerBox.height -
//           (HEADER_PADDING_Y * 2);

//         /*
//          * Espaço reservado para imagem
//          */
//         let imageOffsetX = 0;

//         // ======================================================
//         // IMAGEM
//         // ======================================================

//         if (headerImageEmbedded) {

//           const temTexto =
//             cabecalhoTexto?.some(
//               t => t.trim() !== ""
//             );


//           // /*
//           //  * imagem ocupa 35%
//           //  */
//           // const imageAreaWidth = (temTexto ? contentWidth * 0.35 : contentWidth) - (bordaY ? GAP_IMAGEM_BORDA * 2 : 0);

//           // /*
//           //  * altura disponível
//           //  */
//           // const imageAreaHeight = contentHeight - (bordaX ? GAP_IMAGEM_BORDA * 2 : 0);

//           // /*
//           //  * escala proporcional
//           //  */
//           // const scale = Math.min(imageAreaWidth / headerImageEmbedded.width, imageAreaHeight / headerImageEmbedded.height);

//           // const imageWidth = headerImageEmbedded.width * scale;
//           // const imageHeight = headerImageEmbedded.height * scale;

//           // /*
//           //  * centralização vertical REAL
//           //  */
//           // const imgX = contentX + ((bordaY) ? GAP_IMAGEM_BORDA : 0);

//           // const imgY = contentY - ((contentHeight - imageHeight) / 2) - imageHeight - (bordaX ? GAP_IMAGEM_BORDA : 0);

//           // page.drawImage(
//           //   headerImageEmbedded,
//           //   {
//           //     x: imgX,
//           //     y: imgY,
//           //     width: imageWidth,
//           //     height: imageHeight
//           //   }
//           // );
//           /*
//                      * Define se é o modo banner baseado no tipo do cabeçalho
//                      */
//           const isBanner = cabecalhoTipo === 'banner';

//           /*
//            * imagem ocupa 35% se houver texto, ou 100% (contentWidth) se não houver texto ou se for banner
//            */
//           const imageAreaWidth = (isBanner || !temTexto ? contentWidth : contentWidth * 0.35) - (bordaY ? GAP_IMAGEM_BORDA * 2 : 0);

//           /*
//            * altura disponível
//            */
//           const imageAreaHeight = contentHeight - (bordaX ? GAP_IMAGEM_BORDA * 2 : 0);

//           /*
//            * escala proporcional
//            */
//           const scale = Math.min(imageAreaWidth / headerImageEmbedded.width, imageAreaHeight / headerImageEmbedded.height);

//           const imageWidth = headerImageEmbedded.width * scale;
//           const imageHeight = headerImageEmbedded.height * scale;

//           /*
//            * centralização horizontal e vertical REAL
//            */
//           // Se for banner, centraliza a imagem na largura total. Se não, mantém o alinhamento à esquerda.
//           const imgX = isBanner
//             ? contentX + ((contentWidth - imageWidth) / 2)
//             : contentX + ((bordaY) ? GAP_IMAGEM_BORDA : 0);

//           const imgY = contentY - ((contentHeight - imageHeight) / 2) - imageHeight - (bordaX ? GAP_IMAGEM_BORDA : 0);

//           page.drawImage(
//             headerImageEmbedded,
//             {
//               x: imgX,
//               y: imgY,
//               width: imageWidth,
//               height: imageHeight
//             }
//           );
//           /*
//            * reserva espaço somente se houver texto
//            */
//           if (temTexto) {
//             imageOffsetX =
//               imageWidth +
//               GAP_IMAGEM_TEXTO;
//           }
//         }

//         // ======================================================
//         // TEXTO
//         // ======================================================

//         if (headerFont && cabecalhoTexto?.some(t => t.trim() !== "")) {

//           const textoX = contentX + imageOffsetX + ((bordaY) ? GAP_TEXTO_BORDA : 0);

//           desenharCabecalhoNoPDF({

//             page,

//             textoLinhas: cabecalhoTexto,
//             font: boldFont,
//             alturaCabecalho: contentHeight,

//             /*
//              * texto começa após imagem
//              */
//             x: textoX,

//             /*
//              * topo da caixa útil
//              */
//             yTopoReferencia: contentY,

//             /*
//             * largura restante
//             */
//             larguraDisponivel: contentWidth - imageOffsetX,

//             /*
//              * bordas já descontadas
//              */
//             temBordaX: false,
//             alturaBordaX: 0,
//             temBordaY: false,
//             larguraBordaY: 0,
//             comBordaGrafica: cabecalhoBorder

//           });
//         }
//       }
//     }



//     const pdfBytes = await pdfDoc.save();
//     const blob = new Blob([pdfBytes], { type: 'application/pdf' });
//     const url = URL.createObjectURL(blob);

//     setPdfUrl(url);
//     setPaginaAtual(1);

//     setPdfs(prev => {
//       const currentList = Array.isArray(prev) ? prev : [];
//       return [...currentList, { id: Date.now(), url }];
//     });

//   } catch (err) {
//     console.error('Erro gerando PDF:', err);
//     setErroPdf('Erro ao gerar o PDF no front-end.');
//   } finally {
//     console.error('Gerado com Sucesso!');
//   }
// };
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
        cabecalhoAltura = 90;
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
      const gapHcabecalho = 0;

      const availableW = Math.max(1, cellW - totalBorderW);

      const availableH = Math.max(1, cellH - totalBorderH - (temCabecalho ? (cabecalhoAltura + gapHcabecalho) : 0));

      let drawW, drawH, drawX, drawY;

      const eColunaEsquerda = (cellLeftX <= margin + 1);
      const eColunaDireita = (cellLeftX + cellW >= pageWidth - margin - 1);

      let ajustedAvailableW = availableW;
      let ajustedDrawX = cellLeftX + (totalBorderW / 2);

      if (aspecto) {
        const scaleW = embeddedW > 0 ? ajustedAvailableW / embeddedW : 1;
        const scaleH = embeddedH > 0 ? availableH / embeddedH : 1;
        const scale = Math.min(scaleW, scaleH, 1.0);

        drawW = embeddedW * scale;
        drawH = embeddedH * scale;
        drawX = ajustedDrawX + (ajustedAvailableW - drawW) / 2;
        drawY = cellBottomY + (cellH - drawH) / 2 - (temCabecalho ? (cabecalhoAltura + gapHcabecalho) / 2 : 0);
      } else {
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
};