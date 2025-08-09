import { useEffect, useState } from 'react'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import { PDFViewer, Document, Page, Image, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  image: {
    marginBottom: 10,
    maxWidth: '100%'
  },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    right: 20,
    fontSize: 10
  }
})

export default function PdfEditor() {
  const { props } = usePage()
  const user = props.auth.user

  const [imagemBase64, setImagemBase64] = useState(null)
  const [ampliacao, setAmpliacao] = useState({ colunas: 2, linhas: 2 })
  const [partesRecortadas, setPartesRecortadas] = useState([])
  const [orientacao, setOrientacao] = useState('retrato')
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false)
  const [mostrarPdf, setMostrarPdf] = useState(false)

  const resetarConfiguracoes = () => {
    setImagemBase64(null)
    setAmpliacao({ colunas: 2, linhas: 2 })
    setPartesRecortadas([])
    setOrientacao('retrato')
    setAlteracoesPendentes(false)
    setMostrarPdf(false)
  }

  useEffect(() => {
    if (imagemBase64) {
      recortarImagem(imagemBase64).then(setPartesRecortadas)
      setAlteracoesPendentes(true)
    }
  }, [ampliacao, orientacao, imagemBase64])

  const recortarImagem = async (base64) => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.src = base64
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const partes = []
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

  const gerarPDF = () => {
    setMostrarPdf(true)
    setAlteracoesPendentes(false)
  }

  const MeuDocumento = () => (
    <Document>
      {partesRecortadas.map((parte, index) => (
        <Page size={orientacao === 'retrato' ? 'A4' : [841.89, 595.28]} style={styles.page} key={index}>
          <Image src={parte} style={styles.image} />
          <Text style={styles.pageNumber}>{index + 1}</Text>
        </Page>
      ))}
    </Document>
  )

  return (
    <AuthenticatedLayout>
      <Head title="PDF Editor" />
      <div className="p-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className='flex flex-col items-center justify-center gap-4 w-full md:w-1/5'>
            <div className='w-full text-center md:text-2xl'>
              <h1>Opções</h1>
            </div>
            <div className="w-full">
              <label className="block mb-1 text-center text-xl">Orientação:</label>
              <select
                className="px-2 w-full rounded-full"
                name="orientacao"
                value={orientacao}
                onChange={(e) => setOrientacao(e.target.value)}
              >
                <option value="retrato">Retrato</option>
                <option value="paisagem">Paisagem</option>
              </select>
            </div>
            <div className="w-full flex flex-col items-center">
              <label className="block mb-2 text-xl text-center">Ampliação:</label>
              <div className="flex gap-2 items-center">
                <div>
                  <label className="block text-sm text-center">Colunas</label>
                  <input
                    type="number"
                    min="1"
                    className="px-2 py-1 rounded-md w-20 text-center"
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
                    className="px-2 py-1 rounded-md w-20 text-center"
                    value={ampliacao.linhas}
                    onChange={(e) =>
                      setAmpliacao((prev) => ({ ...prev, linhas: parseInt(e.target.value) || 1 }))
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <button
                onClick={gerarPDF}
                className={alteracoesPendentes ? "bg-red-500 text-white p-2 rounded" : "bg-purple-600 text-white p-2 rounded"}
              >
                {alteracoesPendentes ? "Aplicar alterações" : "Gerar PDF"}
              </button>
            </div>
            <div>
              <button onClick={resetarConfiguracoes} className="bg-green-600 text-white p-2 rounded">
                Resetar Configurações
              </button>
            </div>
          </div>

          <div className='md:w-4/5 my-4'>
            <div className="mb-4 p-4 rounded bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800">
              <h1 className="text-2xl text-center font-bold text-white">
                Montar Banner em PDF
              </h1>
            </div>
            <div className="w-full border-2 border-gray-300 rounded-lg overflow-x-auto flex justify-center items-center p-4 bg-gray-100 min-h-[600px]">
              {mostrarPdf && partesRecortadas.length > 0 ? (
                <PDFViewer width="100%" height="600">
                  <MeuDocumento />
                </PDFViewer>
              ) : imagemBase64 ? (
                <img
                  src={imagemBase64}
                  alt="Pré-visualização da imagem carregada"
                  className="max-h-[600px] object-contain rounded-md shadow-md"
                />
              ) : (
                <div className='flex flex-col items-center justify-center min-h-[600px]'>
                  <div className="text-center">
                    <label className="text-xl">Nenhuma Imagem Selecionada:</label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleFileChange}
                      className="mt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
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
