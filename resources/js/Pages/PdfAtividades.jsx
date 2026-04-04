import { useEffect, useRef, useState } from 'react'
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'
import axios from 'axios'
import * as pdfjsLib from 'pdfjs-dist'
import Footer from '@/Components/Footer'
import FullScreenSpinner from '@/Components/FullScreenSpinner'
import PdfPreview from './Atividades/Partials/PdfPreview'
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useMensagens } from '@/hooks/useMensagens'
import { MENSAGENS_SISTEMA } from '@/constantes/mensagens'
import { useDownloadPdf } from '@/hooks/useDownloadPdf'
import { gerarPDFService } from '@/Services/PdfGeneratorService'
import FolderPlusIcon from '@/Components/svgs/FolderPlusIcon'
import PlusIcon from '@/Components/svgs/PlusIcon'
import { usePdfThumbnail } from '@/hooks/usePdfThumbnail'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'


export default function PdfEditor() {
  const { auth } = usePage().props;
  const user = auth.user;

  // Instancia o gerenciador de mensagens
  const { getMsgLocal, podeExibir, silenciar, confirmarComCheck, exibirAvisoCritico } = useMensagens();

  //Instancia o gerenciador de dowloads
  const { processarDownload } = useDownloadPdf();

  // Movi a lógica de limpeza para uma função separada para não repetir código
  const executarLimpeza = () => {
    setImagens([]);
    setPdfUrl(null);
    setPaginaAtual(1);
    setAlteracoesPendentes(false);
  };

  const [pdfs, setPdfs] = useState([])
  const [pdfSelecionadoModal, setPdfSelecionadoModal] = useState(null);

  // Função para remover do array e liberar memória do navegador
  const removerPdf = (id) => {
    setPdfs((prev) => {
      // Busca o PDF para revogar a URL antes de excluir do estado
      const pdfParaRemover = prev.find(p => p.id === id);
      if (pdfParaRemover && pdfParaRemover.url) {
        URL.revokeObjectURL(pdfParaRemover.url);
      }
      return prev.filter(p => p.id !== id);
    });

    // Se o PDF excluído for o que está sendo visualizado no momento, limpa o preview
    setPdfUrl(currentUrl => {
      const pdfExcluido = pdfs.find(p => p.id === id);
      return (pdfExcluido && pdfExcluido.url === currentUrl) ? null : currentUrl;
    });

    // setAlteracoesPendentes(true)
  };

  const comecarNovaPagina = async () => {
    const config = getMsgLocal('limpar_mesa');
    const temConteudo = imagens.some(Boolean);

    if (temConteudo) {
      // Verifica se o usuário já silenciou esse ID específico
      if (config && podeExibir(config.id)) {
        const result = await confirmarComCheck(config);

        if (result.isConfirmed) {
          // Se o checkbox foi marcado, salvamos no localStorage AGORA
          if (result.value.isChecked) {
            silenciar(config.id);
          }
          // Depois de salvar a preferência, executa a limpeza
          executarLimpeza();
        }
        return; // Interrompe para não executar a limpeza duas vezes
      }
    }

    // Se já estiver silenciado ou não tiver conteúdo, limpa direto
    executarLimpeza();
  };

  const baixarTodosPdfsUnificados = async () => {
    if (!pdfs || pdfs.length === 0) {
      alert("Nenhum PDF no histórico para mesclar.");
      return;
    }

    try {
      setCarregando(true);

      // 1. Cria o documento mestre
      const pdfUnificado = await PDFDocument.create();

      // 2. Mescla as páginas (Lógica que já tínhamos)
      for (const item of pdfs) {
        const resposta = await fetch(item.url);
        const arrayBuffer = await resposta.arrayBuffer();
        const pdfIndividual = await PDFDocument.load(arrayBuffer);
        const paginasCopiadas = await pdfUnificado.copyPages(
          pdfIndividual,
          pdfIndividual.getPageIndices()
        );
        paginasCopiadas.forEach((pagina) => pdfUnificado.addPage(pagina));
      }

      // 3. Salva os bytes do PDF unificado
      const pdfFinalBytes = await pdfUnificado.save();
      const blobFinal = new Blob([pdfFinalBytes], { type: 'application/pdf' });
      const urlFinal = URL.createObjectURL(blobFinal);

      // --- INÍCIO DA SUA LÓGICA DE CONTABILIZAÇÃO ---

      // 4. Envia para o servidor para contar o download
      // Enviamos um nome genérico ou "pacote_completo" para o backend
      const response = await axios.post(route('user.downloads.storePacote'), {
        file_name: 'atividades.pdf', // Mantém o nome que você deseja
        quantidade: pdfs.length      // Envia quantos créditos devem ser cobrados
      });

      // 5. Pega o total retornado pelo seu banco de dados
      const total = response.data.total_downloads;
      const nomeArquivo = `Atividades-Completo-${total}.pdf`;

      // 6. Dispara o download com o nome oficial
      const link = document.createElement('a');
      link.href = urlFinal;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // --- FIM DA LÓGICA DE CONTABILIZAÇÃO ---

      // Limpeza
      setTimeout(() => URL.revokeObjectURL(urlFinal), 100);

    } catch (error) {
      // DESATIVA o carregamento antes de mostrar qualquer aviso
      setCarregando(false);

      const status = error.response?.status;
      const data = error.response?.data;

      console.error("Erro ao unificar e contabilizar:", status, data);

      if (status === 403) {
        if (data?.error === 'limite_atingido') {
          const configMsg = MENSAGENS_SISTEMA?.global?.limite_downloads;

          if (configMsg) {
            const result = await exibirAvisoCritico(configMsg);
            if (result.isConfirmed) {
              router.visit('/pagamentos');
            }
          } else {
            alert(data.message || 'Limite de créditos insuficiente para baixar o pacote.');
            router.visit('/pagamentos');
          }
        } else {
          alert(data?.message || 'Ação não permitida.');
        }
        return;
      }

      if (status === 422) {
        alert('Erro de validação: ' + (data?.message || 'Verifique seus créditos.'));
        return;
      }

      alert('Erro ao processar o arquivo ou contabilizar o download.');
    } finally {
      // Garante que o loading saia se o fluxo for de sucesso
      setCarregando(false);
    }
  };

  const [showMobileList, setShowMobileList] = useState(false);

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
  const espessuraBorda = 22;   // grossura da moldura, em px
  const tamanhoTile = 150;    // tamanho do “azulejo” (escala do padrão)

  const [cabecalhoAtivo, setCabecalhoAtivo] = useLocalStorage("cabecalhoAtivo", false);
  const [cabecalhoBorder, setCabecalhoBorder] = useLocalStorage("cabecalhoBorder", false);
  const [cabecalhoTexto, setCabecalhoTexto] = useLocalStorage("cabecalhoTexto", [
    "ESCOLA ",
    "PROFESSOR(A):",
    "ALUNO:__________________________________________________",
    "TURMA:",
  ]);
  const [cabecalhoModo, setCabecalhoModo] = useState("ambas"); // 'ambas', 'impares', 'pares', 'nenhuma'

  const [modoDimensionamento, setModoDimensionamento] = useState('grid');
  const [tamanhoCm, setTamanhoCm] = useState({ largura: 19.0, altura: 27.7 }); // Tamanho em cm

  const adicionarPrimeiraImagem = (novaImagem, modoRepeticao) => {
    const makeItem = (img) =>
      typeof img === "string" ? { src: img, uid: Date.now() + Math.random() } : img;

    setImagens((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      // normaliza entradas existentes (string -> objeto)
      const normalized = prevArr.map((im) =>
        !im ? null : (typeof im === "string" ? makeItem(im) : im)
      );

      const imagensExistentes = normalized.filter(Boolean);
      const item = makeItem(novaImagem);

      if (modoRepeticao === "all") {
        const novoArrayRepetido = [];
        // repete as imagens existentes + nova
        const pool = imagensExistentes.length ? imagensExistentes.concat(item) : [item];
        for (let i = 0; i < totalSlots; i++) {
          novoArrayRepetido.push(pool[i % pool.length] || null);
        }
        return novoArrayRepetido;
      } else {
        // modo none: adiciona ao final (preserva índices anteriores)
        const novoArray = imagensExistentes.concat(item);
        while (novoArray.length < totalSlots) novoArray.push(null);
        return novoArray;
      }
    });

    setAlteracoesPendentes(true);
  };


  useEffect(() => {
    setImagens((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      const normalized = prevArr.map((im) =>
        !im ? null : (typeof im === "string" ? { src: im, uid: Date.now() + Math.random() } : im)
      );

      if (normalized.length === totalSlots) return normalized;

      const novas = Array.from({ length: totalSlots }, (_, idx) => normalized[idx] ?? null);

      if (repeatMode === "all") {
        const imagensExistentes = normalized.filter(Boolean);
        if (imagensExistentes.length > 0) {
          for (let i = 0; i < totalSlots; i++) {
            novas[i] = imagensExistentes[i % imagensExistentes.length];
          }
        }
      }

      return novas;
    });
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
    setCabecalhoAtivo(false);
    setCabecalhoTexto(["ESCOLA ", "PROFESSOR(A):", "ALUNO:__________________________________________________", "TURMA:"]);
    setCabecalhoModo("ambas");

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


  const [resumoTamanho, setResumoTamanho] = useState({
    imagem: null,
    imagemBorda: null,
    imagemCabecalho: null,
    imagemCompleta: null,
  });

  {/* Resuma da atividads */ }
  useEffect(() => {
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const CM_TO_POINTS = 28.3465;

    const pageWidth = orientacao === "retrato" ? A4_WIDTH : A4_HEIGHT;
    const pageHeight = orientacao === "retrato" ? A4_HEIGHT : A4_WIDTH;

    const margin = 0.5 * CM_TO_POINTS;
    const gap = 6;

    const cols = Math.max(ampliacao?.colunas || 1, 1);
    const rows = Math.max(ampliacao?.linhas || 1, 1);

    const usableW = pageWidth - margin * 2;
    const usableH = pageHeight - margin * 2;

    const cellW = (usableW - (cols - 1) * gap) / cols;
    const cellH = (usableH - (rows - 1) * gap) / rows;

    // bordas em pontos
    const fixedBorderHeight = (espessuraBorda * CM_TO_POINTS) / 10;
    const fixedBorderWidth = (espessuraBorda * CM_TO_POINTS) / 10;
    const totalBorderW = repeatBorder !== "none" ? fixedBorderWidth * 2 : 0;
    const totalBorderH = repeatBorder !== "none" ? fixedBorderHeight * 2 : 0;

    // cabeçalho
    let cabecalhoAltura = 0;
    if (cabecalhoAtivo && cabecalhoTexto.length > 0) {
      cabecalhoAltura = cabecalhoTexto.length * 16; // mesmo critério usado no PDF
    }

    // conversor
    const toCm = (pts) => (pts / CM_TO_POINTS).toFixed(1);

    // só imagem
    const imagem = {
      largura: toCm(cellW - totalBorderW),
      altura: toCm(cellH - totalBorderH - cabecalhoAltura),
    };

    // imagem + bordas
    const imagemBorda = repeatBorder !== "none" ? {
      largura: toCm(cellW),
      altura: toCm(cellH - cabecalhoAltura),
    } : null;

    // imagem + cabeçalho
    const imagemCabecalho = cabecalhoAtivo ? {
      largura: toCm(cellW - totalBorderW),
      altura: toCm(cellH),
    } : null;

    // imagem + bordas + cabeçalho
    const imagemCompleta = repeatBorder !== "none" && cabecalhoAtivo ? {
      largura: toCm(cellW),
      altura: toCm(cellH),
    } : null;

    setResumoTamanho({ imagem, imagemBorda, imagemCabecalho, imagemCompleta });
  }, [ampliacao, orientacao, repeatBorder, espessuraBorda, cabecalhoAtivo, cabecalhoTexto, modoDimensionamento, tamanhoCm]);


  /* Função que chama o Gerador de pdf  */
  const gerarPDF = async () => {
    // 1. Ativa o loader IMEDIATAMENTE
    console.log('Iniciando processo de geração de PDF...');
    try {
      // 2. Chama o serviço (adicione o 'await' se o serviço for uma Promise)
      await gerarPDFService(
        imagens,
        ampliacao,
        orientacao,
        aspecto,
        setPdfUrl,
        setPaginaAtual,
        setAlteracoesPendentes,
        setErroPdf,
        repeatBorder,
        5,
        5,
        cabecalhoTexto,
        cabecalhoAtivo,
        cabecalhoModo,
        modoDimensionamento,
        tamanhoCm,
        cabecalhoBorder,
        setPdfs
      );
      setAlteracoesPendentes(false)
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setErroPdf("Falha ao gerar o arquivo.");
    } finally {
      // 3. Garante que o loader pare, aconteça o que acontecer
      setAlteracoesPendentes(false)

    }
  };

  /* Hook para gerar as Thumbs */
  const PdfThumbnail = ({ url }) => {
    const thumb = usePdfThumbnail(url);

    return (
      <div className="w-full bg-gray-100 rounded flex items-center justify-center overflow-hidden border">
        {thumb ? (
          <img src={thumb} alt="Preview" className="object-cover w-full h-full" />
        ) : (
          <span className="text-xs text-gray-400">Carregando...</span>
        )}
      </div>
    );
  };


  return (
    <>
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

              {/* Repetir ou não as imagens */}
              <div className="w-full">
                <label className="block mb-1 pro-label text-center text-xl">Ativar Repetição:</label>
                <select
                  value={repeatMode}
                  onChange={(e) => {
                    setRepeatMode(e.target.value);
                    setAlteracoesPendentes(true);
                  }}
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
                  onChange={(e) => { setBorder(e.target.value); setAlteracoesPendentes(true); }}
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
                  onChange={(e) => {
                    setCabecalhoAtivo(e.target.checked);
                    setAlteracoesPendentes(true);
                  }}
                />
                Mostrar Cabeçalho:
              </label>

              {cabecalhoAtivo && (
                <div className="w-full mt-2">
                  <label className="block mb-1 pro-label text-center text-xl">
                    Modo de Exibição:
                  </label>
                  <select
                    value={cabecalhoModo}
                    onChange={(e) => {
                      setCabecalhoModo(e.target.value);
                      setAlteracoesPendentes(true);
                    }}
                    className="px-2 w-full rounded-full pro-input"
                  >
                    <option value="ambas">Todas as páginas</option>
                    <option value="impares">Somente Páginas Ímpares</option>
                    <option value="pares">Somente Páginas Pares</option>
                    <option value="nenhuma">Não mostrar em nenhuma</option>
                  </select>

                  <label className="flex items-center gap-2 pro-label text-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cabecalhoBorder}
                      onChange={(e) => {
                        setCabecalhoBorder(e.target.checked);
                        setAlteracoesPendentes(true);
                      }}
                    />
                    Bordas no Cabeçalho
                  </label>
                </div>
              )}


              <div className="w-full">
                {cabecalhoAtivo && ( // Use cabecalhoAtivo para mostrar os inputs
                  <>
                    {cabecalhoTexto.map((linha, index) => (
                      <input
                        key={index}
                        type="text"
                        value={linha}
                        onChange={(e) => {
                          const valor = e.target.value;
                          const maxPorLinha = orientacao === "paisagem" ? 60 : 42;
                          const ajustado = valor.slice(0, maxPorLinha);
                          const novoTexto = [...cabecalhoTexto];
                          novoTexto[index] = ajustado;
                          setCabecalhoTexto(novoTexto);
                          setAlteracoesPendentes(true);
                        }}
                        maxLength={orientacao === "paisagem" ? 60 : 42}
                        className="w-full border rounded p-2 mt-2 pro-input"
                        placeholder={`Linha ${index + 1}`}
                      />
                    ))}

                    <p className="text-gray-500 mt-1">
                      Máximo de {orientacao === "paisagem" ? 60 : 42} caracteres por linha.
                    </p>
                  </>
                )}
              </div>

              {/* Botões */}
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
                            cabecalhoTexto,
                            cabecalhoAtivo,
                            cabecalhoModo,
                            modoDimensionamento,
                            tamanhoCm,
                            cabecalhoBorder,
                            setPdfs,
                          );

                          setCarregando(false);
                        }}
                        className={alteracoesPendentes ? "pro-btn-red" : "pro-btn-blue"}
                      >
                        Aplicar alterações e Salvar no Histórico
                      </button>
                    )}

                    {carregando && (
                      <FullScreenSpinner />
                    )}

                  </>
                )}
              </div>

              {/* Seção de Histórico com Miniaturas */}

              <div className='w-full'>
                {/* --- BOTÃO MOBILE --- */}

                {pdfs.length > 0 && (
                  <div className="sm:hidden w-full">
                    {!showMobileList ? (
                      <button onClick={() => setShowMobileList(true)} className="pro-btn-purple" >
                        Visualizar Atividades Salvas ({pdfs.length})
                      </button>
                    ) : (
                      <button onClick={() => setShowMobileList(false)} className="pro-btn-purple" >
                        Voltar / Fechar
                      </button>
                    )}
                  </div>
                )}

                {/* --- LISTA EXPANDIDA MOBILE (Imagens Grandes) --- */}
                {showMobileList && (
                  <div className="sm:hidden flex flex-col gap-8 p-4 bg-gray-50">
                    {pdfs.map((pdf) => (
                      <div key={pdf.id} className="bg-white rounded-xl shadow-md border p-2">
                        {/* Imagem ocupando largura total, altura automática */}
                        <div className="w-full">
                          <PdfThumbnail url={pdf.url} className="w-full h-auto rounded-lg" />
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button onClick={() => processarDownload(pdf, 'atividades')}
                            className="flex-1 pro-btn-green-no-outline text-sm"
                          >
                            Baixar PDF
                          </button>
                          <button onClick={() => removerPdf(pdf.id)} className="pro-btn-red-no-outline text-sm">
                            Excluir
                          </button>
                        </div>
                        <p className="text-center text-[10px] text-gray-400 mt-2 uppercase">
                          Gerado às {new Date(pdf.id).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* --- GRID DESKTOP (Inalterado) --- */}
                <div className="hidden sm:grid grid-cols-2  md:grid-cols-3 gap-4">
                  {pdfs.map((pdf) => (
                    <div key={pdf.id} className="group relative bg-white p-2 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                      <PdfThumbnail url={pdf.url} />
                      <div className="mt-2 text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">
                          {new Date(pdf.id).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Overlay Desktop (Hover) */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 rounded-lg">
                        {/* <button onClick={() => setPdfSelecionadoModal(pdf)} className="bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-bold hover:bg-purple-500">
                          Visualizar
                        </button> */}
                        <button onClick={() => processarDownload(pdf, 'atividades')} className="pro-btn-green-no-outline">
                          Baixar
                        </button>
                        <button onClick={() => removerPdf(pdf.id)} className="pro-btn-red-no-outline">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>


              {/* Modal de Visualização */}
              {pdfSelecionadoModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4">
                  <div className="relative bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                    {/* Cabeçalho do Modal */}
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold">Visualizando PDF Antigo</h3>
                      <button
                        onClick={() => setPdfSelecionadoModal(null)}
                        className="text-2xl font-bold hover:text-red-500"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Corpo do Modal - Aqui usamos o seu componente PdfPreview já existente */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-200">
                      <div className="absolute top-0 left-0 w-full h-12 z-10 bg-transparent" />
                      <iframe src={pdfSelecionadoModal.url}  className="w-full h-[70vh]" title="Preview"                />
                    </div>

                    {/* Rodapé do Modal */}
                    <div className="p-4 border-t flex justify-end gap-2">
                      <button onClick={() => processarDownload(pdfSelecionadoModal, 'atividades')} className="pro-btn-green px-4 py-2" >
                        Download
                      </button>
                      <button onClick={() => setPdfSelecionadoModal(null)} className="bg-gray-500 text-white px-4 py-2 rounded-full" >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {pdfs.length > 1 && (
                <div className="w-full flex justify-center ">
                  <button
                    onClick={baixarTodosPdfsUnificados}
                    className="pro-btn-blue flex items-center justify-center  shadow-xl hover:scale-105 transition-transform" >
                    <FolderPlusIcon> Gerar Arquivo Único ({pdfs.length} atividades)  </FolderPlusIcon>
                  </button>
                </div>
              )}

              {/* BOTÃO DE NOVA PÁGINA */}
              {pdfs.length > 0 && pdfs.length <= 5 && (
                <div className="w-full flex justify-center">
                  <button
                    onClick={comecarNovaPagina}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-full border-2 border-dashed border-gray-300 transition-all"
                  >
                    <PlusIcon>Começar Nova Página</PlusIcon>
                  </button>
                </div>
              )}

              <div div className='w-full'>
                <button onClick={resetarConfiguracoes} className="pro-btn-slate">
                  Resetar Configurações
                </button>
              </div>
            </div>

            <h3 className='p-2 text-center font-bold sm:text-xl'>Resumo das atividades:</h3>
            <div className="p-3 mb-3 border rounded text-center bg-gray-50 sm:text-lg">
              <p>
                {resumoTamanho.imagemCompleta ? (
                  <>✨ <b>Imagem + Bordas + Cabeçalho:</b> {resumoTamanho.imagemCompleta.largura} × {resumoTamanho.imagemCompleta.altura} cm aproximadamente</>
                ) : resumoTamanho.imagemCabecalho ? (
                  <>➕ <b>Imagem + Cabeçalho:</b> {resumoTamanho.imagemCabecalho.largura} × {resumoTamanho.imagemCabecalho.altura} cm aproximadamente</>
                ) : resumoTamanho.imagemBorda ? (
                  <>➕ <b>Imagem + Bordas:</b> {resumoTamanho.imagemBorda.largura} × {resumoTamanho.imagemBorda.altura} cm aproximadamente</>
                ) : resumoTamanho.imagem ? (
                  <>📐 <b>Imagem:</b> {resumoTamanho.imagem.largura} × {resumoTamanho.imagem.altura} cm aproximadamente</>
                ) : (
                  <>Nenhuma imagem disponível</>
                )}
              </p>

            </div>

          </div>

          {/* Coluna do Preview */}
          <div className="w-full lg:w-2/3 flex flex-col justify-center items-center " id="preview">
            <div className="flex flex-col items-center justify-center gap-4 w-full " id="preview-column">

              <div className="mx-auto  rounded-2xl ">
                <h1 className="sm:text-xl md:text-2xl text-center font-bold whitespace-nowrap">
                  Preview {" "}
                  <span>
                    {pdfUrl ? "do PDF" : "da Imagem"}
                  </span>
                </h1>
              </div>

              {/*Componente Preview da Imagem/Pdf  */}
              <PdfPreview
                imagens={imagens}
                setImagens={setImagens}
                cabecalhoAtivo={cabecalhoAtivo}
                cabecalhoTexto={cabecalhoTexto}
                cabecalhoModo={cabecalhoModo}
                repeatBorder={repeatBorder}
                espessuraBorda={espessuraBorda}
                tamanhoTile={tamanhoTile}
                orientacao={orientacao}
                ampliacao={ampliacao}
                totalSlots={totalSlots}
                aspecto={aspecto}
                removerImagem={(index) => {
                  setImagens((prev) => {
                    const novas = [...prev];
                    novas[index] = null;
                    return novas;
                  });
                  setAlteracoesPendentes(true);

                }}
                setAlteracoesPendentes={setAlteracoesPendentes}
                erroPdf={erroPdf}
                carregando={carregando}
                adicionarPrimeiraImagem={adicionarPrimeiraImagem}
                repeatMode={repeatMode}
                cabecalhoBorder={cabecalhoBorder}
              />

              <div className="flex flex-col gap-2 w-full">
                {user && (
                  <>
                    {pdfUrl && !alteracoesPendentes && (
                      <button
                        onClick={() => processarDownload({ url: pdfUrl }, 'atividades')}
                        className="pro-btn-green mt-2"
                        disabled={!pdfUrl}>
                        Baixar o PDF do Preview
                      </button>
                    )}

                    {carregando && (
                      <FullScreenSpinner />
                    )}

                  </>
                )}
              </div>

            </div>

          </div>

        </div>
      </div >

      <Footer ano={2025} />
    </>
  )
}

/**
 * Aqui definimos o layout para o Inertia — o layout NÃO será desmontado entre navegações.
 * Repare que passamos o header (que era usado anteriormente) para o AuthenticatedLayout.
 */
PdfEditor.layout = page => (
  <AuthenticatedLayout
    auth={page.props.auth}
  // header={
  //   <h2 className="text-xl font-semibold leading-tight text-gray-800">
  //     Bem-vindo ao PDF Digital Fácil!
  //   </h2>
  // }
  >
    {page}
  </AuthenticatedLayout>
);
