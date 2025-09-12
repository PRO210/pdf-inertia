import { useEffect, useRef, useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'

import * as pdfjsLib from 'pdfjs-dist'
import Footer from '@/Components/Footer'
import FullScreenSpinner from '@/Components/FullScreenSpinner'
import Spinner from '@/Components/Spinner'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'


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
  larguraBorda = 5
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
      // Borda horizontal (topo/base)
      const respX = await fetch(`/imagens/bordas/${repeatBorder}.png`);
      const bytesX = new Uint8Array(await respX.arrayBuffer());
      bordaX = await pdfDoc.embedPng(bytesX);

      // Borda vertical (laterais)
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

    const usableW = pageWidth - margin * 2;
    const usableH = pageHeight - margin * 2;
    const cellW = (usableW - (cols - 1) * gap) / cols;
    const cellH = (usableH - (rows - 1) * gap) / rows;

    const totalSlots = imagens.length;
    let page = null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // **NOVAS VARIÁVEIS** para as dimensões fixas das bordas (convertidas de mm para pontos)
    const fixedBorderHeight = alturaBorda * CM_TO_POINTS / 10;
    const fixedBorderWidth = larguraBorda * CM_TO_POINTS / 10;
    const totalBorderW = bordaY ? fixedBorderWidth * 2 : 0;
    const totalBorderH = bordaX ? fixedBorderHeight * 2 : 0;


    for (let i = 0; i < totalSlots; i++) {
      const slotIndexInPage = i % slotsPerPage;
      const col = slotIndexInPage % cols;
      const row = Math.floor(slotIndexInPage / cols);

      if (slotIndexInPage === 0) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
      }

      const dataUrl = imagens[i];
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

      const rotatedDataUrl = canvas.toDataURL('image/png');
      const base64 = rotatedDataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      let embeddedImg;
      if (/data:image\/png/i.test(rotatedDataUrl)) {
        embeddedImg = await pdfDoc.embedPng(bytes);
      } else {
        embeddedImg = await pdfDoc.embedJpg(bytes);
      }

      const embeddedW = embeddedImg.width;
      const embeddedH = embeddedImg.height;

      // Calcula a posição e o tamanho da célula
      const cellLeftX = margin + col * (cellW + gap);
      const cellBottomY = pageHeight - margin - row * (cellH + gap) - cellH;


      // **NOVA LÓGICA** para o dimensionamento da imagem, respeitando o espaço das bordas fixas
      let drawW, drawH, drawX, drawY;

      if (aspecto) {
        // Redimensiona para caber na célula após remover o espaço das bordas
        const availableW = cellW - totalBorderW;
        const availableH = cellH - totalBorderH;

        const scale = Math.min(
          availableW / embeddedW,
          availableH / embeddedH
        );
        drawW = embeddedW * scale;
        drawH = embeddedH * scale;

        // Centraliza a imagem no espaço disponível
        drawX = cellLeftX + (cellW - drawW) / 2;
        drawY = cellBottomY + (cellH - drawH) / 2;

      } else {
        // Preenche o espaço disponível após remover o espaço das bordas
        drawW = cellW - totalBorderW;
        drawH = cellH - totalBorderH;
        drawX = cellLeftX + totalBorderW / 2;
        drawY = cellBottomY + totalBorderH / 2;
      }


      // Desenhar a imagem principal (lógica inalterada)
      page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });

      // Desenhar borda no topo e na base (agora repetindo)
      if (bordaX) {
        // Calcula quantas 'telhas' (tiles) cabem na largura da imagem principal.
        // O tamanho da 'telha' é a largura original da imagem da borda.
        const tileWidth = bordaX.width;
        const tilesX = Math.ceil(drawW / tileWidth);
        const scaleX = drawW / (tilesX * tileWidth); // Ajusta a escala para não sobrar espaço

        for (let x = 0; x < tilesX; x++) {
          const tileX = drawX + x * tileWidth * scaleX;

          // Borda do TOPO: desenhada com a altura fixa que você quer
          page.drawImage(bordaX, {
            x: tileX,
            y: drawY + drawH, // Acima da imagem
            width: tileWidth * scaleX,
            height: fixedBorderHeight, // **USANDO A ALTURA FIXA AQUI**
          });

          // Borda da BASE: desenhada com a altura fixa que você quer
          page.drawImage(bordaX, {
            x: tileX,
            y: drawY - fixedBorderHeight, // Abaixo da imagem
            width: tileWidth * scaleX,
            height: fixedBorderHeight, // **USANDO A ALTURA FIXA AQUI**
          });
        }
      }

      // Desenhar borda nas laterais (agora repetindo)
      if (bordaY) {
        // Calcula quantas 'telhas' (tiles) cabem na altura da imagem principal.
        const tileHeight = bordaY.height;
        const tilesY = Math.ceil(drawH / tileHeight);
        const scaleY = drawH / (tilesY * tileHeight);

        for (let y = 0; y < tilesY; y++) {
          const tileY = drawY + y * tileHeight * scaleY;

          // Borda ESQUERDA: desenhada com a largura fixa que você quer
          page.drawImage(bordaY, {
            x: drawX - fixedBorderWidth, // À esquerda da imagem
            y: tileY,
            width: fixedBorderWidth, // **USANDO A LARGURA FIXA AQUI**
            height: tileHeight * scaleY,
          });

          // Borda DIREITA: desenhada com a largura fixa que você quer
          page.drawImage(bordaY, {
            x: drawX + drawW, // À direita da imagem
            y: tileY,
            width: fixedBorderWidth, // **USANDO A LARGURA FIXA AQUI**
            height: tileHeight * scaleY,
          });
        }
      }

    }

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
  }, [ampliacao.colunas, ampliacao.linhas, totalSlots, repeatMode, repeatBorder]);


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
                            repeatBorder
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

                      return (
                        <div
                          key={i}
                          className="w-full h-full border-2 border-dashed rounded-md flex items-center justify-center text-xs text-gray-400 relative overflow-hidden"
                        >
                          {imgSrc ? (
                            <>
                              <img
                                src={imgSrc}
                                alt={`Imagem ${i + 1}`}
                                className={`w-full h-full rounded-md ${aspecto ? "object-contain" : "object-fill"
                                  }`}
                              />
                              <p>{aspecto}</p>
                              <button
                                title="Remover imagem"
                                onClick={() => removerImagem(i)}
                                className="absolute top-2 right-2 z-20 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow text-xs"
                              >
                                Remover
                              </button>
                            </>
                          ) : (
                          
                            <div className="flex flex-col items-center justify-center gap-2 px-2">
                              <p className='text-base sm:text-xl'>Envie imagem ou PDF :)</p>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;

                                  if (file.type === "application/pdf") {
                                    // 📄 Carregar PDF com pdfjsLib
                                    const reader = new FileReader();
                                    reader.onload = async () => {
                                      const typedArray = new Uint8Array(reader.result);
                                      try {
                                        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
                                        const pdf = await loadingTask.promise;
                                        const page = await pdf.getPage(1); // primeira página
                                        const viewport = page.getViewport({ scale: 1.0 });

                                        const canvas = document.createElement("canvas");
                                        const context = canvas.getContext("2d");
                                        canvas.height = viewport.height;
                                        canvas.width = viewport.width;

                                        await page.render({ canvasContext: context, viewport }).promise;

                                        // Convertemos o canvas em base64 p/ tratar igual imagem
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
                                    // 🖼️ Mantém sua lógica de imagem
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
                                className="pro-btn-blue file:mr-4 file:py-2 file:px-4 
                                  file:rounded-full file:border-0 file:text-sm 
                                  file:font-semibold file:bg-blue-50 
                                  file:text-blue-700 hover:file:bg-blue-100 
                                  cursor-pointer"
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
