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
import { useLimpezaDados } from '@/Hooks/useLimpezaDados'
import ResumoAtividade from '@/Components/PdfEditor/ResumoAtividade'
import PdfPageThumbnail from '@/Components/EditorPdf/PdfPageThumbnail'
import PdfHeaderConfig from '@/Components/EditorPdf/PdfHeaderConfig'
import Modal from '@/Components/Modal';
import PdfHistoryEditor from '@/Components/EditorPdf/PdfHistoryEditor'
import PdfActionsEditor from '@/Components/EditorPdf/PdfActionsEditor'
import { useDownloadPdf } from '@/Hooks/useDownloadPdf'
import Upload from '@/Components/svgs/Upload'
import * as fabric from 'fabric';

fabric.FabricObject.customProperties.push('originalBounds');

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
    setAlteracoesPendentes(false);
  };

  const [pdfs, setPdfs] = useState([])

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

  // Estado para controlar se a "borracha"
  const [borrachaAtiva, setBorrachaAtiva] = useState(false);
  const [tamanhoBorracha, setTamanhoBorracha] = useState(20);

  // 1. Estado para controlar quantas páginas exibir (começa com 15)
  const [visibleCount, setVisibleCount] = useState(15);
  // 2. Criamos uma lista cortada contendo apenas as páginas que devem aparecer no momento
  const visiblePagesConfig = pagesConfig.slice(0, visibleCount);

  // =========================
  // Ferramenta de Corte
  // =========================
  const [corteAtivo, setCorteAtivo] = useState(false);

  const corteAtivoRef = useRef(false);
  // Área selecionada da página
  const [cropArea, setCropArea] = useState(null);
  // Retângulo desenhado no Fabric
  const cropRectRef = useRef(null);

  // será usada na próxima etapa
  const cropOverlayRef = useRef(null);
  const isDrawingCropRef = useRef(false);
  const cropStartRef = useRef({ x: 0, y: 0 });


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

  // Ativa o modo de visualização HTML experimental
  const [modoHibridoTeste, setModoHibridoTeste] = useState(false);
  // Guarda os textos extraídos para a camada HTML
  const [textosHtmlTeste, setTextosHtmlTeste] = useState([]);


  const resetarConfiguracoes = () => {
    setPdfUrl(null)
    setAmpliacao({ colunas: 2, linhas: 1 })
    setOrientacao('paisagem')
    setAlteracoesPendentes(false)
    setErroPdf(null)
    setZoom(1)
    setAspecto(false)
    setImagens([])
    setRepeatMode("all");
    setBorder("none");
    setCabecalhoAtivo(false);
    setCabecalhoTexto(["ESCOLA ", "PROFESSOR(A):", "ALUNO:__________________________________________________", "TURMA:"]);
    setCabecalhoModo("ambas");
    limparCorte();

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

      // console.log("=== INSPEÇÃO DOS DADOS ENVIADOS AO BACKEND ===");
      console.log(Object.fromEntries(formData));
      // // Se quiser ler a string JSON exata das páginas no console:
      console.log("Configuração de Páginas (JSON):", JSON.parse(formData.get('paginas')));

      const paginas = JSON.parse(formData.get('paginas'));

      paginas.forEach(p => {
        console.log({
          page: p.page,
          include: p.include,
          corte: p.corte
        });
      });
      // console.log("=============================================");

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
    setArquivosRaw([]);
    setPdfModificadoUrl(null);

    setPagesConfig([]);
    setTotalPages(0);

    setAlteracoesPendentes(false);

    limparCorte();

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


  // NOVO: Função para obter as coordenadas do retângulo de corte em porcentagem
  const obterCoordenadasCorte = () => {
    const canvas = fabricCanvasRef.current;
    const retangulo = cropRectRef.current;

    if (!canvas || !retangulo) return null;

    // Dimensões atuais da área de desenho
    const larguraCanvas = canvas.width;
    const alturaCanvas = canvas.height;

    // Posição e tamanho corrigidos pela escala do Fabric caso o usuário redimensione
    const x = retangulo.left;
    const y = retangulo.top;
    const largura = retangulo.width * (retangulo.scaleX || 1);
    const altura = retangulo.height * (retangulo.scaleY || 1);

    return {
      xPercent: (x / larguraCanvas) * 100,
      yPercent: (y / alturaCanvas) * 100,
      widthPercent: (largura / larguraCanvas) * 100,
      heightPercent: (altura / alturaCanvas) * 100
    };
  };



  // Ação 1: Salva o estado atual do canvas APENAS para a página ativa
  const salvarEdicaoPaginaAtual = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !paginaEmEdicaoTotal) return;

    // 1. Filtra apenas os textos que foram modificados pelo usuário
    const textosModificados = textosHtmlTeste.filter(
      (itemHtml) => itemHtml.texto.trim() !== itemHtml.textoOriginal.trim()
    );

    setTextosHtmlTeste([]);
    setModoHibridoTeste(false);

    // 2. Adiciona os modificados ao Canvas com propriedades corrigidas
    textosModificados.forEach((itemHtml) => {
      // Calculamos o comprimento estimado do novo texto para expandir a caixa dinamicamente
      const fatorLarguraLetra = itemHtml.fontSize * 0.6; // Estimativa média de pixels por caractere
      const larguraEstimadaNovoTexto = itemHtml.texto.length * fatorLarguraLetra;

      // A largura final será o maior valor entre a largura original e o tamanho do novo texto digitado
      const larguraDinamica = Math.max(itemHtml.width, larguraEstimadaNovoTexto, 150);

      const textoFabric = new fabric.Textbox(itemHtml.texto, {
        left: itemHtml.left - 3,
        // Ajuste no eixo Y para compensar a diferença de altura da linha (baseline) do PDF.js para o Fabric
        top: itemHtml.top + (itemHtml.fontSize * 0.1),
        width: larguraDinamica,           // Define a largura dinâmica para o texto não quebrar linha sozinho
        fontSize: itemHtml.fontSize,      // Usa o tamanho real do PDF
        fontFamily: itemHtml.fontFamily,  // Usa a fonte real (ex: g_d3_f1)
        fill: '#000000',

        // >>> ADICIONE ESTA LINHA AQUI <<<
        textBackgroundColor: '#ffffff',// Cor preta padrão

        // Mantém a estilização IDÊNTICA ao seu 'adicionarTextoFabric' que já funciona bem:
        borderColor: '#6366f1',
        cornerColor: '#6366f1',
        cornerSize: 8,
        transparentCorners: false,
        selectable: true,
        evented: true,

        // Configurações extras de comportamento de texto do Fabric v7
        originX: 'left',
        originY: 'top',

        // Zera o preenchimento interno do bloco para alinhar perfeitamente com a caixa HTML original
        padding: 0,

        splitByGrapheme: false, // Evita quebrar palavras no meio de sílabas ao redimensionar

      });

      //
      textoFabric.originalBounds = {
        left: itemHtml.left,
        top: itemHtml.top,
        width: itemHtml.width,
        height: itemHtml.height
      };

      canvas.add(textoFabric);

    });

    // 3. Exporta o canvas limpo com os dados estruturados no formato que o PHP.
    // No Fabric v7, canvas.toJSON() exporta os objetos adicionados de forma limpa
    // const jsonDados = canvas.toJSON();
    const jsonDados = canvas.toJSON(['stroke', 'strokeWidth', 'color', 'width', 'selectable', 'evented', 'textBackgroundColor', 'originalBounds']);

    setEdicoesFabricPaginas((prev) => ({
      ...prev,
      [paginaEmEdicaoTotal.pageNumber]: JSON.stringify(jsonDados),
    }));

    console.log("Edição salva para a página", paginaEmEdicaoTotal.pageNumber, ":", jsonDados);

    setAlteracoesPendentes(true);
    setPaginaEmEdicaoTotal(null); // Fecha o modal após salvar
    setBorrachaAtiva(false); // Garante que a borracha seja desativada ao salvar

    // Limpa os estados temporários do modo híbrido
    setTextosHtmlTeste([]);
    setModoHibridoTeste(false);

  };

  // Ação 2: Replica o design atual do canvas para TODAS as páginas do documento
  const aplicarEdicaoATodasAsPaginas = () => {

    const canvas = fabricCanvasRef.current;
    if (!canvas || !paginaEmEdicaoTotal) return;

    const dadosCorte = obterCoordenadasCorte();

    const jsonDados = canvas.toJSON([
      'stroke',
      'strokeWidth',
      'color',
      'width',
      'selectable',
      'evented'
    ]);

    const jsonString = JSON.stringify(jsonDados);

    const novasEdicoes = {};

    pagesConfig.forEach(config => {
      novasEdicoes[config.page] = jsonString;
    });

    setEdicoesFabricPaginas(novasEdicoes);

    // Replica o corte para todas as páginas
    if (dadosCorte) {
      setPagesConfig(prev =>
        prev.map(page => ({
          ...page,
          corte: dadosCorte
        }))
      );
    }

    setAlteracoesPendentes(true);
    setPaginaEmEdicaoTotal(null);
    setBorrachaAtiva(false);

    // Limpa os estados do teste híbrido para a próxima página
    setTextosHtmlTeste([]);
    setModoHibridoTeste(false);

  };

  // Função para adicionar uma caixa de texto inteligente (Textbox) na tela
  const adicionarTextoFabric = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const texto = new fabric.Textbox('Clique duas vezes para editar', {
      left: 150,
      top: 10,
      width: 300,
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
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    // Desliga a borracha se ela estiver ativa
    if (borrachaAtiva) {
      canvas.isDrawingMode = false;
      setBorrachaAtiva(false);
    }

    // 1. Pega o objeto que está selecionado agora
    const objetoAtivo = canvas.getActiveObject();

    if (!objetoAtivo) return; // Se não tem nada selecionado, não faz nada

    // 2. CHECAGEM CRÍTICA: O objeto selecionado é o retângulo de corte?
    if (cropRectRef.current && objetoAtivo === cropRectRef.current) {
      // Se for o corte, chama a função que limpa a estrutura do corte por completo
      limparCorte();
    } else {
      // Se for qualquer outro objeto (texto, desenho, forma, etc.), apenas remove do canvas
      canvas.remove(objetoAtivo);

      // Se o objeto deletado fazia parte de uma seleção múltipla (ActiveSelection)
      if (objetoAtivo.type === 'activeSelection') {
        objetoAtivo.forEachObject((obj) => canvas.remove(obj));
      }
    }

    // 3. Desmarca a seleção e atualiza a tela
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  //
  const alternarBorrachaSimulada = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    // Inverte o estado atual do botão
    const novoEstado = !borrachaAtiva;
    setBorrachaAtiva(novoEstado);

    if (novoEstado) {
      // 1. Ativa o modo de desenho livre do Fabric.js
      canvas.isDrawingMode = true;

      // 2. Cria o pincel de desenho padrão (PencilBrush)
      const pincel = new fabric.PencilBrush(canvas);
      pincel.color = '#FFFFFF'; // Força a cor branca para cobrir o PDF
      pincel.width = tamanhoBorracha;

      // 3. Define as extremidades para um acabamento arredondado e suave
      pincel.strokeLineCap = 'round';
      pincel.strokeLineJoin = 'round';

      canvas.freeDrawingBrush = pincel;
      // canvas.defaultCursor = 'crosshair';

      //  Aplica o cursor com borda vermelha
      atualizarCursorBorracha(tamanhoBorracha);

      console.log("Modo borracha simulada (Whitewash) ativado.");
    } else {
      // Desativa o desenho livre e volta para o modo de seleção normal
      canvas.isDrawingMode = false;

      restaurarCursorPadrao();

      console.log("Modo borracha desativado.");
    }
  };
  // Atualiza o tamanho em tempo real enquanto desenha
  const alterarTamanhoBorracha = (quantidade) => {
    const novoTamanho = Math.max(2, tamanhoBorracha + quantidade);
    setTamanhoBorracha(novoTamanho);

    if (fabricCanvasRef.current && fabricCanvasRef.current.isDrawingMode) {
      if (fabricCanvasRef.current.freeDrawingBrush) {
        fabricCanvasRef.current.freeDrawingBrush.width = novoTamanho;
      }
      // Atualiza o tamanho da borda vermelha do cursor instantaneamente
      atualizarCursorBorracha(novoTamanho);
    }
  };
  //Altera o mouse para ficar mais visível a borracha
  const atualizarCursorBorracha = (tamanho) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    // 1. LIMITADOR CRÍTICO: Navegadores travam/ignoram cursores maiores que 128px.
    // Se a borracha for gigante, o cursor visual trava em 96px para continuar funcionando.
    const tamanhoCursorVisual = Math.min(tamanho, 96);

    const cursorCanvas = document.createElement("canvas");
    const padding = 4;
    cursorCanvas.width = tamanhoCursorVisual + padding;
    cursorCanvas.height = tamanhoCursorVisual + padding;

    const ctx = cursorCanvas.getContext("2d");
    if (ctx) {
      const raio = tamanhoCursorVisual / 2;
      const centro = (tamanhoCursorVisual + padding) / 2;

      ctx.beginPath();
      ctx.arc(centro, centro, raio, 0, 2 * Math.PI);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2; // Aumentei um pouco para destacar bem no PDF
      ctx.stroke();
    }

    const cursorUrl = cursorCanvas.toDataURL("image/png");
    const centroCursor = (tamanhoCursorVisual + padding) / 2;

    const estiloCursor = `url(${cursorUrl}) ${centroCursor} ${centroCursor}, crosshair`;

    // 2. FORÇAR NO FABRIC V7:
    // Altera a propriedade padrão do Fabric
    canvas.defaultCursor = estiloCursor;
    canvas.hoverCursor = estiloCursor;
    canvas.moveCursor = estiloCursor;
    canvas.freeDrawingCursor = estiloCursor;

    // Força a aplicação direta no elemento HTML superior onde o mouse realmente interage
    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.style.cursor = estiloCursor;
    }
  };
  //
  const restaurarCursorPadrao = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
    canvas.moveCursor = 'move';
    canvas.freeDrawingCursor = 'crosshair';

    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.style.cursor = 'default';
    }

    canvas.requestRenderAll();
  };
  //
  //
  const adicionarImagemFabric = (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo || !fabricCanvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgNativa = new Image();
      imgNativa.onload = () => {
        // Instancia o FabricImage adequado para o Fabric v7
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

  //
  const alternarModoCorte = () => {

    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    const novoEstado = !corteAtivoRef.current;

    // Atualiza o React
    setCorteAtivo(novoEstado);

    // Atualiza a ref usada pelo Fabric
    corteAtivoRef.current = novoEstado;

    // console.log("Modo corte:", corteAtivoRef.current);

    // desliga a borracha
    if (novoEstado && borrachaAtiva) {
      canvas.isDrawingMode = false;
      restaurarCursorPadrao();
      setBorrachaAtiva(false);
    }

    canvas.defaultCursor = novoEstado
      ? "crosshair"
      : "default";

  }

  // Responsável por iniciar as funções do Fabric
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
    let canvasInstancia = null;

    const inicializarEditor = async () => {
      try {
        console.log("--- DEBUG START ---");
        const loadingTask = pdfjsLib.getDocument(paginaEmEdicaoTotal.url);
        const pdf = await loadingTask.promise;

        if (!ativo) return;
        const page = await pdf.getPage(paginaEmEdicaoTotal.pageNumber);
        const viewport = page.getViewport({ scale: 1.2 });

        // Criando o canvas temporário em memória para o PDF.js
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const context = tempCanvas.getContext('2d');

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        if (!ativo) return;

        const pdfPageImgUrl = tempCanvas.toDataURL('image/png');

        const elementoCanvas = document.getElementById('fabric-lousa');
        if (!elementoCanvas) return;

        // Inicializa o Canvas do Fabric v7
        canvasInstancia = new fabric.Canvas('fabric-lousa', {
          width: viewport.width,
          height: viewport.height,
        });
        fabricCanvasRef.current = canvasInstancia;


        // Configurações iniciais do Fabric para o recorte
        canvasInstancia.on("mouse:down", (opt) => {

          if (!corteAtivoRef.current)
            return;

          if (opt.target === cropRectRef.current) {
            return;
          }

          canvasInstancia.discardActiveObject();
          canvasInstancia.selection = false;

          isDrawingCropRef.current = true;

          const pointer = {
            x: opt.scenePoint.x,
            y: opt.scenePoint.y
          };

          cropStartRef.current = {
            x: pointer.x,
            y: pointer.y
          };

          if (cropRectRef.current) {
            canvasInstancia.remove(cropRectRef.current);
            cropRectRef.current = null;
          }

          const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: "rgba(59,130,246,0.15)",
            stroke: "#2563eb",
            strokeWidth: 2,
            strokeDashArray: [6, 6],
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
            originX: "left",
            originY: "top",
          });

          canvasInstancia.add(rect);

          cropRectRef.current = rect;

          canvasInstancia.requestRenderAll();
        });


        canvasInstancia.on("mouse:move", (opt) => {

          if (!isDrawingCropRef.current)
            return;

          const pointer = opt.scenePoint;

          const rect = cropRectRef.current;

          if (!rect)
            return;

          console.log("Inicial:", cropStartRef.current, "Atual:", pointer);

          rect.set({
            left: Math.min(cropStartRef.current.x, pointer.x),
            top: Math.min(cropStartRef.current.y, pointer.y),
            width: Math.abs(pointer.x - cropStartRef.current.x),
            height: Math.abs(pointer.y - cropStartRef.current.y),
          });

          rect.setCoords();

          canvasInstancia.requestRenderAll();
        });


        canvasInstancia.on("mouse:up", () => {

          if (!isDrawingCropRef.current)
            return;

          isDrawingCropRef.current = false;

          canvasInstancia.selection = true;

          if (!cropRectRef.current)
            return;

          cropRectRef.current.set({
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            lockRotation: true,
          });

          cropRectRef.current.setCoords();

          canvasInstancia.setActiveObject(cropRectRef.current);

          // ==========================================
          // NOVO: CAPTURA E SALVA AS COORDENADAS AQUI
          // ==========================================
          const dadosCorte = obterCoordenadasCorte();
          if (dadosCorte && paginaEmEdicaoTotal) {
            // Atualiza a configuração da página ativa com os dados do corte
            updatePageConfig(paginaEmEdicaoTotal.pageNumber, 'corte', dadosCorte);
          }
          // ==========================================

          // Sai do modo desenho
          corteAtivoRef.current = false;
          setCorteAtivo(false);

          canvasInstancia.defaultCursor = "default";

          canvasInstancia.requestRenderAll();
        });

        // Criamos a imagem nativa do PDF
        const imgNativa = new Image();
        imgNativa.onload = async () => {
          if (!ativo) return;

          const fabricImg = new fabric.FabricImage(imgNativa, {
            left: 0,
            top: 0,
            originX: 'left',
            originY: 'top'
          });


          const edicaoExistente = edicoesFabricPaginas[paginaEmEdicaoTotal.pageNumber];

          if (edicaoExistente && edicaoExistente !== "{}") {
            try {
              // NO FABRIC v7, loadFromJSON RETORNA UMA PROMISE E NÃO ACEITA CALLBACKS TRADICIONAIS
              const dadosJson = JSON.parse(edicaoExistente);
              await canvasInstancia.loadFromJSON(dadosJson);

              // Reatribui o fundo APÓS carregar o JSON para não ser limpo por ele
              canvasInstancia.backgroundImage = fabricImg;
              console.log("Edições anteriores e fundo restaurados com sucesso.");
            } catch (jsonErr) {
              console.error("Erro ao processar JSON do banco:", jsonErr);
              canvasInstancia.backgroundImage = fabricImg;
            }
          } else {
            canvasInstancia.backgroundImage = fabricImg;
          }

          canvasInstancia.renderAll();
          canvasInstancia.calcOffset();

        };
        console.log('OBJETOS FABRIC:', canvasInstancia.getObjects()
        );

        imgNativa.src = pdfPageImgUrl;

      } catch (error) {
        console.error("ERRO DETECTADO NO FLUXO DE EDIDOR:", error);
      }
    };

    const timer = setTimeout(() => {
      inicializarEditor();
    }, 250);

    return () => {
      ativo = false;
      clearTimeout(timer);
      if (canvasInstancia) {
        canvasInstancia.dispose();
      }
    };
  }, [paginaEmEdicaoTotal]);

  const limparCorte = () => {
    // 1. Limpa os elementos visuais do Canvas atual do Fabric
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;

      // Remove o retângulo do corte da tela
      if (cropRectRef.current) {
        canvas.remove(cropRectRef.current);
        cropRectRef.current = null;
      }

      // Remove a máscara/overlay se existir
      if (cropOverlayRef.current) {
        canvas.remove(cropOverlayRef.current);
        cropOverlayRef.current = null;
      }

      // Desativa o modo e o cursor de corte
      setCorteAtivo(false);
      corteAtivoRef.current = false; // Importante atualizar a Ref também!
      canvas.defaultCursor = "default";
      canvas.renderAll();
    }

    // 2. Limpa o estado local de preview do componente
    setCropArea(null);

    // ==========================================================
    // CORREÇÃO CRÍTICA: Remover o corte do estado global do React
    // ==========================================================
    if (paginaEmEdicaoTotal) {
      // Usamos a sua função utilitária nativa para definir o corte como null
      updatePageConfig(paginaEmEdicaoTotal.pageNumber, 'corte', null);
    }
  };

  const ativarTesteHibrido = async () => {
    if (!paginaEmEdicaoTotal) return;

    try {
      setCarregando(true);
      const loadingTask = pdfjsLib.getDocument(paginaEmEdicaoTotal.url);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(paginaEmEdicaoTotal.pageNumber);

      // Usamos a mesma escala de 1.2 do seu visualizador
      const viewport = page.getViewport({ scale: 1.2 });

      // 1. Busca o conteúdo de texto e os metadados de estilos/fontes juntos
      const textContent = await page.getTextContent();
      const estilosDeTexto = textContent.styles; // Contém o mapeamento das fontes (ex: "g_d0_f1")

      // 2. CORREÇÃO: Forçar o carregamento das fontes originais no documento HTML
      // Criamos um container invisível temporário para o PDF.js injetar os @font-face
      const divTemporaria = document.createElement("div");
      divTemporaria.style.display = "none";
      document.body.appendChild(divTemporaria);

      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: divTemporaria,
        viewport: viewport,
      });

      // Isso renderiza a camada de texto invisível em segundo plano,
      // forçando o navegador a baixar e registrar as fontes do PDF.
      await textLayer.render();

      // Remove o elemento do DOM após carregar as fontes
      document.body.removeChild(divTemporaria);

      const itensDeTexto = textContent.items;

      // --- PASSO 1: AGRUPAR FRAGMENTOS NA MESMA LINHA VERTICAL ---
      const linhasAgrupadas = [];

      itensDeTexto.forEach((item) => {
        if (!item.str || item.str.trim() === "") return;

        const xPdf = item.transform[4];
        const yPdf = item.transform[5];
        const [xCanvas, yCanvas] = viewport.convertToViewportPoint(xPdf, yPdf);

        // Multiplicar pela escala do viewport garante o tamanho correto na tela
        const fontScaleX = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]);
        const fontSize = fontScaleX * 1.2;
        const larguraTexto = item.width * 1.2;

        // Tolerância de 5 pixels para agrupar elementos na mesma linha
        const limiarY = 4;
        let linhaExistente = linhasAgrupadas.find(l => Math.abs(l.yCanvas - yCanvas) < limiarY);

        // Descobre o fontFamily real mapeado pelo PDF.js (Ex: "g_d0_f1")
        const estilo = estilosDeTexto[item.fontName];
        const fontFamilyReal = estilo ? estilo.fontFamily : 'sans-serif';

        if (linhaExistente) {
          linhaExistente.segmentos.push({ item, xCanvas, larguraTexto });
        } else {
          linhasAgrupadas.push({
            yCanvas: yCanvas,
            fontSize: fontSize,
            fontName: fontFamilyReal, // Armazena o ID da fonte injetada
            segmentos: [{ item, xCanvas, larguraTexto }]
          });
        }
      });

      // --- PASSO 2: UNIFICAR OS TEXTOS E MONTAR OS BLOCOS HTML ---
      const textosExtraidos = [];
      let idParagrafoAtual = 0;

      // Garanta que as linhas estão ordenadas de cima para baixo antes do loop
      linhasAgrupadas.sort((a, b) => a.yCanvas - b.yCanvas);

      linhasAgrupadas.forEach((linha, index) => {
        // Ordena os pedaços da esquerda para a direita
        linha.segmentos.sort((a, b) => a.xCanvas - b.xCanvas);

        const xMin = linha.segmentos[0].xCanvas;
        const ultimoSeg = linha.segmentos[linha.segmentos.length - 1];
        const xMax = ultimoSeg.xCanvas + ultimoSeg.larguraTexto;
        const larguraTotalLinha = xMax - xMin;

        // Junta as palavras com espaçamento correto
        let stringCompleta = "";
        for (let i = 0; i < linha.segmentos.length; i++) {
          const segAtual = linha.segmentos[i]; // Corrigido aqui!
          stringCompleta += segAtual.item.str;

          if (i < linha.segmentos.length - 1) {
            const segProximo = linha.segmentos[i + 1];
            const espacoVazio = segProximo.xCanvas - (segAtual.xCanvas + segAtual.larguraTexto);
            // Adiciona espaço visual se houver um espaço real no PDF original
            if (espacoVazio > linha.fontSize * 0.2) {
              stringCompleta += " ";
            }
          }
        }


        // Dentro do seu loop de criar os blocos de texto (Passo 2):
        textosExtraidos.push({
          id: `html-txt-${index}`,
          texto: stringCompleta,
          textoOriginal: stringCompleta,
          left: xMin,
          top: linha.yCanvas - linha.fontSize,
          width: larguraTotalLinha + 6, // Largura exata do retângulo original do PDF!
          height: linha.fontSize * 1.35,
          fontSize: linha.fontSize,
          fontFamily: linha.fontName || 'sans-serif'
        });
      });

      setTextosHtmlTeste(textosExtraidos);
      setModoHibridoTeste(true);


    } catch (err) {
      console.error("Erro ao carregar teste híbrido agrupado:", err);
    } finally {
      setCarregando(false);
    }
  };

  // Função para atualizar o texto quando o usuário digitar
  const atualizarTextoHtmlTeste = (id, novoTexto) => {
    setTextosHtmlTeste(prev =>
      prev.map(t => t.id === id ? { ...t, texto: novoTexto } : t)
    );
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
                    {/* {pdfUrl ? "do PDF" : ""} */}
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
                          <Upload>
                            <p className="mb-2 text-sm md:text-xl text-gray-600">
                              <span className="font-semibold">Clique para fazer upload !</span>
                            </p>
                          </Upload>

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

                        {/* Contêiner Flex para alinhar o Grid e o Botão embaixo */}
                        <div className="flex flex-col gap-6">

                          {/* Grid de Páginas */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {visiblePagesConfig.map((config) => {
                              const pageNum = config.page;
                              return (
                                <div
                                  key={`${pdfUrl}-${pageNum}`}
                                  className={`flex flex-col gap-3 p-3 bg-white rounded-xl border transition-all ${config.include
                                    ? "border-gray-200 shadow-sm"
                                    : "border-dashed border-gray-300 opacity-60 bg-gray-100/50"
                                    }`}
                                >
                                  {/* 1. O Componente Visual do PDF */}
                                  <div className="relative">
                                    <PdfPageThumbnail url={pdfUrl} pageNumber={pageNum} />

                                    {/* Badge indicando se está ativo */}
                                    {!config.include && (
                                      <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-[1px] flex items-center justify-center rounded-lg pointer-events-none">
                                        <span className="bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded">
                                          Removido do final
                                        </span>
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
                                        onChange={(e) =>
                                          updatePageConfig(pageNum, "include", e.target.checked)
                                        }
                                      />
                                      Incluir no PDF final
                                    </label>

                                    {/* Controles do Cabeçalho */}
                                    <div
                                      className={`flex flex-col gap-2 pt-1 border-t border-gray-200/60 mt-1 transition-opacity ${!config.include ? "pointer-events-none opacity-40" : ""
                                        }`}
                                    >
                                      {/* Checkbox: Ativar Cabeçalho */}
                                      <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={config.hasHeader}
                                          disabled={!config.include}
                                          onChange={(e) => {
                                            updatePageConfig(pageNum, "hasHeader", e.target.checked);
                                            setCabecalhoAtivo(e.target.checked);
                                            setCabecalhoModo("algumas");
                                          }}
                                          className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        Adicionar Cabeçalho
                                      </label>

                                      {/* Botão de Editar Conteúdo */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPaginaEmEdicaoTotal({ pageNumber: pageNum, url: pdfUrl })
                                        }
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

                          {/* 3. Botão para carregar mais 15 páginas */}
                          {visibleCount < pagesConfig.length && (
                            <div className="flex flex-col items-center justify-center gap-2 pt-4 border-t border-gray-200">
                              <button
                                type="button"
                                onClick={() => setVisibleCount((prev) => prev + 15)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
                              >
                                <span>Carregar mais 15 páginas</span>
                                <span className="bg-indigo-500 text-indigo-100 text-xs px-2 py-0.5 rounded-full">
                                  {visibleCount} de {pagesConfig.length}
                                </span>
                              </button>
                              <p className="text-xs text-gray-400">
                                Otimizado para evitar lentidão no seu navegador.
                              </p>
                            </div>
                          )}

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

                    <button onClick={() => router.visit(route('pdf.pagamentos'))}
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
      <Modal show={paginaEmEdicaoTotal !== null} onClose={() => setPaginaEmEdicaoTotal(null)} maxWidth="" >
        <div className="m-3 flex flex-col h-[90vh]">
          {/* Cabeçalho do Modal */}
          <div className="flex items-center justify-between gap-2 ">
            <h3 className=" text-lg font-bold text-gray-900 text-nowrap">
              Página {paginaEmEdicaoTotal?.pageNumber}
            </h3>
            {/* 🌟 BARRA DE FERRAMENTAS REPOSICIONADA NO TOPO (Horizontal) */}
            <div className="w-full flex flex-row flex-wrap items-center align-middle gap-3 bg-gray-50 p-2 rounded-lg border">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mx-2">
                Ferramentas:
              </span>

              <button type="button" onClick={adicionarTextoFabric}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center justify-center gap-1 shadow-sm transition-colors"
              >
                🔤 Texto
              </button>

              <button
                type="button"
                onClick={modoHibridoTeste ? () => setModoHibridoTeste(false) : ativarTesteHibrido}
                className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                {modoHibridoTeste ? "Voltar para o Fabric" : "🧪 Testar Edição HTML"}
              </button>

              {/* O Novo Botão de Borracha Simulada (Estilo Toggle) */}
              <button type="button" onClick={alternarBorrachaSimulada}
                className={`py-2 px-4 font-medium rounded-lg flex items-center justify-center gap-1 transition-colors ${borrachaAtiva
                  ? "bg-slate-700 hover:bg-slate-800 text-white shadow-inner"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
              >
                ✏️ {borrachaAtiva ? "Usando Borracha (Clique para parar)" : "Simular Borracha"}
              </button>

              {/* NOVO: BOTÃO DE IMAGEM */}
              <label className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg  flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer text-center">
                🖼️ Inserir Imagem
                <input type="file" accept="image/*" onChange={adicionarImagemFabric} className="hidden" />
              </label>

              <button type="button" onClick={alternarModoCorte}
                className={`py-2 px-4 font-medium rounded-lg  flex items-center justify-center gap-1 transition-colors ${corteAtivo
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                  }`}
              >
                ✂️ {corteAtivo ? "Recorte: Ativo" : "Recorte de Página"}
              </button>

              <button type="button" onClick={apagarObjetoSelecionado}
                className="py-2 px-4 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg  text-sm flex items-center justify-center gap-1 transition-colors"
              >
                🗑️ Apagar as criações
              </button>

            </div>
            {/* <button
              onClick={() => setPaginaEmEdicaoTotal(null)}
              className="text-gray-400 hover:text-gray-600 font-bold text-xl"
            >
              ✕
            </button> */}
          </div>

          {/* Área Central - Modificada para conter o Canvas e os controles ao lado */}
          <div className="flex-1 overflow-auto bg-gray-100 my-4 p-4 flex flex-col rounded-lg border border-dashed border-gray-300">

            {/* Contêiner modificado de flex-col para flex-row para colocar os botões ao lado */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4 flex flex-row justify-center items-start gap-4 min-h-[400px]">

              {/* 🌟 BARRA LATERAL CONDICIONAL: Só aparece se a borracha estiver ativa */}
              {borrachaAtiva && (
                <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-xl shadow-md border border-gray-200 self-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">
                    Tamanho
                  </span>

                  {/* Botão Aumentar */}
                  <button type="button" onClick={() => alterarTamanhoBorracha(5)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg flex items-center justify-center border shadow-sm transition-colors text-lg"
                    title="Aumentar Borracha"
                  >
                    ➕
                  </button>

                  {/* Indicador do tamanho atual */}
                  <div className="text-sm font-semibold text-gray-700 my-1 bg-slate-50 px-2 py-1 rounded border min-w-[32px] text-center">
                    {tamanhoBorracha}px
                  </div>

                  {/* Botão Diminuir */}
                  <button type="button" onClick={() => alterarTamanhoBorracha(-5)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg flex items-center justify-center border shadow-sm transition-colors text-lg"
                    title="Diminuir Borracha"
                  >
                    ➖
                  </button>
                </div>
              )}

              {/* Canvas do PDF */}
              {/* <div key={paginaEmEdicaoTotal?.pageNumber || 'vazio'} className="bg-white shadow-lg rounded border border-red-500" >
                <canvas id="fabric-lousa" />
              </div> */}
              {/* Container do Canvas */}
              <div
                key={paginaEmEdicaoTotal?.pageNumber || 'vazio'}
                className="relative bg-white shadow-lg rounded border border-red-500"
                style={{
                  width: fabricCanvasRef.current?.width || 'auto',
                  height: fabricCanvasRef.current?.height || 'auto'
                }}
              >
                {/* O Canvas do Fabric continua aqui embaixo funcionando como imagem de fundo */}
                <canvas id="fabric-lousa" />

                {/* 🌟 CAMADA DE TESTE: Só aparece se você clicar no botão de teste */}
                {modoHibridoTeste && (
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50">
                    {textosHtmlTeste.map((txt) => {
                      const leftAjustado = txt.left - 1;
                      const topAjustado = txt.top - 1;

                      return (
                        <div key={txt.id} contentEditable
                          suppressContentEditableWarning // Evita avisos do React no console ao usar contentEditable
                          onBlur={(e) => atualizarTextoHtmlTeste(txt.id, e.target.innerText)}
                          // bg-white garante a cobertura do texto original de fundo
                          className="absolute bg-white text-black outline-none hover:bg-[#f0f4ff] focus:bg-white focus:ring-1 focus:ring-blue-500 pointer-events-auto whitespace-nowrap min-w-[5px]"
                          style={{
                            left: `${leftAjustado}px`,
                            top: `${topAjustado}px`,
                            minWidth: `${txt.width}px`,    // Força a largura comece exata do retângulo original, mas cresça
                            height: `${txt.height}px`,
                            fontSize: `${txt.fontSize}px`,
                            fontFamily: txt.fontFamily,
                            lineHeight: '1.15',
                            padding: '0px 2px',
                            margin: '0px',
                            border: 'none',
                            boxSizing: 'border-box',
                            display: 'inline-block',

                            // --- COMPORTAMENTO DO RETÂNGULO PRECISO ---
                            whiteSpace: 'pre',              // Mantém os espaços puros do PDF
                            overflow: 'visible',             // Permite que o novo texto seja visto e expanda o bloco
                            letterSpacing: '-0.05em',
                            // Se o texto for uma linha inteira e você quer que ele estique/encolha uniformemente:
                            textAlign: 'justify',
                            textAlignLast: 'justify',       // Força a linha única a se espalhar perfeitamente pelas bordas do retângulo
                            textJustify: 'inter-character', //  // PDFs quebram ligaduras (como 'fi', 'fl') em caracteres separados
                          }}
                        >
                          {txt.texto}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>


          {/* Rodapé do Modal */}
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
