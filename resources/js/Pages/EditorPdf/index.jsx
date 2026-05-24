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
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useMensagens } from '@/Hooks/useMensagens'
import { MENSAGENS_SISTEMA } from '@/constantes/mensagens'
import { gerarPDFService } from '@/Services/PdfGeneratorService'
import { useLimpezaDados } from '@/Hooks/useLimpezaDados'
import HeaderConfig from '@/Components/PdfEditor/HeaderConfig'
import PageSettings from '@/Components/PdfEditor/PageSettings'
import ResumoAtividade from '@/Components/PdfEditor/ResumoAtividade'
import PdfActions from '@/Components/PdfEditor/PdfActions'
import PdfHistory from '@/Components/PdfEditor/PdfHistory'
import PdfPageThumbnail from '@/Components/EditorPdf/PdfPageThumbnail'
import PdfHeaderConfig from '@/Components/EditorPdf/PdfHeaderConfig'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'


export default function EditorPdf() {
  const { auth } = usePage().props;
  const user = auth.user;

  // console.log(auth.alertService);
  // console.log(auth.alertService.isBlocked);
  // console.log("Verificando isBlocked:", auth.alertService?.isBlocked);

  // Instancia o gerenciador de mensagens
  const { getMsgLocal, podeExibir, silenciar, confirmarComCheck, exibirAvisoCritico } = useMensagens();



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


  const [totalPages, setTotalPages] = useState(0);
  const [pagesConfig, setPagesConfig] = useState([]);
  const [arquivoRaw, setArquivoRaw] = useState(null);
  const [pdfModificadoUrl, setPdfModificadoUrl] = useState(null);
  const [cabecalhoLayout, setCabecalhoLayout] = useState('sobreposto');







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


  const [resumoTamanho, setResumoTamanho] = useState({
    imagem: null,
    imagemBorda: null,
    imagemCabecalho: null,
    imagemCompleta: null,
  });


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



  // 2. Na função de disparo do download/modificação:
  const processarDownload = async () => {
    if (!arquivoRaw) return;

    try {

      setCarregando(true);
      // Limpa um download anterior, se houver
      if (pdfModificadoUrl) {
        URL.revokeObjectURL(pdfModificadoUrl);
        setPdfModificadoUrl(null);
      }

      const formData = new FormData();

      // Anexa o arquivo físico bruto que está na memória do navegador
      formData.append('pdf_file', arquivoRaw);

      // Anexa o array de configurações convertido em string JSON
      formData.append('paginas', JSON.stringify(pagesConfig));

      // Anexa dados globais adicionais que o cabeçalho do TCPDF vai precisar ler
      formData.append('textos_cabecalho', JSON.stringify(cabecalhoTexto));

      // Anexa o layout do cabeçalho (sobreposto ou deslocado)
      formData.append('cabecalho_layout', cabecalhoLayout);

      formData.append('cabecalho_tipo', cabecalhoTipo); // 'texto', 'ambos', 'imagem', 'banner'
      formData.append('cabecalho_imagem', cabecalhoImagem); // String Base64 contendo a imagem ou null

      // Dentro da sua função processarDownload:
      formData.append('borda_tipo', repeatBorder); // Envia "lapis", "abelhas", "none", etc.



      const response = await axios.post(route('gerar.pdf.canvas'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      // Em vez de baixar direto, criamos a URL e salvamos no estado do componente
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const urlGerada = window.URL.createObjectURL(blob);

      setPdfModificadoUrl(urlGerada);

      setAlteracoesPendentes(false);

      // Atualiza os dados de limite/auth se necessário
      router.reload({ only: ['auth'] });


      // Código de download do blob retornado...
    } catch (error) {
      console.error("Erro ao processar as alterações:", error);
      alert("Erro ao processar modificações no servidor.");

    } finally {
      setCarregando(false);
    }
  }

  // ETAPA 2: Executada localmente no navegador quando o usuário clica no botão de download
  const baixarArquivoGerado = () => {
    if (!pdfModificadoUrl) return;

    const link = document.createElement('a');
    link.href = pdfModificadoUrl;
    link.download = 'atividade_modificada.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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



  //
  //
  useEffect(() => {
    if (!pdfUrl) {
      setTotalPages(0);
      setPagesConfig([]);
      return;
    }

    const numPagesLoad = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        setTotalPages(pdf.numPages);

        // Inicializa o array com as configurações padrões para cada página
        const initialConfig = Array.from({ length: pdf.numPages }, (_, index) => ({
          page: index + 1,
          include: true,        // Vai para o modificado por padrão
          hasHeader: false,     // Sem cabeçalho por padrão
          headerType: "simple"  // Tipo padrão de cabeçalho
        }));

        setPagesConfig(initialConfig);
      } catch (error) {
        console.error("Erro ao obter total de páginas:", error);
      }
    };

    numPagesLoad();
  }, [pdfUrl]);

  // Função utilitária para atualizar a propriedade de uma página específica
  const updatePageConfig = (pageNumber, field, value) => {
    setPagesConfig(prev =>
      prev.map(item =>
        item.page === pageNumber ? { ...item, [field]: value } : item
      )
    );
  };

  useEffect(() => {
    setPagesConfig((prev) =>
      prev.map((page) => {
        let hasHeader = page.hasHeader;

        // Interruptor mestre
        if (!cabecalhoAtivo) {
          return {
            ...page,
            hasHeader: false,
          };
        }


        switch (cabecalhoModo) {
          case "ambas":
            hasHeader = true;
            break;

          case "pares":
            hasHeader = page.page % 2 === 0;
            break;

          case "impares":
            hasHeader = page.page % 2 !== 0;
            break;

          case "primeira_pagina":
            hasHeader = page.page === 1;
            break;

          case "nenhuma":
            hasHeader = false;
            break;

          case "algumas":
          default:
            // não altera nada → mantém o que foi marcado manualmente
            hasHeader = page.hasHeader;
            break;

        }

        return {
          ...page,
          hasHeader,
        };
      })
    );

    setAlteracoesPendentes(true);

  }, [cabecalhoAtivo, cabecalhoModo]);

  const limparPdfAtual = () => {

    // libera memória do blob atual
    if (pdfUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pdfUrl);
    }

    if (pdfModificadoUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pdfModificadoUrl);
    }

    setPdfUrl(null);
    setArquivoRaw(null);
    setPdfModificadoUrl(null);

    setPagesConfig([]);
    setTotalPages(0);

    setPaginaAtual(1);
    setAlteracoesPendentes(false);

    // opcional
    setErroPdf(null);
  };



  return (
    <>
      <Head title="Editor de Pdf" />
      {/* <div class="xs:bg-blue-700  sm:bg-gray-900  md:bg-red-600  lg:bg-blue-600 h-6 mx-8"></div> */}

      <div className="container mx-auto px-4">

        <div className="flex flex-col lg:flex-row items-start gap-4 min-h-screen">

          <div className="w-full lg:w-1/3 flex flex-col justify-start items-center" id="opcoes">

            <div className="flex flex-col items-center justify-center gap-4 w-full" >
              <div className="w-full text-center text-2xl font-bold mt-4">
                <h1>Opções</h1>
              </div>

              {/* =========================
                BORDAS
            ========================== */}
              <div className="w-full">

                <label className="block mb-1 pro-label text-center text-xl">
                  Bordas:
                </label>

                <select
                  value={repeatBorder}
                  onChange={(e) => {

                    setBorder(e.target.value);

                    setAlteracoesPendentes(true);
                  }}
                  className="px-2 w-full rounded-full pro-input"
                >
                  <option value="none">Sem bordas</option>
                  <option value="numerosColoridos">Números Coloridos</option>
                  <option value="notasMusicais">Notas Músicais</option>
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
              <PdfHeaderConfig
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
                // Seus novos estados globais aqui:
                cabecalhoLayout={cabecalhoLayout}
                setCabecalhoLayout={setCabecalhoLayout}
                orientacao={orientacao}
                setAlteracoesPendentes={setAlteracoesPendentes}
              />

              {/* Botões */}
              {/* <PdfActions
                imagens={imagens}
                alteracoesPendentes={alteracoesPendentes}
                carregando={carregando}
                limiteAtingido={limiteAtingido}
                gerarPDF={gerarPDF}
                pdfUrl={pdfUrl}
                processarDownload={processarDownload}
                auth={auth}
                handleResetConfig={handleResetConfig}
              /> */}

              {/* Seção de Histórico com Miniaturas */}
              {/* <PdfHistory
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
              /> */}


            </div>

            {/* Resumo das atividades(Tamanhos) */}
            <ResumoAtividade
              resumoTamanho={resumoTamanho}
            />

          </div>

          {/* Coluna do Preview */}
          <div className="w-full lg:w-2/3 flex flex-col justify-center items-center " id="preview">
            <div className="flex flex-col items-center justify-center gap-4 w-full " id="preview-column">

              <div className="w-full relative flex items-center justify-center">

                <h1 className="sm:text-xl md:text-2xl text-center font-bold whitespace-nowrap">
                  Preview{" "}
                  <span>
                    {pdfUrl ? "do PDF" : "da Imagem"}
                  </span>
                </h1>

                {pdfUrl && (
                  <button
                    title="Remover PDF atual"
                    onClick={limparPdfAtual}
                    className="
                      absolute right-0
                      rounded-full
                      p-1 px-2
                      shadow
                      transition-all
                      bg-white
                      bg-opacity-80
                      hover:bg-opacity-100
                      text-red-500
                    "
                  >
                    ❌
                  </button>
                )}

              </div>

              {/* Componente Preview / Input de Arquivo */}
              <div className="flex flex-col gap-2 w-full">
                {user && (
                  <>
                    {/* SE NÃO HOUVER PDF: Mostra o Input Centralizado (Estilo Canvas) */}
                    {!pdfUrl && (
                      <div className="w-full flex flex-col items-center justify-center">
                        <label
                          htmlFor="pdf-upload"
                          className="w-full flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors group"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                            {/* Ícone de Upload */}
                            <svg
                              className="w-12 h-12 mb-3 text-gray-400 group-hover:text-indigo-500 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Clique para fazer upload</span> ou arraste o arquivo aqui
                            </p>
                            <p className="text-xs text-gray-400">Apenas arquivos PDF (Max. 50MB)</p>
                          </div>

                          {/* Input escondido controlado pela label */}
                          <input
                            id="pdf-upload"
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const arquivo = e.target.files?.[0];
                              if (arquivo) {

                                // Converte o arquivo local para uma URL temporária blob
                                const urlGerada = URL.createObjectURL(arquivo);

                                if (typeof setPdfUrl === 'function') {
                                  setPdfUrl(urlGerada);
                                  setArquivoRaw(arquivo);
                                } else {
                                  console.log("Arquivo carregado. Vincule a sua função de state aqui:", urlGerada);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {/* SE HOUVER PDF: Oculta o input e mostra o Container das Miniaturas com controles */}
                    {pdfUrl && pagesConfig.length > 0 && (
                      <div className="w-full max-h-[70vh] overflow-y-auto px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 shadow-inner">
                        {/* Grid ajustado: se quiser mais espaço para os controles por página, 
        usar grid-cols-1 ou grid-cols-2 em telas médias é uma boa pedida */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                          {pagesConfig.map((config) => {
                            const pageNum = config.page;
                            return (
                              <div
                                key={`${pdfUrl}-${pageNum}`}
                                className={`flex flex-col gap-3 p-3 bg-white rounded-xl border transition-all ${config.include ? 'border-gray-200 shadow-sm' : 'border-dashed border-gray-300 opacity-60 bg-gray-100/50'
                                  }`}
                              >
                                {/* 1. O Componente Visual do PDF */}
                                <div className="relative">
                                  <PdfPageThumbnail
                                    url={pdfUrl}
                                    pageNumber={pageNum}
                                  />
                                  {/* Badge indicando se está ativo */}
                                  {!config.include && (
                                    <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-[1px] flex items-center justify-center rounded-lg pointer-events-none">
                                      <span className="bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded">Removido do final</span>
                                    </div>
                                  )}
                                </div>

                                {/* 2. Painel de Configuração da Página */}
                                <div className="flex flex-col gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">

                                  {/* Checkbox: Incluir Página */}
                                  <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={config.include}
                                      onChange={(e) => updatePageConfig(pageNum, 'include', e.target.checked)}
                                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    Incluir no PDF final
                                  </label>

                                  {/* Controles do Cabeçalho - Só habilitam se a página for incluída */}
                                  <div className={`flex flex-col gap-2 pt-1 border-t border-gray-200/60 mt-1 transition-opacity ${!config.include ? 'pointer-events-none opacity-40' : ''}`}>

                                    {/* Checkbox: Ativar Cabeçalho */}
                                    <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={config.hasHeader}
                                        disabled={!config.include}
                                        onChange={(e) => updatePageConfig(pageNum, 'hasHeader', e.target.checked)}
                                        className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                      />
                                      Adicionar Cabeçalho
                                    </label>
                                  </div>

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CONDIÇÃO DE DOWNLOAD / PROCESSAMENTO */}
                    {pdfUrl && !auth.alertService.isBlocked && (
                      <div className="flex flex-col gap-2 w-full mt-2">

                        {/* BOTÃO 1: Aparece se NÃO foi processado AINDA ou se houver alterações pendentes */}
                        {(!pdfModificadoUrl || alteracoesPendentes) && (
                          <button
                            onClick={processarDownload} // Sua função que dispara o axios para o back
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors"
                            disabled={carregando}
                          >
                            {carregando ? "Processando no Servidor..." : "Processar as mudanças no PDF"}
                          </button>
                        )}

                        {/* BOTÃO 2: Só aparece se já foi processado E não há nenhuma alteração nova pendente */}
                        {pdfModificadoUrl && !alteracoesPendentes && (
                          <div className="flex flex-col gap-2 w-full animate-fadeIn">
                            <button
                              onClick={baixarArquivoGerado} // Sua função local que baixa o blob do estado
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Baixar o PDF do Preview Modificado
                            </button>

                            {/* Link auxiliar caso o usuário queira esconder o botão verde de download */}
                            <button
                              onClick={() => setPdfModificadoUrl(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 underline text-center"
                            >
                              Limpar arquivo gerado
                            </button>
                          </div>
                        )}

                      </div>
                    )}

                    {carregando && <FullScreenSpinner />}
                  </>
                )}

                {/* BANNER DE BLOQUEIO */}
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
EditorPdf.layout = page => (
  <AuthenticatedLayout
    auth={page.props.auth}

  >
    {page}
  </AuthenticatedLayout>
);
