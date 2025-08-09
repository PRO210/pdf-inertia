import { useEffect, useRef, useState } from 'react'
import { PDFDocument, rgb } from 'pdf-lib'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react';
import ReactPDF from '@react-pdf/renderer';

export default function PdfEditor() {

  const { props } = usePage()
  const user = props.auth.user

  const [pdfUrl, setPdfUrl] = useState(null)
  const [imagemBase64, setImagemBase64] = useState(null)
  // const [ampliacao, setAmpliacao] = useState(2)
  const [ampliacao, setAmpliacao] = useState({ colunas: 2, linhas: 2 })
  const [partesRecortadas, setPartesRecortadas] = useState([])
  const [orientacao, setOrientacao] = useState('retrato') // 'retrato' ou 'paisagem'
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false)

  const resetarConfiguracoes = () => {
    setPdfUrl(null)
    setImagemBase64(null)
    setAmpliacao({ colunas: 2, linhas: 2 })
    setPartesRecortadas([])
    setOrientacao('retrato')
    setAlteracoesPendentes(false)
  }

  useEffect(() => {
    // Só recorta se já houver uma imagem carregada
    if (imagemBase64) {
      recortarImagem(imagemBase64).then(setPartesRecortadas)
      setAlteracoesPendentes(true) // Marca que há alterações pendentes
    }
  }, [ampliacao, orientacao, imagemBase64])

  // Novo: Pré-processamento da imagem com Canvas
  const recortarImagem = async (base64) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = base64

      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const partes = []

        // const larguraParte = img.width / ampliacao
        // const alturaParte = img.height / ampliacao
        const larguraParte = img.width / ampliacao.colunas
        const alturaParte = img.height / ampliacao.linhas

        for (let y = 0; y < ampliacao.linhas; y++) {
          for (let x = 0; x < ampliacao.colunas; x++) {
            canvas.width = larguraParte
            canvas.height = alturaParte

            ctx.drawImage(
              img,
              x * larguraParte,
              y * alturaParte,
              larguraParte,
              alturaParte,
              0,
              0,
              larguraParte,
              alturaParte
            )

            partes.push(canvas.toDataURL())
          }
        }
        resolve(partes)
      }
    })
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result

      const partes = await recortarImagem(base64)
      setPartesRecortadas(partes)

      setImagemBase64(base64)
    }
    reader.readAsDataURL(file)
  }


  const gerarPDF = async () => {

    const pdfDoc = await PDFDocument.create()

    const a4Retrato = [595.28, 841.89]   // A4: 210 × 297 mm
    const a4Paisagem = [841.89, 595.28]  // A4: 297 × 210 mm
    const [pageWidth, pageHeight] = orientacao === 'retrato' ? a4Retrato : a4Paisagem


    const margemBorda = 14.17       // 5mm
    const margemImagem = 14.17 * 2  // 10mm (5mm da borda + 5mm após a linha de corte)

    for (const parte of partesRecortadas) {
      const page = pdfDoc.addPage([pageWidth, pageHeight])
      const imageBytes = await fetch(parte).then(res => res.arrayBuffer())

      const image = parte.includes('png')
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes)

      // Ajuste de escala para deixar 5mm de margem em todos os lados
      const escala = Math.min(
        (pageWidth - margemImagem * 2) / image.width,
        (pageHeight - margemImagem * 2) / image.height
      )

      const largura = image.width * escala
      const altura = image.height * escala

      const x = margemImagem
      const y = pageHeight - altura - margemImagem

      page.drawImage(image, {
        x,
        y,
        width: largura,
        height: altura,
      })

      // Número da página no canto inferior direito
      page.drawText(`${pdfDoc.getPageCount()}`, {
        x: pageWidth - margemImagem - 10,
        y: margemImagem - 2,
        size: 8,
        color: rgb(0, 0, 0),
      })

      // Função auxiliar para desenhar linhas pontilhadas
      const desenharLinhaPontilhada = (x1, y1, x2, y2, segmento = 5, espaco = 3) => {
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
            color: rgb(0, 0, 0),
          })
        }
      }

      // Desenha as 4 linhas pontilhadas (topo, inferior, esquerda, direita) a 5mm da borda
      desenharLinhaPontilhada(margemBorda, margemBorda, pageWidth - margemBorda, margemBorda) // Inferior
      desenharLinhaPontilhada(margemBorda, pageHeight - margemBorda, pageWidth - margemBorda, pageHeight - margemBorda) // Superior
      desenharLinhaPontilhada(margemBorda, margemBorda, margemBorda, pageHeight - margemBorda) // Esquerda
      desenharLinhaPontilhada(pageWidth - margemBorda, margemBorda, pageWidth - margemBorda, pageHeight - margemBorda) // Direita

    }

    // pdfDoc.catalog.ViewerPreferences({
    //   FitWindow: true,
    //   CenterWindow: true,
    //   DisplayDocTitle: true,
    //   HideToolbar: true,
    //   HideMenubar: true,
    //   HideWindowUI: false
    // });

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    setPdfUrl(URL.createObjectURL(blob))

    console.log(pdfUrl);
    
  }



  return (

    <AuthenticatedLayout>

      <Head title="PDF Editor" />

      <div className="p-4">


        <div className="flex flex-col md:flex-row gap-2">

          {/* Div esquerda */}
          <div className='flex flex-col items-center justify-center gap-4 w-full md:w-1/5' id='opcoes'>

            <div className='w-full text-center md:text-2xl'>
              <h1>Opções</h1>
            </div>

            <div className="w-full">
              <label className="block mb-1 pro-label text-center text-xl">Orientação:</label>
              <select
                className="px-2 w-full rounded-full pro-input"
                name="orientacao"
                id="orientacao"
                value={orientacao}
                onChange={(e) => setOrientacao(e.target.value)}
              >
                <option value="retrato">Retrato</option>
                <option value="paisagem">Paisagem</option>
              </select>
            </div><br />

            <div className="w-full flex flex-col items-center">
              <label className="block mb-2 pro-label text-xl text-center">Ampliação:</label>
              <div className="flex gap-2 items-center">
                <div>
                  <label className="block text-sm text-center">Colunas</label>
                  <input
                    type="number"
                    min="1"
                    className="pro-input px-2 py-1 rounded-md w-20 text-center"
                    value={ampliacao.colunas}
                    onChange={(e) =>
                      setAmpliacao((prev) => ({ ...prev, colunas: parseInt(e.target.value) || 1 }))
                    }
                  />
                </div>
                <span className="text-xl">×</span>
                <div>
                  <label className="block text-sm text-center">Linhas</label>
                  <input
                    type="number"
                    min="1"
                    className="pro-input px-2 py-1 rounded-md w-20 text-center"
                    value={ampliacao.linhas}
                    onChange={(e) =>
                      setAmpliacao((prev) => ({ ...prev, linhas: parseInt(e.target.value) || 1 }))
                    }
                  />
                </div>
              </div>
            </div><br />


            {/* <div className="">
              <label className="pro-label text-center text-xl">Imagem:</label>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
                className="pro-btn-blue
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100 cursor-pointer"
              />
            </div> */}

            <div>
              <>
                {user && (
                  <button
                    onClick={() => {
                      gerarPDF()
                      setAlteracoesPendentes(false)
                    }}
                    className={alteracoesPendentes ? "pro-btn-red" : "pro-btn-purple"}
                  >
                    {alteracoesPendentes ? "Aplicar alterações" : "Gerar PDF"}
                  </button>
                )}
              </>
            </div><br />

            <div>
              <button onClick={resetarConfiguracoes} className="pro-btn-green">
                Resetar Configurações
              </button>
            </div>
          </div>

          {/* Segunda Div */}
          <div className='md:w-4/5 my-4' id='preview'>
            <div className="mx-auto  md:max-w-80 mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary-light via-primary to-primary-dark transition-all duration-500 ease-in-out hover:scale-105">
              <h1 className="sm:text-xl md:text-2xl text-center font-bold text-white">
                Montar Banner em PDF
              </h1>
            </div>

            <div id="pdf-preview" className="w-full border-2 border-gray-300 rounded-lg mx-auto overflow-x-auto flex justify-center items-center p-4 bg-gray-100">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-[600px] mx-auto shadow-lg"
                  title="PDF Preview"
                />
              ) : imagemBase64 ? (
                <img
                  src={imagemBase64}
                  alt="Pré-visualização da imagem carregada"
                  className="max-h-[600px] object-contain rounded-md shadow-md"
                />
              ) : (
                <div className='flex flex-col items-center justify-center min-h-[600px]'>
                  <div className="">
                    <label className="pro-label text-center text-xl">Nenhuma Imagem Selecionada:</label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleFileChange}
                      className="pro-btn-blue
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </AuthenticatedLayout>
  )
}
