import { useEffect, useRef, useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'

import * as pdfjsLib from 'pdfjs-dist'
import Footer from '@/Components/Footer'
import FullScreenSpinner from '@/Components/FullScreenSpinner'
pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'



export default function PdfEditor() {
  const { props } = usePage()
  const user = props.auth.user

  const [pdfUrl, setPdfUrl] = useState(null)
  const [imagemBase64, setImagemBase64] = useState(null)
  const [ampliacao, setAmpliacao] = useState({ colunas: 2, linhas: 2 })
  // const [partesRecortadas, setPartesRecortadas] = useState([])
  const [orientacao, setOrientacao] = useState('retrato')
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false)
  const [erroPdf, setErroPdf] = useState(null)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [aspecto, setAspecto] = useState(true)

  const pdfContainerRef = useRef(null)
  const [carregando, setCarregando] = useState(false)
  const [resumoTamanho, setResumoTamanho] = useState("")


  const resetarConfiguracoes = () => {
    setPdfUrl(null)
    setImagemBase64(null)
    setAmpliacao({ colunas: 2, linhas: 2 })
    // setPartesRecortadas([])
    setOrientacao('retrato')
    setAlteracoesPendentes(false)
    setErroPdf(null)
    setPaginaAtual(1)
    setTotalPaginas(0)
    setZoom(1)
    setAspecto(true)
  }


  const enviarParaCorteBackend = async () => {
    try {
      const response = await axios.post('/cortar-imagem', {
        imagem: imagemBase64,
        colunas: ampliacao.colunas,
        linhas: ampliacao.linhas,
        orientacao,
        aspecto,
      })
      console.log('Resposta do backend:', response.data)

      const { partes } = response.data
      return partes
    } catch (error) {
      console.error('Erro ao cortar imagem no backend:', error)
      alert('Erro ao processar a imagem no servidor.')
      return null
    }
  }

  // Função para corrigir rotação usando Canvas
  // const corrigirOrientacaoImagem = (base64) => {
  //   return new Promise((resolve) => {
  //     const img = new Image()
  //     img.onload = () => {
  //       const canvas = document.createElement("canvas")
  //       const ctx = canvas.getContext("2d")

  //       // se a foto for "de câmera" (mais alta que larga) gira para caber
  //       if (img.height > img.width) {
  //         canvas.width = img.height
  //         canvas.height = img.width
  //         ctx.translate(canvas.width / 2, canvas.height / 2)
  //         ctx.rotate(-90 * Math.PI / 180)
  //         ctx.drawImage(img, -img.width / 2, -img.height / 2)
  //       } else {
  //         canvas.width = img.width
  //         canvas.height = img.height
  //         ctx.drawImage(img, 0, 0)
  //       }

  //       resolve(canvas.toDataURL("image/jpeg", 0.95))
  //     }
  //     img.src = base64
  //   })
  // }
  const corrigirOrientacaoImagem = (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // 🔹 calcular tamanho original em MB
        const tamanhoOriginalMB = (base64.length * 3 / 4) / (1024 * 1024);
        // console.log("📏 Original:", img.width, "x", img.height, "-", tamanhoOriginalMB.toFixed(2), "MB");

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // 🔹 usa o tamanho já corrigido pelo navegador (preview)
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        // 🔹 gera base64 final alinhado
        const finalBase64 = canvas.toDataURL("image/jpeg", 1);

        // Criar um novo objeto Image para medir o base64 convertido
        const imgFinal = new Image();
        imgFinal.onload = () => {
          const tamanhoConvertidoMB = (finalBase64.length * 3 / 4) / (1024 * 1024);
          // console.log("📏 Convertida:", imgFinal.width, "x", imgFinal.height, "-", tamanhoConvertidoMB.toFixed(2), "MB");

          resolve(finalBase64);
        };
        imgFinal.src = finalBase64;
      };
      img.src = base64;
    });
  };



  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCarregando(true)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result

      // 🔹 corrige rotação antes de salvar no estado
      const base64Corrigido = await corrigirOrientacaoImagem(base64)

      setCarregando(false)

      setImagemBase64(base64Corrigido)

      setAlteracoesPendentes(true)
    }

    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (!pdfUrl) return
    setErroPdf(null)

    const renderPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        setTotalPaginas(pdf.numPages)

        const container = pdfContainerRef.current
        if (!container) return
        container.innerHTML = ''

        const page = await pdf.getPage(paginaAtual)
        const unscaledViewport = page.getViewport({ scale: 1 })

        // Usamos o zoom para o scale
        const scale = zoom
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.classList.add('mb-4', 'shadow-md', 'border', 'rounded')

        // Define tamanho canvas conforme viewport
        canvas.width = viewport.width
        canvas.height = viewport.height

        // CSS para limitar altura e manter proporção
        canvas.style.maxHeight = '600px'
        canvas.style.width = 'auto'
        canvas.style.height = 'auto'

        const context = canvas.getContext('2d')
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }
        await page.render(renderContext).promise
        container.appendChild(canvas)
      } catch (error) {
        setErroPdf('Erro ao renderizar o PDF. Verifique se o arquivo pdf.worker.min.js está disponível.')
        console.error("Erro ao renderizar PDF com PDF.js:", error)
      }
    }
    renderPDF()
  }, [pdfUrl, paginaAtual, zoom])

  const gerarPDF = async (partesRecortadasParaUsar = partesRecortadas) => {

    setCarregando(true)

    const pdfDoc = await PDFDocument.create()
    const a4Retrato = [595.28, 841.89]
    const a4Paisagem = [841.89, 595.28]
    const [pageWidth, pageHeight] = orientacao === 'retrato' ? a4Retrato : a4Paisagem

    const CM_TO_POINTS = 28.3465
    const margem = 1 * CM_TO_POINTS // 1 cm em pontos

    let pageIndex = 0; // Adiciona um índice para a página atual, começando de 0

    for (const parte of partesRecortadasParaUsar) {
      const page = pdfDoc.addPage([pageWidth, pageHeight])
      const imageBytes = await fetch(parte).then(res => res.arrayBuffer())

      // const image = parte.includes('png')
      //   ? await pdfDoc.embedPng(imageBytes)
      //   : await pdfDoc.embedJpg(imageBytes)
      // 🔹 Sempre JPEG
      const image = await pdfDoc.embedJpg(imageBytes)

      const escala = Math.min(
        (pageWidth - margem * 2) / image.width,
        (pageHeight - margem * 2) / image.height
      )

      const largura = image.width * escala
      const altura = image.height * escala

      // const x = margem
      // const y = pageHeight - altura - margem

      const x = margem; // A imagem sempre começa da margem esquerda

      // === INÍCIO DA NOVA LÓGICA DE POSICIONAMENTO Y ===

      // Determina a "linha" atual da imagem original que esta parte representa (0-based)
      const linhaDaImagemOriginal = Math.floor(pageIndex / ampliacao.colunas);

      let y;
      // Se for a primeira linha da imagem original (linha 0)
      if (linhaDaImagemOriginal === 0) {
        y = margem; // Alinha a parte inferior da imagem com a margem inferior da página
      }
      // Se for a última linha da imagem original
      else if (linhaDaImagemOriginal === ampliacao.linhas - 1) {
        y = pageHeight - altura - margem; // Alinha a parte superior da imagem com a margem superior da página
      }
      // Se for qualquer linha intermediária (não a primeira nem a última)
      else {
        y = pageHeight - altura - margem; // Alinha a parte superior da imagem com a margem superior da página
      }

      page.drawImage(image, { x, y, width: largura, height: altura })

      // Número da página
      page.drawText(`${pdfDoc.getPageCount()}`, {
        x: pageWidth - margem,
        y: margem - 10,
        size: 8,
        color: rgb(0, 0, 0),
      })

      pageIndex++; // Não esqueça de incrementar o índice da página

      // Pontilhado nas bordas
      const desenharLinhaPontilhada = (x1, y1, x2, y2, segmento = 5, espaco = 20) => {
        const dx = x2 - x1
        const dy = y2 - y1
        const comprimento = Math.sqrt(dx * dx + dy * dy)
        const passos = Math.floor(comprimento / (segmento + espaco))
        const incX = dx / comprimento
        const incY = dy / comprimento
        for (let i = 0; i < passos; i++) {
          const inicioX = x1 + (segmento + espaco) * i * incX
          const inicioY = y1 + (segmento + espaco) * i * incY
          const fimX = inicioX + segmento * incX
          const fimY = inicioY + segmento * incY
          page.drawLine({
            start: { x: inicioX, y: inicioY },
            end: { x: fimX, y: fimY },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
          })
        }
      }
      desenharLinhaPontilhada(margem, margem, pageWidth - margem, margem)
      desenharLinhaPontilhada(margem, pageHeight - margem, pageWidth - margem, pageHeight - margem)
      desenharLinhaPontilhada(margem, margem, margem, pageHeight - margem)
      desenharLinhaPontilhada(pageWidth - margem, margem, pageWidth - margem, pageHeight - margem)
    }

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    setPdfUrl(URL.createObjectURL(blob))

    setCarregando(false)

    setPaginaAtual(1)
  }

  const downloadPDF = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = 'documento.pdf'
    a.click()
  }

  useEffect(() => {
    if (!imagemBase64) {
      setResumoTamanho("");
      return;
    }

    const img = new Image();
    img.src = imagemBase64;

    img.onload = () => {
      // medidas A4 em pontos
      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;
      const CM_TO_POINTS = 28.3465;

      // orientação
      const pageWidth = orientacao === "retrato" ? A4_WIDTH : A4_HEIGHT;
      const pageHeight = orientacao === "retrato" ? A4_HEIGHT : A4_WIDTH;

      // margem (1 cm usado no gerarPDF)
      const margem = 1 * CM_TO_POINTS;

      // grid
      const cols = Math.max(ampliacao?.colunas || 1, 1);
      const rows = Math.max(ampliacao?.linhas || 1, 1);

      // pixels da imagem original
      const originalPxW = img.width;
      const originalPxH = img.height;

      // pixels de uma parte (recorte)
      const partPxW = originalPxW / cols;
      const partPxH = originalPxH / rows;

      // área disponível dentro da página (em pontos)
      const availableW = pageWidth - margem * 2;
      const availableH = pageHeight - margem * 2;

      // escalas possíveis
      const widthScale = availableW / partPxW;
      const heightScale = availableH / partPxH;

      // se aspecto = true → mantém proporção (fit)
      // se aspecto = false → força altura cheia (fill by height)
      const escala = aspecto
        ? Math.min(widthScale, heightScale)
        : heightScale;

      // tamanho impresso de cada parte em pontos
      const printedPartW_pts = partPxW * escala;
      const printedPartH_pts = partPxH * escala;

      // tamanho total do banner
      const bannerW_pts = cols * printedPartW_pts;
      const bannerH_pts = rows * printedPartH_pts;

      const toCm = (pts) => (pts / CM_TO_POINTS).toFixed(1);

      setResumoTamanho({
        banner: {
          largura: toCm(bannerW_pts),
          altura: toCm(bannerH_pts),
          partes: cols * rows,
          parte: {
            largura: toCm(printedPartW_pts),
            altura: toCm(printedPartH_pts),
          },
          meta: {
            originalPxW,
            originalPxH,
            cols,
            rows,
            widthScale: +widthScale.toFixed(3),
            heightScale: +heightScale.toFixed(3),
            escala: +escala.toFixed(3),
            pageWidth,
            pageHeight,
            margem,
          },
        },
      });
    };

    img.onerror = () => {
      setResumoTamanho("");
      console.error("Erro ao carregar imagemBase64 para cálculo do banner.");
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagemBase64, ampliacao, orientacao, aspecto]);


  return (
    <AuthenticatedLayout>
      <Head title="Editor" />

      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-start gap-4 min-h-screen">

          {/* Coluna das Opções */}
          <div className="w-full lg:w-1/3 flex flex-col justify-start items-center" id="opcoes">
            <div className="flex flex-col items-center justify-center gap-4 w-full" >
              <div className="w-full text-center text-2xl font-bold mt-4">
                <h1>Opções</h1>
              </div>

              {/* Orientação */}
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
              <br />
              {/* Aspecto */}
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

              <div className="w-full flex flex-col">
                <label className="block mb-2 pro-label text-xl text-center">Ampliação:</label>
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
                      {[...Array(10)].map((_, i) => {
                        const valor = i + 1;
                        return (
                          <option key={valor} value={valor}>
                            {valor}
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
                      {[...Array(10)].map((_, i) => {
                        const valor = i + 1;
                        return (
                          <option key={valor} value={valor}>
                            {valor}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                </div>
              </div>

              <br />

              <div className="flex flex-col gap-2 w-full">
                {user && (
                  <>
                    {imagemBase64 && alteracoesPendentes && (
                      <button
                        onClick={async () => {
                          // A verificação interna `if (!imagemBase64) return` ainda é boa prática
                          // para garantir, caso o estado mude entre a renderização e o clique.
                          setCarregando(true);

                          const partes = await enviarParaCorteBackend();

                          if (partes) {
                            await gerarPDF(partes);
                            setAlteracoesPendentes(false);
                          }

                          setCarregando(false);
                        }}
                        className={alteracoesPendentes ? "pro-btn-red" : "pro-btn-purple"}
                      >
                        Aplicar alterações
                      </button>

                    )}

                    <>
                      <h3 className="p-2 text-center font-bold sm:text-xl">
                        Resumo das atividades:
                      </h3>
                      <div className="p-3 mb-3 border rounded text-center bg-gray-50 sm:text-lg">
                        <p>
                          {resumoTamanho?.banner ? (
                            <>
                              🖼️ <b>Banner:</b> {resumoTamanho.banner.largura} × {resumoTamanho.banner.altura} cm aproximadamente
                              {' '}({resumoTamanho.banner.partes} partes — cada parte ≈ {resumoTamanho.banner.parte.largura} × {resumoTamanho.banner.parte.altura} cm)
                            </>
                          ) : (
                            <>Nenhum banner calculado</>
                          )}
                        </p>
                      </div>
                    </>

                    {pdfUrl && !alteracoesPendentes && (
                      <button onClick={downloadPDF} className="pro-btn-green mt-2" disabled={!pdfUrl}>
                        Baixar PDF
                      </button>
                    )}



                    {pdfUrl && (
                      <div className="flex justify-center gap-2 mt-2">
                        <button
                          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.25))}
                          disabled={zoom <= 0.25}
                          className="pro-btn-blue px-3 py-1 rounded"
                        >
                          -
                        </button>
                        <span className="flex items-center px-2">{(zoom * 100).toFixed(0)}%</span>
                        <button
                          onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
                          disabled={zoom >= 3}
                          className="pro-btn-blue px-3 py-1 rounded"
                        >
                          +
                        </button>
                      </div>

                    )}
                  </>
                )}
              </div>

              <br />

              <div className='w-full'>
                <button onClick={resetarConfiguracoes} className="pro-btn-slate">
                  Resetar Configurações
                </button>
              </div>
            </div>
          </div>

          {/* Coluna do Preview */}
          <div className="w-full lg:w-2/3 flex flex-col justify-center items-center mb-4">
            <div className="flex flex-col items-center justify-center gap-4 w-full" id="preview">
              <div className="">

                <div className="mx-auto mb-4 p-2 rounded-2xl">
                  <h1 className="sm:text-xl lg:text-2xl text-center font-bold whitespace-nowrap">
                    Preview do{" "}
                    <span>{pdfUrl ? "Banner em PDF" : "da Imagem"}</span>
                  </h1>

                  {/* Paginação */}
                  {pdfUrl && totalPaginas > 1 && (
                    <div className="mt-4 px-4 flex justify-center items-center gap-4">
                      <button
                        onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
                        disabled={paginaAtual === 1}
                        className={`pro-btn-blue md:text-nowrap ${paginaAtual === 1 ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                      >
                        Página anterior
                      </button>
                      <span className="text-lg whitespace-nowrap">
                        {paginaAtual} / {totalPaginas}
                      </span>
                      <button
                        onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
                        disabled={paginaAtual === totalPaginas}
                        className={`pro-btn-blue md:text-nowrap ${paginaAtual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : ''}`}
                      >
                        Próxima página
                      </button>
                    </div>
                  )}
                </div>


                <div
                  className={`mx-auto w-full max-w-[842px] flex items-center justify-center relative
                        ${!pdfUrl ? "border bg-white rounded-lg" : ""} 
                        ${orientacao === "retrato" ? "aspect-[595/842]" : "aspect-[842/595]"}
                      `}
                >
                  {/* Conteúdo (sempre renderiza; PDF tem prioridade se existir) */}
                  {pdfUrl ? (
                    <div
                      key={pdfUrl}
                      ref={pdfContainerRef}
                      style={{ display: "flex", justifyContent: "center" }}
                    />
                  ) : imagemBase64 ? (
                    <img
                      src={imagemBase64}
                      alt="Pré-visualização da imagem carregada"
                      className="rounded-md mx-auto"
                      style={{
                        ...(orientacao === "retrato"
                          ? {
                            width: "100%",
                            maxWidth: "595px",
                            aspectRatio: "595 / 842",
                          }
                          : {
                            width: "100%",
                            maxWidth: "842px",
                            aspectRatio: "842 / 595",
                          }),
                        objectFit: aspecto ? "contain" : "fill",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 px-2">
                      <label className="pro-label text-center text-xl">
                        Nenhuma Imagem Selecionada:
                      </label>
                      <div className="flex justify-center w-full">
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          onChange={handleFileChange}
                          className="
                            pro-btn-blue file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 
                            file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 
                            hover:file:bg-blue-100 cursor-pointer
                          "
                        />
                      </div>
                    </div>
                  )}

                  {/* Overlay de carregamento — aparece por cima sem esconder o conteúdo */}
                  {carregando && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60">
                      <FullScreenSpinner />
                    </div>
                  )}
                </div>

                {erroPdf && (
                  <div className="text-red-600 mt-2 text-center">{erroPdf}</div>
                )}

              </div>
            </div>
          </div>


        </div>
      </div>

      <Footer ano={2025} />


    </AuthenticatedLayout>
  )
}
