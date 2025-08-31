import { useEffect, useRef, useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'



import * as pdfjsLib from 'pdfjs-dist'
import Footer from '@/Components/Footer'
pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'

// Função auxiliar para converter Data URL em Array de Bytes
const dataURLToUint8Array = async (dataUrl) => {
  const response = await fetch(dataUrl);
  return new Uint8Array(await response.arrayBuffer());
};



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
  repeatBorder = "none"
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
      // horizontal
      const respX = await fetch(`/imagens/bordas/${repeatBorder}.png`);
      const bytesX = new Uint8Array(await respX.arrayBuffer());
      bordaX = await pdfDoc.embedPng(bytesX);

      // vertical
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

    for (let i = 0; i < totalSlots; i++) {
      const slotIndexInPage = i % slotsPerPage;
      const col = slotIndexInPage % cols;
      const row = Math.floor(slotIndexInPage / cols);

      // Cria nova página se necessário
      if (slotIndexInPage === 0) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
      }

      const dataUrl = imagens[i];
      if (!dataUrl) continue;

      // Converte dataUrl em bytes
      const imgBytes = await dataURLToUint8Array(dataUrl);

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

      // Calcula posição e tamanho
      let drawW, drawH, drawX, drawY;
      const cellLeftX = margin + col * (cellW + gap);
      const cellTopY = pageHeight - margin - row * (cellH + gap);
      const cellBottomY = cellTopY - cellH;


      const tileSize = 100; // mesmo que no HTML

      const bordaExtra = tileSize - 90; // espaço para a borda

      if (aspecto) {
        const scale = Math.min((cellW - bordaExtra) / embeddedW, (cellH - bordaExtra) / embeddedH);
        drawW = embeddedW * scale;
        drawH = embeddedH * scale;
        drawX = cellLeftX + (cellW - drawW) / 2;
        drawY = cellBottomY + (cellH - drawH) / 2;
      } else {
        drawW = cellW - bordaExtra;
        drawH = cellH - bordaExtra;
        drawX = cellLeftX + bordaExtra / 2;
        drawY = cellBottomY + bordaExtra / 2;
      }


      page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });


      // Topo
      for (let x = 0; x < drawW; x += tileSize) {
        page.drawImage(bordaX, {
          x: drawX + x,
          y: drawY + drawH,
          width: tileSize,
          height: (bordaX.height / bordaX.width) * tileSize,
        });
      }

      // Base
      for (let x = 0; x < drawW; x += tileSize) {
        page.drawImage(bordaX, {
          x: drawX + x,
          y: drawY - (bordaX.height / bordaX.width) * tileSize,
          width: tileSize,
          height: (bordaX.height / bordaX.width) * tileSize,
        });
      }

      // Lateral esquerda
      for (let y = 0; y < drawH; y += tileSize) {
        page.drawImage(bordaY, {
          x: drawX - (bordaY.width / bordaY.height) * tileSize,
          y: drawY + y,
          width: (bordaY.width / bordaY.height) * tileSize,
          height: tileSize,
        });
      }

      // Lateral direita
      for (let y = 0; y < drawH; y += tileSize) {
        page.drawImage(bordaY, {
          x: drawX + drawW,
          y: drawY + y,
          width: (bordaY.width / bordaY.height) * tileSize,
          height: tileSize,
        });
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
  const [aspecto, setAspecto] = useState(true)

  const pdfContainerRef = useRef(null)
  const [carregando, setCarregando] = useState(false)

  // totalSlots recalculado a cada render
  const totalSlots = Math.max(ampliacao?.colunas || 1, 1) *
    Math.max((ampliacao?.linhas || ampliacao?.colunas || 1), 1);

  const [imagens, setImagens] = useState([]);
  const [repeatMode, setRepeatMode] = useState("none");

  const [repeatBorder, setBorder] = useState("none");
  const espessuraBorda = 150;   // grossura da moldura, em px
  const tamanhoTile = 150;    // tamanho do “azulejo” (escala do padrão)

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
    setAspecto(true)
    setImagens([])
    setRepeatMode("none");
    setBorder("none");
  }

  // remover imagem de um slot (mantém o slot, apenas zera)
  const removerImagem = (index) => {
    console.log(imagens)
    console.log('-----------------')
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

      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-start gap-4 min-h-screen">
          {/* ... coluna de opções permanece igual, porém alterei o botão Aplicar para checar `imagens` ... */}

          <div className="w-full md:w-1/3 flex flex-col justify-start items-center" id="opcoes">
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
              <div className="w-full flex flex-col">
                <label className="block mb-2 pro-label text-xl text-center">Redução:</label>
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

                    {pdfUrl && (
                      <button onClick={downloadPDF} className="pro-btn-green mt-2" disabled={!pdfUrl}>
                        Baixar PDF
                      </button>
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
          <div className="w-full md:w-2/3 flex flex-col justify-start items-center mx-6" id="preview-column">
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
                  style={{ minHeight: "600px" }}
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
                      ${orientacao === "retrato" ? "w-[595px] h-[842px]" : "w-[842px] h-[595px]"}
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
                        <div key={i} className="w-full h-full border-2 border-dashed rounded-md flex items-center justify-center text-xs text-gray-400 relative overflow-hidden">
                          {imgSrc ? (
                            <>
                              <img
                                src={imgSrc}
                                alt={`Imagem ${i + 1}`}
                                className={`w-full h-full rounded-md ${aspecto ? "object-contain" : "object-cover"}`}
                              />
                              <button
                                title="Remover imagem"
                                onClick={() => removerImagem(i)}
                                className="absolute top-2 right-2 z-20 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow text-xs"
                              >
                                Remover
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <div className="text-center text-xs text-gray-400"></div>
                              <input
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setImagens((prev) => {
                                        const novas = [...prev];
                                        novas[i] = reader.result;
                                        return novas;
                                      });
                                      setAlteracoesPendentes(true);
                                    };
                                    reader.readAsDataURL(file);
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
