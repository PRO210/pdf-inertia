import { memo, useEffect, useRef, useState } from 'react'
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
import { useMensagens } from '@/Hooks/useMensagens'
import { MENSAGENS_SISTEMA } from '@/constantes/mensagens'
import { useDownloadPdf } from '@/Hooks/useDownloadPdf'
import { gerarPDFService } from '@/Services/PdfGeneratorService'
import { useLimpezaDados } from '@/Hooks/useLimpezaDados'
import HeaderConfig from '@/Components/PdfEditor/HeaderConfig'
import PageSettings from '@/Components/PdfEditor/PageSettings'
import ResumoAtividade from '@/Components/PdfEditor/ResumoAtividade'

import PdfActions from '@/Components/PdfEditor/PdfActions'
import PdfHistory from '@/Components/PdfEditor/PdfHistory'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'


export default function PdfEditor() {
  const { auth } = usePage().props;
  const user = auth.user;

  console.log(auth.alertService);
  console.log(auth.alertService.isBlocked);
  console.log("Verificando isBlocked:", auth.alertService?.isBlocked);

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
  const limiteAtingido = pdfs.length >= 6;

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
    "ALUNO:______________________________________________",
    "TURMA:",
  ]);
  const [cabecalhoModo, setCabecalhoModo] = useState("ambas"); // 'ambas', 'impares', 'pares', 'nenhuma'
  const [cabecalhoTipo, setCabecalhoTipo] = useState("texto"); // texto | imagem | ambos

  const [cabecalhoImagem, setCabecalhoImagem] = useState(null);

  const [modoDimensionamento, setModoDimensionamento] = useState('grid');
  const [tamanhoCm, setTamanhoCm] = useState({ largura: 28.7, altura: 21 }); // Tamanho em cm

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

  const [resumoTamanho, setResumoTamanho] = useState({
    imagem: null,
    imagemBorda: null,
    imagemCabecalho: null,
    imagemCompleta: null,
  });

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
        setPdfs,
        cabecalhoTipo,
        cabecalhoImagem,
      );
      setAlteracoesPendentes(false)

      // Após o sucesso da geração do arquivo ou salvamento:
      router.reload({
        only: ['auth'], // Pede ao Laravel para reenviar apenas os dados de auth (onde está o alerta)
        onSuccess: () => {
          console.log("Contagem de downloads atualizada!");
        }
      });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setErroPdf("Falha ao gerar o arquivo.");
    } finally {
      // 3. Garante que o loader pare, aconteça o que acontecer
      setAlteracoesPendentes(false)

    }
  };

  const { limparHistoricoPdfs, resetarConfiguracoesGeral } = useLimpezaDados();

  // Handler para o botão de limpar histórico (o que você criou agora pouco)
  const handleLimparTudo = () => {
    limparHistoricoPdfs(pdfs, setPdfs, setPdfUrl);
  };

  // Handler para o botão de resetar configurações (o que já existia)
  const handleResetConfig = () => {
    resetarConfiguracoesGeral(resetarConfiguracoes);
  };


  useEffect(() => {
    if (modoDimensionamento !== "custom") return;

    const CM_TO_POINTS = 28.3465;

    // A4
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    const margin = 0.5 * CM_TO_POINTS;
    const gap = 3;

    const pageWidth = orientacao === "retrato" ? A4_WIDTH : A4_HEIGHT;
    const pageHeight = orientacao === "retrato" ? A4_HEIGHT : A4_WIDTH;

    const usableW = pageWidth - margin * 2;
    const usableH = pageHeight - margin * 2;

    const cellW = tamanhoCm.largura * CM_TO_POINTS;
    const cellH = tamanhoCm.altura * CM_TO_POINTS;

    const cols = Math.max(1, Math.floor((usableW + gap) / (cellW + gap)));
    const rows = Math.max(1, Math.floor((usableH + gap) / (cellH + gap)));

    setAmpliacao((prev) => ({
      ...prev,
      colunas: cols,
      linhas: rows,
    }));

  }, [tamanhoCm, orientacao, modoDimensionamento]);

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

              {/* Configurações Gerais do PDF */}
              <PageSettings
                modoDimensionamento={modoDimensionamento}
                setModoDimensionamento={setModoDimensionamento}

                tamanhoCm={tamanhoCm}
                setTamanhoCm={setTamanhoCm}

                orientacao={orientacao}
                setOrientacao={setOrientacao}

                aspecto={aspecto}
                setAspecto={setAspecto}

                ampliacao={ampliacao}
                setAmpliacao={setAmpliacao}

                repeatMode={repeatMode}
                setRepeatMode={setRepeatMode}

                repeatBorder={repeatBorder}
                setBorder={setBorder}

                setAlteracoesPendentes={setAlteracoesPendentes}
              />

              {/* Cabeçalho */}
              <HeaderConfig
                cabecalhoAtivo={cabecalhoAtivo}
                setCabecalhoAtivo={setCabecalhoAtivo}

                cabecalhoModo={cabecalhoModo}
                setCabecalhoModo={setCabecalhoModo}

                cabecalhoTipo={cabecalhoTipo}
                setCabecalhoTipo={setCabecalhoTipo}

                cabecalhoImagem={cabecalhoImagem}
                setCabecalhoImagem={setCabecalhoImagem}

                cabecalhoBorder={cabecalhoBorder}
                setCabecalhoBorder={setCabecalhoBorder}

                cabecalhoTexto={cabecalhoTexto}
                setCabecalhoTexto={setCabecalhoTexto}

                orientacao={orientacao}

                setAlteracoesPendentes={setAlteracoesPendentes}
              />

              {/* Botões */}
              <PdfActions
                imagens={imagens}
                alteracoesPendentes={alteracoesPendentes}
                carregando={carregando}
                limiteAtingido={limiteAtingido}
                gerarPDF={gerarPDF}
                pdfUrl={pdfUrl}
                processarDownload={processarDownload}
                auth={auth}
                handleResetConfig={handleResetConfig}
              />

              {/* Seção de Histórico com Miniaturas */}
              <PdfHistory
                pdfs={pdfs}
                showMobileList={showMobileList}
                setShowMobileList={setShowMobileList}
                pdfSelecionadoModal={pdfSelecionadoModal}
                setPdfSelecionadoModal={setPdfSelecionadoModal}
                processarDownload={processarDownload}
                removerPdf={removerPdf}
                baixarTodosPdfsUnificados={baixarTodosPdfsUnificados}
                handleLimparTudo={handleLimparTudo}
                comecarNovaPagina={comecarNovaPagina}
                auth={auth}
              />


            </div>

            {/* Resumo das atividades(Tamanhos) */}
            <ResumoAtividade
              resumoTamanho={resumoTamanho}
            />

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
                paginaAtual
                limiteAtingido={limiteAtingido}             
                cabecalhoTipo={cabecalhoTipo}
                cabecalhoImagem={cabecalhoImagem}
              />

              <div className="flex flex-col gap-2 w-full">
                {user && (
                  <>
                    {/* CONDIÇÃO DE DOWNLOAD: 
                    Só mostra o botão de download se:
                    1. Tiver a URL do PDF
                    2. Não houver alterações pendentes
                    3. O usuário NÃO estiver bloqueado (isBlocked === false)
                */}
                    {pdfUrl && !alteracoesPendentes && !auth.alertService.isBlocked && (
                      <button
                        onClick={() => processarDownload({ url: pdfUrl }, 'atividades')}
                        className="pro-btn-green mt-2"
                        disabled={!pdfUrl}
                      >
                        Baixar o PDF do Preview
                        {/* {auth.alertService.isBlocked && ` (Limite de ${auth.alertService.usage} PDFs atingido)`} */}
                      </button>
                    )}

                    {carregando && <FullScreenSpinner />}
                  </>
                )}

                {/* BANNER DE BLOQUEIO:
                  Aparece apenas quando o limite free acaba e o usuário não é PRO.
              */}
                {auth.alertService.isBlocked && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-4 rounded shadow-sm mt-4 flex flex-col sm:flex-row items-center justify-between gap-4" role="alert">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-bold">Limite Atingido</p>
                        <p className="text-sm opacity-90">{auth.alertService.message}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => router.visit(route('pagamento.retorno'))}
                      className="w-full sm:w-auto bg-red-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md"
                    >
                      Assinar Plano PRO
                    </button>
                  </div>
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
