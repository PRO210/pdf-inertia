/**
 * Gera o documento PDF com o grid (grade) e renderiza todas as imagens mascaradas
 * em múltiplas páginas, respeitando as dimensões e preenchendo as células vazias
 * da última página.
 * * Dependências externas:
 * - PDFDocument, rgb, pushGraphicsState, clip, endPath, popGraphicsState (do pdf-lib)
 * - Swal (para alertas)
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
      
      const totalImagens = imagensMask.length;
      
      if (!totalImagens) {
          pdfDoc.addPage(pageDimensions); // Adiciona pelo menos uma página vazia
          throw new Error("Nenhuma imagem para processar.");
      }

      const totalDePaginas = Math.ceil(totalImagens / totalCells);
      addResumo(`Total de imagens disponíveis: ${totalImagens}. Serão geradas ${totalDePaginas} página(s).`);

      // ==========================================================
      // 🚀 LOOP PRINCIPAL: RENDERIZAÇÃO DE MÚLTIPLAS PÁGINAS E IMAGENS
      // ==========================================================
      
      let paginaAtual = null;
      let imagemIndex = 0; // Índice que percorre o array 'imagensMask' sequencialmente

      // Loop externo: Percorre o número total de páginas necessárias
      for (let pageIndex = 0; pageIndex < totalDePaginas; pageIndex++) {
          
          // Adiciona e configura a nova página
          paginaAtual = pdfDoc.addPage(pageDimensions);
          
          // Desenha a borda externa da página
          paginaAtual.drawRectangle({
            x: margem, y: margem, width: drawW, height: drawH,
            borderWidth: 1, borderColor: rgb(1, 0, 0),
          });
          
          // Loop interno: Percorre as células desta página
          for (let i = 0; i < totalCells; i++) {
              
              const col = i % numCols;
              const row = Math.floor(i / numCols);
              const x = col * cellW + margem;
              const y = margem + (drawH - row * cellH - cellH);

              // --- 1. Lógica de Preenchimento / Fim das Imagens ---
              let isPlaceholder = imagemIndex >= totalImagens;
              
              if (isPlaceholder) {
                  // Desenha o placeholder (célula vazia)
                  paginaAtual.drawRectangle({
                      x, y, width: cellW, height: cellH,
                      borderWidth: 0.1, borderColor: rgb(0.7, 0.7, 0.7), // Cor clara para preenchimento
                  });
                  continue; // Pula para a próxima célula
              }
              
              // --- 2. Processa Imagem Real ---
              const imagemObj = imagensMask[imagemIndex]; // Pega a imagem sequencialmente
              
              // ** MUITO IMPORTANTE: Avança o índice da imagem para a próxima célula/página **
              imagemIndex++; 
              
              if (!imagemObj?.maskedBase64) {
                 // Trata erro se a imagem no índice for nula/inválida
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
      // Aqui pode haver um set de estado para indicar que a geração terminou

      // Rasterização para preview (se a função estiver disponível)
      rasterizarPdfParaBase64(url, 1, 150)
        .then((base64) => {
          setPdfImageBase64(base64);
        })

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

export { gerarPdfComGrid };