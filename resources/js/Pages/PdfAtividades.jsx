import { useEffect, useRef, useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'
import * as EXIF from 'exif-js'

import * as pdfjsLib from 'pdfjs-dist'
import Footer from '@/Components/Footer'
pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'

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

  const [imagens, setImagens] = useState([]); // array de slots (null = vazio)

  // Sincroniza o tamanho do array `imagens` com totalSlots ao mudar ampliação
  useEffect(() => {
    setImagens((prev) => {
      const atual = [...prev];
      // corta se houver a menos slots que antes
      if (atual.length > totalSlots) {
        atual.length = totalSlots;
        return atual;
      }
      // acrescenta nulls até totalSlots
      while (atual.length < totalSlots) atual.push(null);
      return atual;
    });
    // desmarca alterações pendentes quando mudam colunas/linhas
    setAlteracoesPendentes(true);
  }, [ampliacao.colunas, ampliacao.linhas]);

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

  // const gerarPDF = async () => {
  //   // garante que haja pelo menos uma imagem
  //   if (!imagens || !imagens.some(Boolean)) {
  //     alert('Nenhuma imagem para gerar o PDF.');
  //     return;
  //   }

  //   try {
  //     setCarregando(true);

  //     const pdfDoc = await PDFDocument.create();

  //     // A4 em pontos
  //     const A4_WIDTH = 595.28;
  //     const A4_HEIGHT = 841.89;
  //     const pageWidth = orientacao === 'retrato' ? A4_WIDTH : A4_HEIGHT;
  //     const pageHeight = orientacao === 'retrato' ? A4_HEIGHT : A4_WIDTH;

  //     // margens e espaçamento (em pontos). Ajuste se quiser mais/menos espaçamento.
  //     const CM_TO_POINTS = 28.3465;
  //     const margin = 1 * CM_TO_POINTS; // 1 cm
  //     const gap = 6; // espaço entre células (em pontos)

  //     const cols = Math.max(ampliacao?.colunas || 1, 1);
  //     const rows = Math.max(ampliacao?.linhas || 1, 1);

  //     // área utilizável (excluindo margens)
  //     const usableW = pageWidth - margin * 2;
  //     const usableH = pageHeight - margin * 2;

  //     // largura/altura de cada célula, considerando gaps entre colunas/linhas
  //     const cellW = (usableW - (cols - 1) * gap) / cols;
  //     const cellH = (usableH - (rows - 1) * gap) / rows;

  //     // slot por página
  //     const slotsPerPage = cols * rows;

  //     let page = null;
  //     let pageSlot = 0; // índice de slot na página atual (0 .. slotsPerPage-1)

  //     for (let i = 0; i < imagens.length; i++) {
  //       const dataUrl = imagens[i];
  //       if (!dataUrl) continue; // pula slots vazios

  //       // cria nova página se necessário
  //       if (pageSlot % slotsPerPage === 0) {
  //         page = pdfDoc.addPage([pageWidth, pageHeight]);
  //         pageSlot = 0;
  //       }

  //       // extrai base64 -> bytes
  //       const base64 = dataUrl.split(',')[1];
  //       const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  //       // embed
  //       let embeddedImg;
  //       if (/data:image\/png/i.test(dataUrl)) {
  //         embeddedImg = await pdfDoc.embedPng(bytes);
  //       } else {
  //         // assume jpeg/jpg caso contrário
  //         embeddedImg = await pdfDoc.embedJpg(bytes);
  //       }

  //       // dimensões originais da imagem
  //       const imgW = embeddedImg.width;
  //       const imgH = embeddedImg.height;

  //       // calculo de coluna/linha dentro da página atual
  //       const col = pageSlot % cols;
  //       const row = Math.floor(pageSlot / cols);

  //       // posição da célula (origem no canto esquerdo da célula)
  //       const cellLeftX = margin + col * (cellW + gap);
  //       const cellTopY = pageHeight - margin - row * (cellH + gap);
  //       const cellBottomY = cellTopY - cellH;

  //       let drawW, drawH, drawX, drawY;

  //       if (aspecto) {
  //         // manter proporção e centralizar dentro da célula
  //         const scale = Math.min(cellW / imgW, cellH / imgH);
  //         drawW = imgW * scale;
  //         drawH = imgH * scale;
  //         drawX = cellLeftX + (cellW - drawW) / 2;
  //         drawY = cellBottomY + (cellH - drawH) / 2;
  //       } else {
  //         // preencher completamente a célula (pode cortar / distorcer)
  //         drawW = cellW;
  //         drawH = cellH;
  //         drawX = cellLeftX;
  //         drawY = cellBottomY;
  //       }

  //       page.drawImage(embeddedImg, {
  //         x: drawX,
  //         y: drawY,
  //         width: drawW,
  //         height: drawH,
  //       });

  //       pageSlot++;
  //     }

  //     const pdfBytes = await pdfDoc.save();
  //     const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  //     const url = URL.createObjectURL(blob);

  //     // atualiza estado para seu preview com pdfjs-dist
  //     setPdfUrl(url);
  //     setPaginaAtual(1);
  //     setAlteracoesPendentes(false);
  //   } catch (err) {
  //     console.error('Erro gerando PDF:', err);
  //     setErroPdf('Erro ao gerar o PDF no front-end.');
  //   } finally {
  //     setCarregando(false);
  //   }
  // };


  const gerarPDF = async () => {
    if (!imagens || !imagens.some(Boolean)) {
      alert('Nenhuma imagem para gerar o PDF.');
      return;
    }

    try {
      setCarregando(true);

      const pdfDoc = await PDFDocument.create();

      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;
      const pageWidth = orientacao === 'retrato' ? A4_WIDTH : A4_HEIGHT;
      const pageHeight = orientacao === 'retrato' ? A4_HEIGHT : A4_WIDTH;

      const CM_TO_POINTS = 28.3465;
      const margin = 1 * CM_TO_POINTS;
      const gap = 6;

      const cols = Math.max(ampliacao?.colunas || 1, 1);
      const rows = Math.max(ampliacao?.linhas || 1, 1);
      const usableW = pageWidth - margin * 2;
      const usableH = pageHeight - margin * 2;
      const cellW = (usableW - (cols - 1) * gap) / cols;
      const cellH = (usableH - (rows - 1) * gap) / rows;
      const slotsPerPage = cols * rows;

      let page = null;
      let pageSlot = 0;

      for (let i = 0; i < imagens.length; i++) {
        const dataUrl = imagens[i];
        if (!dataUrl) continue;

        if (pageSlot % slotsPerPage === 0) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          pageSlot = 0;
        }

        // ---- Corrige rotação ----
        const rotatedDataUrl = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // inverter largura/altura se estiver deitada
            const needSwap = img.width > img.height && cellH > cellW;
            canvas.width = needSwap ? img.height : img.width;
            canvas.height = needSwap ? img.width : img.height;

            // rotaciona 90° se necessário
            if (needSwap) {
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate((90 * Math.PI) / 180);
              ctx.drawImage(img, -img.width / 2, -img.height / 2);
            } else {
              ctx.drawImage(img, 0, 0);
            }

            resolve(canvas.toDataURL('image/jpeg'));
          };
          img.src = dataUrl;
        });

        const base64 = rotatedDataUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

        let embeddedImg;
        if (/data:image\/png/i.test(rotatedDataUrl)) {
          embeddedImg = await pdfDoc.embedPng(bytes);
        } else {
          embeddedImg = await pdfDoc.embedJpg(bytes);
        }

        const imgW = embeddedImg.width;
        const imgH = embeddedImg.height;

        const col = pageSlot % cols;
        const row = Math.floor(pageSlot / cols);
        const cellLeftX = margin + col * (cellW + gap);
        const cellTopY = pageHeight - margin - row * (cellH + gap);
        const cellBottomY = cellTopY - cellH;

        let drawW, drawH, drawX, drawY;

        if (aspecto) {
          const scale = Math.min(cellW / imgW, cellH / imgH);
          drawW = imgW * scale;
          drawH = imgH * scale;
          drawX = cellLeftX + (cellW - drawW) / 2;
          drawY = cellBottomY + (cellH - drawH) / 2;
        } else {
          drawW = cellW;
          drawH = cellH;
          drawX = cellLeftX;
          drawY = cellBottomY;
        }

        page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });
        pageSlot++;
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

              <div className="flex flex-col gap-2 w-full">
                {user && (
                  <>
                    {/* Mostrar Aplicar alterações se houver imagens no array OU imagemBase64 (compatibilidade) */}
                    {(imagens.some(Boolean)) && alteracoesPendentes && (
                      <button
                        onClick={async () => {
                          setCarregando(true);

                          await gerarPDF();

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

                <div id="pdf-preview"
                  className="w-full border-2 border-gray-300 rounded-lg mx-auto overflow-x-auto flex justify-center items-center p-4 bg-gray-100 relative"
                  style={{ minHeight: '600px' }}
                >
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
                    {Array.from({ length: totalSlots }).map((_, i) => (
                      <div
                        key={i}
                        className="w-full h-full border-2 border-dashed rounded-md flex items-center justify-center text-xs text-gray-400 relative overflow-hidden"
                      >
                        {imagens[i] ? (
                          <>
                            <img
                              src={imagens[i]}
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
                    ))}
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
