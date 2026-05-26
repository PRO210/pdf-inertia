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
import { useLimpezaDados } from '@/Hooks/useLimpezaDados'
import ResumoAtividade from '@/Components/PdfEditor/ResumoAtividade'
import PdfPageThumbnail from '@/Components/EditorPdf/PdfPageThumbnail'
import PdfHeaderConfig from '@/Components/EditorPdf/PdfHeaderConfig'
import Modal from '@/Components/Modal';
import * as fabric from 'fabric';
import PdfHistoryEditor from '@/Components/EditorPdf/PdfHistoryEditor'
import PdfActionsEditor from '@/Components/EditorPdf/PdfActionsEditor'
import { useDownloadPdf } from '@/Hooks/useDownloadPdf'


pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'


export default function EditorPdf() {
  const { auth } = usePage().props;
  const user = auth.user;

  // console.log(auth.alertService);
  // console.log(auth.alertService.isBlocked);
  // console.log("Verificando isBlocked:", auth.alertService?.isBlocked);

  // Instancia o gerenciador de mensagens
  const { getMsgLocal, podeExibir, silenciar, confirmarComCheck, exibirAvisoCritico } = useMensagens();

  //Instancia o Contabilizador  de dowloads
  const { processarDownload } = useDownloadPdf();



  // Movi a lógica de limpeza para uma função separada para não repetir código
  const executarLimpeza = () => {
    setImagens([]);
    setPdfUrl(null);
    setPaginaAtual(1);
    setAlteracoesPendentes(false);
  };

  const [pdfs, setPdfs] = useState([])



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

  const [pagesConfig, setPagesConfig] = useState([]);
  const [arquivosRaw, setArquivosRaw] = useState([]);
  const [pdfModificadoUrl, setPdfModificadoUrl] = useState(null);
  const [cabecalhoLayout, setCabecalhoLayout] = useState('sobreposto');
  const [layoutPaginas, setLayoutPaginas] = useState('1');



  // NOVO: Estado para a Edição Livre com Fabric.js
  // Controla qual página está aberta no editor em tela cheia. Se null, o editor está fechado.
  const [paginaEmEdicaoTotal, setPaginaEmEdicaoTotal] = useState(null); // Ex: { pageNumber: 2, url: 'blob...' }
  // Um objeto onde a CHAVE é o número da página (ex: "2") e o VALOR é o JSON completo do Fabric.js para aquela página.
  // Usamos string JSON para facilitar o armazenamento e o envio para o backend.
  const [edicoesFabricPaginas, setEdicoesFabricPaginas] = useState({}); // Ex: { "1": "{}", "2": '{"objects":[...]}' }
  // NOVO: Referência para controlar o ciclo de vida do Canvas do Fabric.js
  const fabricCanvasRef = useRef(null);





  const [showMobileList, setShowMobileList] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const [pdfUrl, setPdfUrl] = useState(null)
  const [orientacao, setOrientacao] = useState('paisagem')
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false)
  const [erroPdf, setErroPdf] = useState(null)

  const [carregando, setCarregando] = useState(false)


  const [imagens, setImagens] = useState([]);
  const [repeatBorder, setBorder] = useState("none");


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
  const processarPdf = async () => {
    if (!arquivosRaw) return;

    try {

      setCarregando(true);
      // Limpa um download anterior, se houver
      if (pdfModificadoUrl) {
        URL.revokeObjectURL(pdfModificadoUrl);
        setPdfModificadoUrl(null);
      }

      const formData = new FormData();

      // Anexa o arquivo físico bruto que está na memória do navegador
      const resposta = await fetch(pdfUrl);

      const blob = await resposta.blob();

      formData.append('pdf_file', blob, 'pdf_unificado.pdf');

      // Anexa o array de configurações convertido em string JSON
      // formData.append('paginas', JSON.stringify(pagesConfig));

      // NOVO: Usa a função auxiliar para incluir as edições do Fabric
      formData.append('paginas', JSON.stringify(getFinalPagesConfig()));


      // Anexa dados globais adicionais que o cabeçalho do TCPDF vai precisar ler
      formData.append('textos_cabecalho', JSON.stringify(cabecalhoTexto));

      // Anexa o layout do cabeçalho (sobreposto ou deslocado)
      formData.append('cabecalho_layout', cabecalhoLayout);

      formData.append('cabecalho_tipo', cabecalhoTipo); // 'texto', 'ambos', 'imagem', 'banner'
      formData.append('cabecalho_imagem', cabecalhoImagem); // String Base64 contendo a imagem ou null

      // Dentro da sua função processarDownload:
      formData.append('borda_tipo', repeatBorder); // Envia "lapis", "abelhas", "none", etc.

      formData.append('layout_paginas', layoutPaginas); // 1 por folha, 2 por folha, etc.


      const response = await axios.post(route('gerar.pdf.canvas'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      // Em vez de baixar direto, criamos a URL e salvamos no estado do componente
      const blobR = new Blob([response.data], { type: 'application/pdf' });
      const urlGerada = window.URL.createObjectURL(blobR);

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
  const baixarArquivoGerado = async () => {
    if (!pdfModificadoUrl) return;

    // Dispara o hook, passando a URL e o tipo do download
    await processarDownload(pdfModificadoUrl, 'editor_pdf');
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

    setPagesConfig(prev => {

      const novo =
        prev.map(item =>
          item.page === pageNumber
            ? {
              ...item,
              [field]: value
            }
            : item
        );

      return novo;
    });

    if (!alteracoesPendentes) {
      setAlteracoesPendentes(true);
    }
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
    setArquivosRaw(null);
    setPdfModificadoUrl(null);

    setPagesConfig([]);
    setTotalPages(0);

    setPaginaAtual(1);
    setAlteracoesPendentes(false);

    // opcional
    setErroPdf(null);
  };

  const adicionarPdfAoPreview = async (novosArquivos) => {
    try {

      setCarregando(true);

      const pdfFinal = await PDFDocument.create();

      const todosArquivos = [
        ...arquivosRaw,
        ...Array.from(novosArquivos)
      ];

      for (const arquivo of todosArquivos) {

        const bytes = await arquivo.arrayBuffer();

        const pdf = await PDFDocument.load(bytes);

        const paginas = await pdfFinal.copyPages(
          pdf,
          pdf.getPageIndices()
        );

        paginas.forEach((p) =>
          pdfFinal.addPage(p)
        );
      }

      const bytesFinais = await pdfFinal.save();

      if (pdfUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }

      const blob = new Blob([bytesFinais], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);

      setPdfUrl(url);

      // guarda lista original
      setArquivosRaw(todosArquivos);

      setCabecalhoAtivo(false);

    } finally {
      setCarregando(false);
    }
  };


  // NOVO: Função utilitária para montar o config final incluindo o JSON do Fabric.
  // Esta função NÃO altera o estado principal (pagesConfig), apenas prepara os dados para o envio.
  const getFinalPagesConfig = () => {
    return pagesConfig.map(config => ({
      ...config,
      // Adiciona o JSON do Fabric correspondente a esta página (ou vazio se não houver).
      fabricJson: edicoesFabricPaginas[config.page] || null,
    }));
  };

  // Ação 1: Salva o estado atual do canvas APENAS para a página ativa
  const salvarEdicaoPaginaAtual = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !paginaEmEdicaoTotal) return;

    // No Fabric v6, canvas.toJSON() exporta os objetos adicionados de forma limpa
    const jsonDados = canvas.toJSON();

    setEdicoesFabricPaginas((prev) => ({
      ...prev,
      [paginaEmEdicaoTotal.pageNumber]: JSON.stringify(jsonDados),
    }));

    // console.log("Edição salva para a página", paginaEmEdicaoTotal.pageNumber, ":", jsonDados);

    setAlteracoesPendentes(true);
    setPaginaEmEdicaoTotal(null); // Fecha o modal após salvar
  };

  // Ação 2: Replica o design atual do canvas para TODAS as páginas do documento
  const aplicarEdicaoATodasAsPaginas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !paginaEmEdicaoTotal) return;

    const jsonDados = canvas.toJSON();
    const jsonString = JSON.stringify(jsonDados);

    // Mapeia todas as páginas do config gerando o mesmo conteúdo nelas
    const novasEdicoes = {};
    pagesConfig.forEach((config) => {
      novasEdicoes[config.page] = jsonString;
    });

    setEdicoesFabricPaginas(novasEdicoes);
    setAlteracoesPendentes(true);
    setPaginaEmEdicaoTotal(null); // Fecha o modal após salvar
  };

  // Função para adicionar uma caixa de texto inteligente (Textbox) na tela
  const adicionarTextoFabric = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const texto = new fabric.Textbox('Clique duas vezes para editar', {
      left: 50,
      top: 50,
      width: 250,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#000000', // Cor preta padrão
      borderColor: '#6366f1', // Borda roxa de seleção estilizada
      cornerColor: '#6366f1',
      cornerSize: 8,
      transparentCorners: false,
    });

    canvas.add(texto);
    canvas.setActiveObject(texto); // Já deixa o texto selecionado para o usuário
    canvas.renderAll();
  };

  // Função para apagar o objeto que estiver selecionado atualmente no Canvas
  const apagarObjetoSelecionado = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objetoAtivo = canvas.getActiveObject();
    if (objetoAtivo) {
      canvas.remove(objetoAtivo);
      canvas.discardActiveObject(); // Desmarca a seleção
      canvas.renderAll();
    }
  };

  const adicionarImagemFabric = (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo || !fabricCanvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgNativa = new Image();
      imgNativa.onload = () => {
        // Instancia o FabricImage adequado para o Fabric v6
        const fabricImg = new fabric.FabricImage(imgNativa, {
          left: 100,
          top: 100,
          // Redimensiona um pouco se a imagem for gigante para não quebrar a tela
          scaleX: imgNativa.width > 300 ? 300 / imgNativa.width : 1,
          scaleY: imgNativa.width > 300 ? 300 / imgNativa.width : 1,
        });

        fabricCanvasRef.current.add(fabricImg);
        fabricCanvasRef.current.setActiveObject(fabricImg);
        fabricCanvasRef.current.renderAll();
      };
      imgNativa.src = event.target.result;
    };
    reader.readAsDataURL(arquivo);

    // Limpa o input para permitir selecionar a mesma imagem novamente se necessário
    e.target.value = '';
  };

  useEffect(() => {
    if (!paginaEmEdicaoTotal) {
      if (fabricCanvasRef.current) {
        console.log("Fechando modal: Destruindo instância do Fabric");
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      return;
    }

    let ativo = true;

    const inicializarEditor = async () => {
      try {
        console.log("--- DEBUG START ---");
        console.log("1. URL do PDF recebida:", paginaEmEdicaoTotal.url);
        console.log("2. Página a renderizar:", paginaEmEdicaoTotal.pageNumber);

        // Carrega o documento via PDF.js
        const loadingTask = pdfjsLib.getDocument(paginaEmEdicaoTotal.url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(paginaEmEdicaoTotal.pageNumber);

        const viewport = page.getViewport({ scale: 1.2 });
        console.log("3. Dimensões da Viewport:", viewport.width, "x", viewport.height);

        if (!ativo) return;

        // Criando o canvas temporário em memória para renderizar o PDF
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const context = tempCanvas.getContext('2d');

        console.log("4. Iniciando renderização do PDF no canvas temporário...");
        const renderTask = page.render({ canvasContext: context, viewport: viewport });
        await renderTask.promise;

        console.log("5. RenderTask do PDFJS resolvida.");

        // Pequena folga para garantir sincronia do buffer do navegador
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Extrai a string base64 dos pixels do PDF
        const pdfPageImgUrl = tempCanvas.toDataURL('image/png');
        console.log("6. Tamanho da string Base64 gerada:", pdfPageImgUrl.length);

        if (!ativo) return;

        // Destruição preventiva de instâncias antigas
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
        }

        const elementoCanvas = document.getElementById('fabric-lousa');
        if (!elementoCanvas) {
          console.error("Erro: Tag canvas 'fabric-lousa' não encontrada no DOM.");
          return;
        }

        // Inicializa o Canvas do Fabric.js
        const canvas = new fabric.Canvas('fabric-lousa', {
          width: viewport.width,
          height: viewport.height,
        });
        fabricCanvasRef.current = canvas;

        console.log("7. Carregando imagem via objeto HTML Image nativo...");

        // Criamos o objeto de imagem nativo do JavaScript
        const imgNativa = new Image();

        imgNativa.onload = () => {
          console.log("8. Imagem nativa processada pelo navegador. Enviando ao Fabric...");

          // Criando a instância de imagem compatível com a sua versão do Fabric (v6+)
          const fabricImg = new fabric.FabricImage(imgNativa, {
            left: 0,
            top: 0,
            originX: 'left',
            originY: 'top'
          });

          // Ajusta a escala para cobrir o fundo perfeitamente se necessário
          canvas.backgroundImage = fabricImg;

          // Renderiza o quadro e recalcula as marcações de clique do mouse
          canvas.renderAll();
          canvas.calcOffset();
          console.log("9. --- PDF RENDERIZADO COM SUCESSO NO FABRIC ---");
        };

        imgNativa.onerror = (err) => {
          console.error("Erro crítico ao processar string Base64 na imagem nativa:", err);
        };

        // Alimenta a imagem nativa com a string Base64 do PDF
        imgNativa.src = pdfPageImgUrl;

        // Restaura desenhos salvos anteriormente na página se existirem
        const edicaoExistente = edicoesFabricPaginas[paginaEmEdicaoTotal.pageNumber];
        if (edicaoExistente && edicaoExistente !== "{}") {
          canvas.loadFromJSON(edicaoExistente, () => {
            canvas.renderAll();
            console.log("Edições anteriores restauradas.");
          });
        }

      } catch (error) {
        console.error("ERRO DETECTADO NO FLUXO DE DEBUG:", error);
      }
    };

    const timer = setTimeout(() => {
      inicializarEditor();
    }, 250);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [paginaEmEdicaoTotal]);







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

              {/* =============== Páginas por Folha========== */}
              <div className="w-full">
                <label className="block mb-1 pro-label text-center text-xl">
                  Páginas por Folha:
                </label>

                <select
                  value={layoutPaginas}
                  onChange={(e) => {
                    setLayoutPaginas(e.target.value);
                    setAlteracoesPendentes(true);
                  }}
                  className="px-2 w-full rounded-full pro-input"
                >
                  <option value="1">1 Página por Folha</option>
                  <option value="2"> 2 Páginas Folha</option>

                </select>
              </div>

              {/* =============== BORDAS========== */}
              <div className="w-full">
                <label className="block mb-1 pro-label text-center text-xl">
                  Bordas:
                </label>
                <select value={repeatBorder}
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

            </div>


            {/* Botões */}
            <PdfActionsEditor
              state={{
                pdfUrl,
                pdfModificadoUrl,
                alteracoesPendentes,
                carregando,
                bloqueado: auth.alertService.isBlocked,
              }}
              actions={{
                gerar: processarPdf,
                baixar: baixarArquivoGerado,
                limpar: () => setPdfModificadoUrl(null),
                resetar: handleResetConfig
              }}
            />

            {/* Seção de Histórico com Miniaturas */}
            {/* <PdfHistoryEditor
              pdfs={pdfs}
              processarDownload={processarDownload}
              removerPdf={removerPdf}
              handleLimparTudo={handleLimparTudo}
              comecarNovaPagina={comecarNovaPagina}
              auth={auth}
            /> */}

            {/* Resumo das atividades(Tamanhos) */}
            {/* <ResumoAtividade
              resumoTamanho={resumoTamanho}
            /> */}

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
                  <>
                    <button
                      title="Adicionar PDF" onClick={() => document.getElementById('pdf-add')?.click()}
                      className="absolute right-12 rounded-full p-2 px-3 bg-white text-green-500 shadow"
                    >
                      ➕
                    </button>

                    <input hidden id="pdf-add" type="file" accept="application/pdf" multiple
                      onChange={(e) => {
                        const files = [Array.from(e.target.files || [])].flat();

                        if (!files.length) return;
                        adicionarPdfAoPreview(files);

                        setAlteracoesPendentes(true);

                        //Permite selecionar o mesmo arquivo novamente limpando o input após a seleção
                        e.target.value = '';
                      }}
                    />

                    <button title="Remover PDF atual" onClick={limparPdfAtual}
                      className=" absolute right-0 rounded-full p-2 px-2 shadow  transition-all bg-white  bg-opacity-80   hover:bg-opacity-100   text-red-500"                    >
                      ❌
                    </button>
                  </>
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
                          className="relative group w-full h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 hover:border-indigo-500 cursor-pointer transition-colors"
                        >
                          {/* O conteúdo visual fica ao fundo */}
                          <div className="flex flex-col items-center justify-center pointer-events-none">
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
                            <p className="mb-2 text-sm md:text-xl text-gray-600">
                              <span className="font-semibold">Clique para fazer upload</span> ou arraste o arquivo aqui
                            </p>
                            <p className="text-gray-400 text-sm">Apenas arquivos PDF (Max. 50MB)</p>
                          </div>

                          {/* O input invisível cobre a label inteira */}
                          <input id="pdf-upload" type="file" accept="application/pdf" multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = [Array.from(e.target.files || [])].flat();

                              if (!files.length) return;
                              adicionarPdfAoPreview(files);

                              //Permite selecionar o mesmo arquivo novamente limpando o input após a seleção
                              e.target.value = '';
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
                                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                      onChange={(e) => updatePageConfig(pageNum, 'include', e.target.checked)}

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
                                        onChange={(e) => {
                                          updatePageConfig(pageNum, 'hasHeader', e.target.checked);
                                          setCabecalhoAtivo(e.target.checked);
                                          setCabecalhoModo("algumas");

                                        }}
                                        className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                      />
                                      Adicionar Cabeçalho
                                    </label>

                                    {/* ABRIR O FABRIC.JS NESTA PÁGINA */}
                                    <button
                                      type="button"
                                      onClick={() => setPaginaEmEdicaoTotal({ pageNumber: pageNum, url: pdfUrl })}
                                      className="mt-2 w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 
                                      font-medium rounded-lg border border-indigo-200 transition-colors text-center flex items-center justify-center gap-1"
                                    >
                                      📝 Editar Conteúdo
                                    </button>
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
                            onClick={processarPdf} // Sua função que dispara o axios para o back
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
                      onClick={() => router.visit(route('pdf.pagamentos'))}
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

      {/* NOVO: Modal do Fabric.js para Edição Livre da Página */}
      <Modal
        show={paginaEmEdicaoTotal !== null}
        onClose={() => setPaginaEmEdicaoTotal(null)}
        maxWidth="7xl" // Ou 'full' se você adicionou lá no Modal.jsx
      >
        <div className="p-6 flex flex-col h-[85vh]">
          {/* Cabeçalho do Modal */}
          <div className="flex justify-between items-center pb-4 border-b">
            <h3 className="text-lg font-bold text-gray-900">
              Editando Página {paginaEmEdicaoTotal?.pageNumber}
            </h3>
            <button
              onClick={() => setPaginaEmEdicaoTotal(null)}
              className="text-gray-400 hover:text-gray-600 font-bold text-xl"
            >
              ✕
            </button>
          </div>

          {/* Área Central (Onde o Fabric vai morar no Passo 3) */}
          <div className="flex-1 overflow-auto bg-gray-100 my-4 p-4 flex items-center justify-center rounded-lg border border-dashed border-gray-300">
            {/* <p className="text-gray-400">O quadro do Fabric.js será montado aqui no próximo passo.</p> */}
            {/* Área Central Ajustada para Prevenir Quebra de Flexbox */}
            <div className="flex flex-col md:flex-row gap-4 my-4 min-h-[400px]">

              {/* Barra Lateral de Ferramentas - Fixamos a largura no desktop */}
              <div className="w-full md:w-48 flex flex-row md:flex-col gap-2 bg-gray-50 p-3 rounded-lg border h-fit">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:block mb-1">
                  Ferramentas
                </span>

                <button
                  type="button"
                  onClick={adicionarTextoFabric}
                  className="py-2 px-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-1 shadow-sm transition-colors"
                >
                  🔤 Texto
                </button>

                <button
                  type="button"
                  onClick={apagarObjetoSelecionado}
                  className="py-2 px-4 w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  🗑️ Apagar
                </button>

                {/* NOVO: BOTÃO DE IMAGEM */}
                <label className="py-2 px-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer text-center">
                  🖼️ Inserir Imagem
                  <input
                    type="file"
                    accept="image/*"
                    onChange={adicionarImagemFabric}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Área da Lousa do Fabric.js - Centralizada com scroll se o PDF for muito grande */}
              <div className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center items-start rounded-lg border border-dashed border-gray-300 max-h-[60vh]">
                <div className="bg-white shadow-lg rounded border border-red-500">
                  <canvas id="fabric-lousa" />
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé do Modal com as ações que você pediu */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t mt-auto">
            <button
              onClick={() => setPaginaEmEdicaoTotal(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Voltar sem salvar
            </button>

            <div className="flex gap-2">
              <button
                onClick={aplicarEdicaoATodasAsPaginas}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
              >
                Salvar em Todas as Páginas
              </button>

              <button
                onClick={salvarEdicaoPaginaAtual}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
              >
                Salvar nesta Página
              </button>
            </div>
          </div>
        </div>
      </Modal>

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
