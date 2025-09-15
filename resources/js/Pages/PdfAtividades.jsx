import { useEffect, useRef, useState } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'

import * as pdfjsLib from 'pdfjs-dist'
import Footer from '@/Components/Footer'
import FullScreenSpinner from '@/Components/FullScreenSpinner'
import Spinner from '@/Components/Spinner'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'


// Função para gerar o PDF com pdf-lib
const gerarPDF = async (
  imagens,
  ampliacao,
  orientacao,
  aspecto,
  setCarregando,
  setPdfUrl,
  setPaginaAtual,
  setAlteracoesPendentes,
  setErroPdf,
  repeatBorder = "none",
  alturaBorda = 5,
  larguraBorda = 5,
  cabecalhoTexto = ""
) => {
  if (!imagens || !imagens.some(Boolean)) {
    alert('Nenhuma imagem para gerar o PDF.');
    return;
  }

  try {
    setCarregando(true);

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
    const gap = 6;

    const cols = Math.max(ampliacao?.colunas || 1, 1);
    const rows = Math.max(ampliacao?.linhas || 1, 1);
    const slotsPerPage = cols * rows;

    // espaço útil só com margens
    const usableW = pageWidth - margin * 2;
    const usableH = pageHeight - margin * 2;
    const cellW = (usableW - (cols - 1) * gap) / cols;
    const cellH = (usableH - (rows - 1) * gap) / rows;

    const totalSlots = imagens.length;
    let page = null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // bordas fixas em pontos
    const fixedBorderHeight = alturaBorda * CM_TO_POINTS / 10;
    const fixedBorderWidth = larguraBorda * CM_TO_POINTS / 10;
    const totalBorderW = bordaY ? fixedBorderWidth * 2 : 0;
    const totalBorderH = bordaX ? fixedBorderHeight * 2 : 0;


    //Cabeçalho
    // Header font (embed uma vez)
    let headerFont = null;
    if (cabecalhoTexto) {
      headerFont = await pdfDoc.embedFont(StandardFonts.Courier);
    }

    // Altura do cabeçalho baseada no número de linhas
    const linhasCab = cabecalhoTexto ? cabecalhoTexto.split("\n").length : 0;
    let cabecalhoAltura = 0;

    if (linhasCab === 1) {
      cabecalhoAltura = 20; // altura em pontos para 1 linha
    } else if (linhasCab === 2) {
      cabecalhoAltura = 36; // 18 por linha
    } else if (linhasCab === 3) {
      cabecalhoAltura = 52; // ~17.3 por linha
    } else if (linhasCab === 4) {
      cabecalhoAltura = 68; // 17 por linha
    } else if (linhasCab === 5) {
      cabecalhoAltura = 84;
    } else {
      // padrão caso mais de 5 linhas
      cabecalhoAltura = linhasCab * 16; // 16pt por linha
    }

    // Carregue a fonte em negrito apenas uma vez, fora do loop
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- loop de slots ---
    for (let i = 0; i < totalSlots; i++) {
      const slotIndexInPage = i % slotsPerPage;
      const col = slotIndexInPage % cols;
      const row = Math.floor(slotIndexInPage / cols);

      // criar página se necessário
      if (!page || slotIndexInPage === 0) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
      }

      const dataUrl = imagens[i];
      if (!dataUrl) continue;

      // carregar imagem -> canvas -> embedded
      const img = new Image();
      const loadedImg = await new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.src = dataUrl;
      });

      canvas.width = loadedImg.width;
      canvas.height = loadedImg.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

      const rotatedDataUrl = canvas.toDataURL('image/png');
      const base64 = rotatedDataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      let embeddedImg;
      if (/data:image\/png/i.test(rotatedDataUrl)) {
        embeddedImg = await pdfDoc.embedPng(bytes);
      } else {
        embeddedImg = await pdfDoc.embedJpg(bytes);
      }

      const embeddedW = embeddedImg.width || 1;
      const embeddedH = embeddedImg.height || 1;

      // topo da grade
      const topStartY = pageHeight - margin;
      const cellLeftX = margin + col * (cellW + gap);
      const cellBottomY = topStartY - (row + 1) * cellH - row * gap;

      // verifica se existe cabeçalho
      const temCabecalho = cabecalhoAltura > 0;

      // dimensionamento da imagem respeitando bordas e cabeçalho
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
        // estica sem manter proporção
        drawW = availableW;
        drawH = availableH;
        drawX = cellLeftX + totalBorderW / 2;
        drawY = cellBottomY + totalBorderH / 2 - (0);
      }


      // desenha imagem
      page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });

      // bordas horizontais
      if (bordaX) {
        const tileWidth = bordaX.width || 1;
        const tilesX = Math.max(1, Math.ceil(drawW / tileWidth));
        const scaleX = Math.max(0.01, drawW / (tilesX * tileWidth));

        // topo e base da célula (respeitando borda e margem)
        const yTopo = cellBottomY + cellH - fixedBorderHeight; // topo da célula
        const yBase = cellBottomY; // base da célula

        for (let x = 0; x < tilesX; x++) {
          const tileX = drawX + x * tileWidth * scaleX;
          page.drawImage(bordaX, {
            x: tileX,
            y: yTopo,
            width: tileWidth * scaleX,
            height: fixedBorderHeight,
          });
          page.drawImage(bordaX, {
            x: tileX,
            y: yBase,
            width: tileWidth * scaleX,
            height: fixedBorderHeight,
          });
        }
      }

      // bordas laterais
      if (bordaY) {
        const tileHeight = bordaY.height || 1;
        // usa a altura da célula inteira em vez da imagem
        const tilesY = Math.max(1, Math.ceil(cellH / tileHeight));
        const scaleY = Math.max(0.01, cellH / (tilesY * tileHeight));

        for (let yi = 0; yi < tilesY; yi++) {
          const tileY = cellBottomY + yi * tileHeight * scaleY;

          // borda esquerda
          page.drawImage(bordaY, {
            x: cellLeftX,
            y: tileY,
            width: fixedBorderWidth,
            height: tileHeight * scaleY,
          });

          // borda direita
          page.drawImage(bordaY, {
            x: cellLeftX + cellW - fixedBorderWidth,
            y: tileY,
            width: fixedBorderWidth,
            height: tileHeight * scaleY,
          });
        }
      }


      // --- desenhar cabeçalho ---
      // if (cabecalhoTexto && headerFont) {
      //   const fontSizeCab = 13;   // tamanho base
      //   const lineHeight = 16;    // altura de linha
      //   const leftMargin = 5 + fixedBorderWidth;    // margem esquerda
      //   const rightMargin = 5 + fixedBorderWidth;   // margem direita

      //   const cellTop = cellBottomY + cellH - (bordaX ? fixedBorderHeight : 0);
      //   const maxWidth = cellW - leftMargin - rightMargin;

      //   const linhas = cabecalhoTexto.split("\n");


      //   // Mapeia a fonte correta para cada linha
      //   linhas.forEach((linha, idx) => {
      //     let texto = linha.trim();
      //     let size = fontSizeCab;
      //     const fontToUse = boldFont; // Use a fonte negrita para o cálculo e o desenho

      //     // mede largura do texto na fonte correta
      //     let largura = fontToUse.widthOfTextAtSize(texto, size);

      //     // se for maior que a célula, ajusta o tamanho até caber
      //     if (largura > maxWidth) {
      //       const fator = maxWidth / largura;
      //       size = size * fator;
      //     }

      //     const y = cellTop - lineHeight * (idx + 1);

      //     page.drawText(texto, {
      //       x: cellLeftX + leftMargin,
      //       y,
      //       size,
      //       font: fontToUse, // Use a mesma fonte aqui
      //       color: rgb(0, 0, 0),
      //     });
      //   });
      // }

      // --- desenhar cabeçalho ---
      if (cabecalhoTexto && headerFont) {
        const fontSizeCab = 12;   // tamanho base
        const lineHeight = 16;    // altura de linha
        const leftMargin = 5 + fixedBorderWidth;    // margem esquerda
        const rightMargin = 5 + fixedBorderWidth;   // margem direita

        const cellTop = cellBottomY + cellH - (bordaX ? fixedBorderHeight : 0);
        const maxWidth = cellW - leftMargin - rightMargin;

        // Apenas garanta que cada linha é desenhada na posição correta.
        const linhas = cabecalhoTexto.split("\n");

        linhas.forEach((linha, idx) => {
          let texto = linha.trim();

          const y = cellTop - lineHeight * (idx + 1);

          page.drawText(texto, {
            x: cellLeftX + leftMargin,
            y,
            size: fontSizeCab, // use o tamanho base, sem ajustes
            font: boldFont,
            color: rgb(0, 0, 0),
          });
        });
      }
    } // fim loop

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    setPdfUrl(url);
    setPaginaAtual(1);
    setAlteracoesPendentes(false);
  } catch (err) {
    console.error('Erro gerando PDF:', err);
    setErroPdf('Erro ao gerar o PDF no front-end.');
  } finally {
    setCarregando(false);
  }
};





export default function PdfEditor() {
  const { props } = usePage()
  const user = props.auth.user

  const [pdfUrl, setPdfUrl] = useState(null)
  const [ampliacao, setAmpliacao] = useState({ colunas: 2, linhas: 1 })
  const [orientacao, setOrientacao] = useState('paisagem')
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false)
  const [erroPdf, setErroPdf] = useState(null)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [aspecto, setAspecto] = useState(false)

  const pdfContainerRef = useRef(null)
  const [carregando, setCarregando] = useState(false)

  // totalSlots recalculado a cada render
  const totalSlots = Math.max(ampliacao?.colunas || 1, 1) *
    Math.max((ampliacao?.linhas || ampliacao?.colunas || 1), 1);

  const [imagens, setImagens] = useState([]);
  const [repeatMode, setRepeatMode] = useState("all");

  const [repeatBorder, setBorder] = useState("none");
  const espessuraBorda = 150;   // grossura da moldura, em px
  const tamanhoTile = 150;    // tamanho do “azulejo” (escala do padrão)
  const [cabecalhoAtivo, setCabecalhoAtivo] = useState(false);
  const [cabecalhoTexto, setCabecalhoTexto] = useState("");


  const adicionarPrimeiraImagem = (novaImagem, modoRepeticao) => {
    setImagens((prev) => {
      const imagensExistentes = prev.filter(Boolean);
      const novaListaComImagem = [...imagensExistentes, novaImagem];

      // Agora, usamos o parâmetro 'modoRepeticao'
      if (modoRepeticao === "all") {
        const novoArrayRepetido = [];
        for (let i = 0; i < totalSlots; i++) {
          novoArrayRepetido.push(novaListaComImagem[i % novaListaComImagem.length]);
        }
        return novoArrayRepetido;
      } else {
        const novoArraySemRepetir = [...novaListaComImagem];
        while (novoArraySemRepetir.length < totalSlots) {
          novoArraySemRepetir.push(null);
        }
        return novoArraySemRepetir;
      }
    });
    setAlteracoesPendentes(true);
  };

  useEffect(() => {
    setImagens((prev) => {
      const imagensExistentes = prev.filter(Boolean);

      if (repeatMode === "all" && imagensExistentes.length > 0) {
        // Preenche repetindo
        const novoArray = [];
        for (let i = 0; i < totalSlots; i++) {
          novoArray.push(imagensExistentes[i % imagensExistentes.length]);
        }

        return novoArray;
      } else {
        // Não repetir: apenas mantém as primeiras imagens, completa com nulls
        const novoArray = [imagensExistentes[0] || null];

        while (novoArray.length < totalSlots) {
          novoArray.push(null);
        }
        if (novoArray.length > totalSlots) {
          novoArray.length = totalSlots;
        }

        return novoArray;
      }
    });

    setAlteracoesPendentes(true);
  }, [ampliacao.colunas, ampliacao.linhas, totalSlots, repeatMode, repeatBorder, cabecalhoAtivo, cabecalhoTexto]);


  const resetarConfiguracoes = () => {
    setPdfUrl(null)
    setAmpliacao({ colunas: 2, linhas: 1 })
    setOrientacao('paisagem')
    setAlteracoesPendentes(false)
    setErroPdf(null)
    setPaginaAtual(1)
    setZoom(1)
    setAspecto(false)
    setImagens([])
    setRepeatMode("all");
    setBorder("none");
    setCabecalhoAtivo(false);
    setCabecalhoTexto("");
  }


  // remover imagem de um slot (mantém o slot, apenas zera)
  const removerImagem = (index) => {
    setImagens((prev) => {
      const copia = [...prev];
      copia[index] = null;
      return copia;
    });
    setAlteracoesPendentes(true);
  }

  const downloadPDF = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = 'documento.pdf'
    a.click()
  }


  useEffect(() => {

    if (!pdfUrl) return;
    setErroPdf(null);

    const renderPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        const container = pdfContainerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const page = await pdf.getPage(paginaAtual);
        const viewport = page.getViewport({ scale: zoom });

        const canvas = document.createElement("canvas");
        canvas.classList.add("mb-4", "shadow-md", "border", "rounded");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext("2d");
        await page.render({ canvasContext: context, viewport }).promise;

        container.appendChild(canvas);
      } catch (error) {
        setErroPdf("Erro ao renderizar PDF.");
        console.error("Erro ao renderizar PDF com PDF.js:", error);
      }
    };

    renderPDF();
  }, [pdfUrl, paginaAtual, zoom]);


  return (
    <AuthenticatedLayout>
      <Head title="Editor" />
      {/* <div class="xs:bg-blue-700  sm:bg-gray-900  md:bg-red-600  lg:bg-blue-600 h-6 mx-8"></div> */}

      <div className="container mx-auto px-4">

        <div className="flex flex-col lg:flex-row items-start gap-4 min-h-screen">

          <div className="w-full lg:w-1/3 flex flex-col justify-start items-center" id="opcoes">
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

              <div className="w-full">
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

              {/* Ampliacao (colunas / linhas) - mantém igual */}
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

              {/* REpetir ou não as imagens */}
              <div className="w-full">
                <label className="block mb-1 pro-label text-center text-xl">Ativar Repetição:</label>
                <select
                  value={repeatMode}
                  onChange={(e) => setRepeatMode(e.target.value)}
                  className="px-2 w-full rounded-full pro-input"
                >
                  <option value="none">Não repetir</option>
                  <option value="all">Repetir em todas as páginas</option>
                </select>
              </div>

              {/* Bordas com imagens */}
              <div className="w-full">
                <label className="block mb-1 pro-label text-center text-xl">Bordas:</label>
                <select
                  value={repeatBorder}
                  onChange={(e) => setBorder(e.target.value)}
                  className="px-2 w-full rounded-full pro-input"
                >
                  <option value="none">Sem bordas</option>
                  <option value="coracao">Corações</option>
                  <option value="coracaoVazado">Corações (Vazado)</option>
                  <option value="abelhas">Abelhas</option>
                  <option value="lapis">Lápis</option>
                  <option value="baloes">Balões</option>
                  <option value="baloesVazado">Balões (Vazado)</option>
                  <option value="fogueira">Fogueirinha</option>
                </select>
              </div>

              {/* Cabeçalho */}
              <label className="flex items-center gap-2 pro-label text-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={cabecalhoAtivo}
                  onChange={(e) => setCabecalhoAtivo(e.target.checked)}
                />
                Mostrar cabeçalho
              </label>

              <div className="w-full">
                {cabecalhoAtivo && (
                  <textarea
                    value={cabecalhoTexto}
                    onChange={(e) => {
                      const valor = e.target.value;

                      // limite de caracteres por linha de acordo com orientação (bordas não fazem diferença aqui)
                      // Mantemos o original: sem borda: const maxPorLinha = orientacao === "paisagem" ? 60 : 42;
                      const maxPorLinha = orientacao === "paisagem" ? 58 : 40;

                      // força cada linha a não passar do limite
                      const ajustado = valor
                        .split("\n")
                        .map((linha) => linha.slice(0, maxPorLinha)) // corta extra
                        .join("\n");

                      setCabecalhoTexto(ajustado);
                    }}
                    rows={4}
                    className="w-full h-min[6rem] border rounded p-2 mt-2 pro-input resize-y overflow-hidden"
                    placeholder="Digite o texto do cabeçalho (pode usar quebras de linha)"
                  />
                )}

                {cabecalhoAtivo && (
                  <p className="text-gray-500 mt-1">
                    {/* A mensagem de máximo de caracteres é dinâmica com base na orientação, mas não em repeatBorder */}
                    Máximo de {orientacao === "paisagem" ? 58 : 40} caracteres por linha.
                    Use a tecla  {" \u23CE "}  para quebrar linhas.
                  </p>
                )}

              </div>


              <div className="flex flex-col gap-2 w-full">
                {user && (
                  <>
                    {/* Mostrar Aplicar alterações se houver imagens no array OU imagemBase64 (compatibilidade) */}
                    {(imagens.some(Boolean)) && alteracoesPendentes && (
                      <button
                        onClick={async () => {
                          setCarregando(true);

                          await gerarPDF(
                            imagens,
                            ampliacao,
                            orientacao,
                            aspecto,
                            setCarregando,
                            setPdfUrl,
                            setPaginaAtual,
                            setAlteracoesPendentes,
                            setErroPdf,
                            repeatBorder,
                            5,
                            5,
                            cabecalhoTexto
                          );

                          setCarregando(false);
                        }}
                        className={alteracoesPendentes ? "pro-btn-red" : "pro-btn-purple"}
                      >
                        Aplicar alterações
                      </button>
                    )}

                    {pdfUrl && !alteracoesPendentes && (
                      <button onClick={downloadPDF} className="pro-btn-green mt-2" disabled={!pdfUrl}>
                        Baixar PDF
                      </button>
                    )}

                    {carregando && (
                      <FullScreenSpinner />
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
          <div className="w-full lg:w-2/3 flex flex-col justify-center items-center " id="preview-column">
            <div className="flex flex-col items-center justify-center gap-4 w-full " id="preview">
              <div className="my-2" id="preview">

                <div className="mx-auto mb-4 p-2 rounded-2xl ">
                  <h1 className="sm:text-xl md:text-2xl text-center font-bold whitespace-nowrap">
                    Preview {" "}
                    <span>
                      {pdfUrl ? "do PDF" : "da Imagem"}
                    </span>
                  </h1>
                </div>

                <div
                  id="pdf-preview"
                  className="relative w-full rounded-lg mx-auto overflow-x-auto flex justify-center items-center p-4 bg-gray-100"
                >
                  {/* Moldura com 4 faixas */}
                  {repeatBorder !== "none" && (
                    <>
                      {/* Topo */}
                      <div
                        className="absolute left-0 right-0 top-0 pointer-events-none"
                        style={{
                          height: espessuraBorda,
                          backgroundImage: `url(/imagens/bordas/${repeatBorder}.png)`,
                          backgroundRepeat: "repeat-x",
                          backgroundSize: `${tamanhoTile}px auto`,
                          backgroundPosition: "top left",
                        }}
                      />
                      {/* Baixo */}
                      <div
                        className="absolute left-0 right-0 bottom-0 pointer-events-none"
                        style={{
                          height: espessuraBorda,
                          backgroundImage: `url(/imagens/bordas/${repeatBorder}.png)`,
                          backgroundRepeat: "repeat-x",
                          backgroundSize: `${tamanhoTile}px auto`,
                          backgroundPosition: "bottom left",
                        }}
                      />
                      {/* Esquerda */}
                      <div
                        className="absolute top-0 bottom-0 left-0 pointer-events-none"
                        style={{
                          width: espessuraBorda,
                          backgroundImage: `url(/imagens/bordas/${repeatBorder}Y.png)`,
                          backgroundRepeat: "repeat-y",
                          backgroundSize: `auto ${tamanhoTile}px`,
                          backgroundPosition: "top left",
                        }}
                      />
                      {/* Direita */}
                      <div
                        className="absolute top-0 bottom-0 right-0 pointer-events-none"
                        style={{
                          width: espessuraBorda,
                          backgroundImage: `url(/imagens/bordas/${repeatBorder}Y.png)`,
                          backgroundRepeat: "repeat-y",
                          backgroundSize: `auto ${tamanhoTile}px`,
                          backgroundPosition: "top right",
                        }}
                      />
                    </>
                  )}

                  <div
                    className={`mx-auto border bg-white rounded-lg
                      ${orientacao === "retrato" ? "aspect-[595/842]" : "aspect-[842/595]"}
                      w-full max-w-[842px]
                    `}
                    style={{
                      display: "grid",
                      gap: "0.5rem",
                      gridTemplateColumns: `repeat(${Math.max(ampliacao?.colunas || 1, 1)}, 1fr)`,
                      gridTemplateRows: `repeat(${Math.max((ampliacao?.linhas || ampliacao?.colunas || 1), 1)}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: totalSlots }).map((_, i) => {
                      const imgSrc = imagens[i] || null;

                      // return (
                      //   <div
                      //     key={i}
                      //     className="w-full h-full border-2 border-dashed rounded-md flex flex-col items-center justify-center text-xs text-gray-400 relative overflow-hidden"
                      //   >

                      //     {/* Cabeçalho dinâmico */}
                      //     {cabecalhoAtivo && (
                      //       <div
                      //         className="w-full text-start text-gray-700 text-sm p-2 m-2 "
                      //         style={{
                      //           minHeight: "10%",   // espaço fixo
                      //           display: "flex",
                      //           flexDirection: "column",
                      //           justifyContent: "center",
                      //           whiteSpace: "pre-wrap", // 🔑 preserva espaços e quebras
                      //           wordBreak: "break-word", // evita sumir pra fora da tela
                      //         }}
                      //       >
                      //         {cabecalhoTexto}
                      //       </div>
                      //     )}

                      //     {imgSrc ? (
                      //       <>
                      //         <img
                      //           src={imgSrc}
                      //           alt={`Imagem ${i + 1}`}
                      //           className={`w-full h-full rounded-md ${aspecto ? "object-contain" : "object-fill"
                      //             }`}
                      //         />
                      //         <p>{aspecto}</p>
                      //         <button
                      //           title="Remover imagem"
                      //           onClick={() => removerImagem(i)}
                      //           className="absolute top-2 right-2 z-20 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow text-xs"
                      //         >
                      //           Remover
                      //         </button>
                      //       </>
                      //     ) : (

                      //       <div className="flex flex-col items-center justify-center gap-2 px-2">
                      //         <p className='text-base sm:text-xl'>Envie imagem ou PDF :)</p>
                      //         <input
                      //           type="file"
                      //           accept="image/*,application/pdf"
                      //           onChange={(e) => {
                      //             const file = e.target.files[0];
                      //             if (!file) return;

                      //             if (file.type === "application/pdf") {
                      //               // 📄 Carregar PDF com pdfjsLib
                      //               const reader = new FileReader();
                      //               reader.onload = async () => {
                      //                 const typedArray = new Uint8Array(reader.result);
                      //                 try {
                      //                   const loadingTask = pdfjsLib.getDocument({ data: typedArray });
                      //                   const pdf = await loadingTask.promise;
                      //                   const page = await pdf.getPage(1); // primeira página
                      //                   const viewport = page.getViewport({ scale: 1.0 });

                      //                   const canvas = document.createElement("canvas");
                      //                   const context = canvas.getContext("2d");
                      //                   canvas.height = viewport.height;
                      //                   canvas.width = viewport.width;

                      //                   await page.render({ canvasContext: context, viewport }).promise;

                      //                   // Convertemos o canvas em base64 p/ tratar igual imagem
                      //                   const pdfPreviewImg = canvas.toDataURL("image/png");

                      //                   adicionarPrimeiraImagem(pdfPreviewImg, repeatMode);
                      //                   setImagens((prev) => {
                      //                     const novas = [...prev];
                      //                     novas[i] = pdfPreviewImg;
                      //                     return novas;
                      //                   });
                      //                   setAlteracoesPendentes(true);
                      //                 } catch (err) {
                      //                   console.error("Erro ao carregar PDF:", err);
                      //                 }
                      //               };
                      //               reader.readAsArrayBuffer(file);
                      //             } else if (file.type.startsWith("image/")) {
                      //               // 🖼️ Mantém sua lógica de imagem
                      //               const reader = new FileReader();
                      //               reader.onloadend = () => {
                      //                 adicionarPrimeiraImagem(reader.result, repeatMode);
                      //                 setImagens((prev) => {
                      //                   const novas = [...prev];
                      //                   novas[i] = reader.result;
                      //                   return novas;
                      //                 });
                      //                 setAlteracoesPendentes(true);
                      //               };
                      //               reader.readAsDataURL(file);
                      //             } else {
                      //               alert("Formato não suportado. Envie imagem ou PDF.");
                      //             }
                      //           }}
                      //           className="pro-btn-blue file:mr-4 file:py-2 file:px-4 
                      //             file:rounded-full file:border-0 file:text-sm 
                      //             file:font-semibold file:bg-blue-50 
                      //             file:text-blue-700 hover:file:bg-blue-100 
                      //             cursor-pointer"
                      //         />
                      //       </div>

                      //     )}
                      //   </div>
                      // );
                      return (
                        <div
                          key={i}
                          className="w-full h-full border-2 border-dashed rounded-md text-xs text-gray-400 relative overflow-hidden"
                        >

                          {/* Cabeçalho dinâmico */}
                          {cabecalhoAtivo && (
                            <div
                              className="w-full text-start text-gray-700 text-sm p-2  overflow-hidden"
                              style={{
                                minHeight: "10%", // espaço fixo
                                whiteSpace: "pre-wrap", // preserva espaços e quebras
                                wordBreak: "break-word", // evita sumir pra fora da tela
                              }}
                            >
                              {cabecalhoTexto}
                            </div>
                          )}

                          {/* Imagem ou PDF */}
                          {imgSrc ? (
                            <div className="relative w-full h-full">
                              <img
                                src={imgSrc}
                                alt={`Imagem ${i + 1}`}
                                className={`w-full h-full rounded-md ${aspecto ? "object-contain" : "object-fill"}`}
                              />
                              <p>{aspecto}</p>
                              <button
                                title="Remover imagem"
                                onClick={() => removerImagem(i)}
                                className="absolute top-2 right-2 z-20 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow text-xs"
                              >
                                Remover
                              </button>
                            </div>
                          ) : (
                            <div className="px-2 py-4 text-center">
                              <p className="text-base sm:text-xl">Envie imagem ou PDF :)</p>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;

                                  if (file.type === "application/pdf") {
                                    const reader = new FileReader();
                                    reader.onload = async () => {
                                      const typedArray = new Uint8Array(reader.result);
                                      try {
                                        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
                                        const pdf = await loadingTask.promise;
                                        const page = await pdf.getPage(1);
                                        const viewport = page.getViewport({ scale: 1.0 });

                                        const canvas = document.createElement("canvas");
                                        const context = canvas.getContext("2d");
                                        canvas.height = viewport.height;
                                        canvas.width = viewport.width;

                                        await page.render({ canvasContext: context, viewport }).promise;

                                        const pdfPreviewImg = canvas.toDataURL("image/png");

                                        adicionarPrimeiraImagem(pdfPreviewImg, repeatMode);
                                        setImagens((prev) => {
                                          const novas = [...prev];
                                          novas[i] = pdfPreviewImg;
                                          return novas;
                                        });
                                        setAlteracoesPendentes(true);
                                      } catch (err) {
                                        console.error("Erro ao carregar PDF:", err);
                                      }
                                    };
                                    reader.readAsArrayBuffer(file);
                                  } else if (file.type.startsWith("image/")) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      adicionarPrimeiraImagem(reader.result, repeatMode);
                                      setImagens((prev) => {
                                        const novas = [...prev];
                                        novas[i] = reader.result;
                                        return novas;
                                      });
                                      setAlteracoesPendentes(true);
                                    };
                                    reader.readAsDataURL(file);
                                  } else {
                                    alert("Formato não suportado. Envie imagem ou PDF.");
                                  }
                                }}
                                className="pro-btn-blue file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                      );

                    })}

                  </div>



                  {erroPdf && !carregando && (
                    <div className="text-red-600 mt-2 text-center">{erroPdf}</div>
                  )}

                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      <Footer ano={2025} />
    </AuthenticatedLayout>
  )
}
