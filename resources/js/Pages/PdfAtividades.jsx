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

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'


// Função para gerar o PDF com pdf-lib
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
  repeatBorder = "none",
  alturaBorda = 5,
  larguraBorda = 5,
  cabecalhoTexto = "",
  cabecalhoAtivo = false,
  cabecalhoModo = "ambas",
  modoDimensionamento = "grid",
  tamanhoCm = { largura: 19.0, altura: 27.7 },
  cabecalhoBorder = false,
  setPdfs
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
      const respX = await fetch(`/imagens/bordas/${repeatBorder}.png`);
      const bytesX = new Uint8Array(await respX.arrayBuffer());
      bordaX = await pdfDoc.embedPng(bytesX);

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
    const gap = 3;

    const cols = Math.max(ampliacao?.colunas || 1, 1);
    const rows = Math.max(ampliacao?.linhas || 1, 1);
    const slotsPerPage = cols * rows;

    // espaço útil só com margens
    const usableW = pageWidth - margin * 2;
    const usableH = pageHeight - margin * 2;
    const cellW = (usableW - (cols - 1) * gap) / cols;
    const cellH = (usableH - (rows - 1) * gap) / rows;

    const totalSlots = imagens.length;
    let page = null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // bordas fixas em pontos
    const fixedBorderHeight = alturaBorda * CM_TO_POINTS / 10;
    const fixedBorderWidth = larguraBorda * CM_TO_POINTS / 10;
    const totalBorderW = bordaY ? fixedBorderWidth * 2 : 0;
    const totalBorderH = bordaX ? fixedBorderHeight * 2 : 0;


    //Cabeçalho
    // Header font (embed uma vez)
    let headerFont = null;
    if (cabecalhoTexto && cabecalhoAtivo) {
      headerFont = await pdfDoc.embedFont(StandardFonts.Courier);
    }

    // Altura do cabeçalho baseada no número de linhas
    let cabecalhoAltura = 0;

    if (cabecalhoAtivo && cabecalhoTexto) {
      const linhasCab = cabecalhoTexto.length;

      if (linhasCab === 1) {
        cabecalhoAltura = 20;
      } else if (linhasCab === 2) {
        cabecalhoAltura = 36;
      } else if (linhasCab === 3) {
        cabecalhoAltura = 52;
      } else if (linhasCab === 4) {
        cabecalhoAltura = 68;
      } else if (linhasCab === 5) {
        cabecalhoAltura = 84;
      } else {
        cabecalhoAltura = linhasCab * 16;
      }
    }

    // Carregue a fonte em negrito apenas uma vez, fora do loop
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- loop de slots ---
    for (let i = 0; i < totalSlots; i++) {

      const slotIndexInPage = i % slotsPerPage;
      const col = slotIndexInPage % cols;
      const row = Math.floor(slotIndexInPage / cols);

      // criar página se necessário
      if (!page || slotIndexInPage === 0) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
      }

      // CÁLCULO DA PÁGINA
      const pageIndex = slotIndexInPage; // Índice da página: 0, 1, 2...
      const isOddPage = (pageIndex % 2) === 0; // Se o índice é 0, 2, 4... (Página 1, 3, 5...)
      const isEvenPage = (pageIndex % 2) !== 0; // Se o índice é 1, 3, 5... (Página 2, 4, 6...)

      let shouldDrawHeader = false;

      if (cabecalhoAtivo && cabecalhoTexto && cabecalhoTexto.some(t => t.trim() !== "")) { // Verifique se há texto
        if (cabecalhoModo === "ambas") {
          shouldDrawHeader = true;
        } else if (cabecalhoModo === "impares" && isOddPage) {
          shouldDrawHeader = true;
        } else if (cabecalhoModo === "pares" && isEvenPage) {
          shouldDrawHeader = true;
        }
        // cabecalhoModo="nenhuma" (e cabecalhoAtivo=true) já significa shouldDrawHeader=false
      }

      const item = imagens[i];
      if (!item) continue;

      const dataUrl = typeof item === "string" ? item : item.src;
      if (!dataUrl) continue;

      // carregar imagem -> canvas -> embedded
      const img = new Image();
      const loadedImg = await new Promise((resolve) => {
        img.onload = () => resolve(img);
        img.src = dataUrl;
      });

      canvas.width = loadedImg.width;
      canvas.height = loadedImg.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

      // converte o canvas para JPEG em qualidade de (90%)
      const rotatedDataUrl = canvas.toDataURL("image/jpeg", 0.9);

      // extrai a parte base64
      const base64 = rotatedDataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      // como agora sempre é JPEG, não precisa do if/else
      const embeddedImg = await pdfDoc.embedJpg(bytes);

      const embeddedW = embeddedImg.width || 1;
      const embeddedH = embeddedImg.height || 1;

      // topo da grade
      const topStartY = pageHeight - margin;
      const cellLeftX = margin + col * (cellW + gap);
      const cellBottomY = topStartY - (row + 1) * cellH - row * gap;

      // verifica se existe cabeçalho
      // const temCabecalho = cabecalhoAtivo && cabecalhoAltura > 0;
      const temCabecalho = shouldDrawHeader && cabecalhoAltura > 0;

      // dimensionamento da imagem respeitando bordas e cabeçalho
      const availableW = Math.max(1, cellW - totalBorderW);
      const availableH = Math.max(1, cellH - totalBorderH - (temCabecalho ? cabecalhoAltura : 0));

      let drawW, drawH, drawX, drawY;

      if (aspecto) {
        const scaleW = embeddedW > 0 ? availableW / embeddedW : 1;
        const scaleH = embeddedH > 0 ? availableH / embeddedH : 1;
        const scale = Math.min(scaleW, scaleH, 1.0);

        drawW = embeddedW * scale;
        drawH = embeddedH * scale;
        drawX = cellLeftX + (cellW - drawW) / 2;
        drawY = cellBottomY + (cellH - drawH) / 2 - (temCabecalho ? cabecalhoAltura / 2 : 0);
      } else {
        // estica sem manter proporção
        drawW = availableW;
        drawH = availableH;
        drawX = cellLeftX + totalBorderW / 2;
        drawY = cellBottomY + totalBorderH / 2 - (0);
      }

      // desenha a imagem
      page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });

      // bordas horizontais
      if (bordaX) {
        const tileWidth = bordaX.width || 1;
        const tilesX = Math.max(1, Math.ceil(drawW / tileWidth));
        const scaleX = Math.max(0.01, drawW / (tilesX * tileWidth));

        // topo e base da célula (respeitando borda e margem)
        const yTopo = cellBottomY + cellH - fixedBorderHeight; // topo da célula
        const yBase = cellBottomY; // base da célula

        for (let x = 0; x < tilesX; x++) {
          const tileX = drawX + x * tileWidth * scaleX;
          page.drawImage(bordaX, {
            x: tileX,
            y: yTopo,
            width: tileWidth * scaleX,
            height: fixedBorderHeight,
          });
          page.drawImage(bordaX, {
            x: tileX,
            y: yBase,
            width: tileWidth * scaleX,
            height: fixedBorderHeight,
          });
        }
      }

      // bordas laterais
      if (bordaY) {
        const tileHeight = bordaY.height || 1;
        // usa a altura da célula inteira em vez da imagem
        const tilesY = Math.max(1, Math.ceil(cellH / tileHeight));
        const scaleY = Math.max(0.01, cellH / (tilesY * tileHeight));

        for (let yi = 0; yi < tilesY; yi++) {
          const tileY = cellBottomY + yi * tileHeight * scaleY;

          // borda esquerda
          page.drawImage(bordaY, {
            x: cellLeftX,
            y: tileY,
            width: fixedBorderWidth,
            height: tileHeight * scaleY,
          });

          // borda direita
          page.drawImage(bordaY, {
            x: cellLeftX + cellW - fixedBorderWidth,
            y: tileY,
            width: fixedBorderWidth,
            height: tileHeight * scaleY,
          });
        }
      }

      // --- desenhar cabeçalho ---     
      if (shouldDrawHeader && headerFont) {
        const fontSizeCab = 12;
        const lineHeight = 15;

        // 1. Definição de Margens do Eixo X (Distância do retângulo para a borda da célula)
        const margemHorizontalRetangulo = 5;
        // Margem interna do texto (distância do texto para a linha do retângulo)
        const paddingTextoX = 8;

        const cellTop = cellBottomY + cellH - (bordaX ? fixedBorderHeight : 0);

        // Cálculo da posição X e Largura com margem
        const rectX = cellLeftX + (bordaY ? fixedBorderWidth : 0) + margemHorizontalRetangulo;
        const rectWidth = cellW - (bordaY ? fixedBorderWidth * 2 : 0) - (margemHorizontalRetangulo * 2);


        if (cabecalhoBorder) {
          // 2. Desenhar o retângulo arredondado e mais claro
          page.drawRectangle({
            x: rectX,
            y: cellTop - cabecalhoAltura,
            width: rectWidth,
            height: cabecalhoAltura,
            borderWidth: 0.8,
            borderColor: rgb(0.6, 0.6, 0.6), // Cinza mais claro
            color: rgb(0.98, 0.98, 0.98),    // Fundo quase branco para destacar
          });
        }

        // 3. Desenhar o texto
        cabecalhoTexto.forEach((linha, idx) => {
          // const texto = linha.trim();
          const texto = linha;
          const y = cellTop - lineHeight * (idx + 1) - 2; // -2 para centralizar melhor no box

          page.drawText(texto, {
            x: rectX + paddingTextoX, // Texto começa respeitando o retângulo + padding
            y,
            size: fontSizeCab,
            font: boldFont,
            color: rgb(0.2, 0.2, 0.2), // Texto em cinza muito escuro (menos agressivo que preto puro)
          });
        });
      }


    } // fim loop

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    setPdfUrl(url);
    setPaginaAtual(1);


    setPdfs(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      return [
        ...currentList,
        {
          id: Date.now(),
          // blob, // Dica: evite guardar o blob se já tem a URL, a menos que vá enviar pro servidor
          url
        }
      ];
    });


    setAlteracoesPendentes(false);
  } catch (err) {
    console.error('Erro gerando PDF:', err);
    setErroPdf('Erro ao gerar o PDF no front-end.');
  } finally {
    setCarregando(false);
  }
};


const PdfThumbnail = ({ url }) => {
  const canvasRef = useRef(null);
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    const generateThumb = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1); // Pega a primeira página

        const viewport = page.getViewport({ scale: 0.5 }); // Escala pequena para miniatura
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        setThumb(canvas.toDataURL()); // Converte para imagem base64
      } catch (error) {
        console.error("Erro ao gerar miniatura:", error);
      }
    };

    if (url) generateThumb();
  }, [url]);

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


export default function PdfEditor() {
  const { auth } = usePage().props;
  const user = auth.user;

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


  // Função para disparar o download de um PDF específico da lista
  const downloadFromList = async (pdf) => {

   
    // 1. Identifica o contexto da página para o nome do arquivo
    const isPosterPage = window.location.pathname.includes('pdf-atividades');
    const fileNameParam = isPosterPage ? 'atividades.pdf' : 'poster.pdf';
    const prefixoDownload = isPosterPage ? 'atividades' : 'poster';

    try {
      // 2. Registra o download no Backend (Apenas uma chamada)
      // Se o limite for atingido, o Laravel retornará 403 aqui
      const response = await axios.post(route('user.downloads.store'), {
        file_name: fileNameParam,
      });

      // 3. Sucesso: Prepara o arquivo para o usuário
      const total = response.data.total_downloads;
      const nomeFinal = `${prefixoDownload}-${total}.pdf`;

      // 4. Executa o download do Blob (O arquivo que já está no navegador)
      const fileResponse = await axios.get(pdf.url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([fileResponse.data]));

      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', nomeFinal);
      document.body.appendChild(link);
      link.click();

      // 5. Limpeza de memória
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
      // Tratamento de Erros Centralizado
      if (error.response) {
        const status = error.response.status;

        // ERRO 403: Limite Atingido (Regra de Negócio)
        if (status === 403) {
          const configMsg = MENSAGENS_SISTEMA.global.limite_downloads;
          const result = await exibirAvisoCritico(configMsg);

          if (result.isConfirmed) {
            router.visit('/pagamentos'); // Redireciona para assinatura
          }
        }
        // ERRO 422: Falha de Validação
        else if (status === 422) {
          console.error('Erro de Validação:', error.response.data.errors);
          alert('Falha nos dados: ' + (error.response.data.message || 'Verifique os campos.'));
        }
        // OUTROS ERROS (Ex: 500)
        else {
          alert('Ocorreu um erro inesperado no servidor.');
        }
      } else {
        console.error('Erro de conexão ou código:', error);
      }
    }
  };



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
      console.error("Erro ao unificar e contabilizar:", error);
      alert('Erro ao processar o arquivo ou contabilizar o download.');
    } finally {
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

  // const [cabecalhoAtivo, setCabecalhoAtivo] = useState(false);
  // const [cabecalhoBorder, setCabecalhoBorder] = useState(false);
  // const [cabecalhoTexto, setCabecalhoTexto] = useState(
  //   ["ESCOLA ", "PROFESSOR(A):", "ALUNO:__________________________________________________", "TURMA:"]);

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


  const downloadPDF = async (fileName, pdfUrl) => {
    if (!pdfUrl) return

    try {
      const response = await axios.post(route('user.downloads.store'), {
        file_name: fileName,
      })

      const total = response.data.total_downloads

      const nomeArquivo = `Atividades-${total}.pdf`

      const a = document.createElement('a')
      a.href = pdfUrl
      a.download = nomeArquivo
      a.click()

    } catch (error) {
      console.error(error)
      alert('Erro ao contabilizar o download.')
    }

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
                      <button
                        onClick={() => setShowMobileList(true)}
                        className="pro-btn-purple"
                      >
                        Visualizar Atividades Salvas ({pdfs.length})
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowMobileList(false)}
                        className="w-full bg-gray-500 text-white font-bold p-3 rounded-xl shadow-lg flex items-center justify-center"
                      >
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
                          <button
                            onClick={() => downloadFromList(pdf)}
                            className="flex-1 bg-green-500 text-white py-3 rounded-lg font-bold text-sm"
                          >
                            Baixar PDF
                          </button>
                          <button
                            onClick={() => removerPdf(pdf.id)}
                            className="bg-red-500 text-white py-3 px-4 rounded-lg"
                          >
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
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-lg">
                        {/* <button onClick={() => setPdfSelecionadoModal(pdf)} className="bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-bold hover:bg-purple-500">
                          Visualizar
                        </button> */}
                        <button onClick={() => downloadFromList(pdf)} className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-green-600">
                          Baixar
                        </button>
                        <button onClick={() => removerPdf(pdf.id)} className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-red-600">
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
                      <iframe
                        src={pdfSelecionadoModal.url}
                        className="w-full h-[70vh]"
                        title="Preview"
                      />
                    </div>

                    {/* Rodapé do Modal */}
                    <div className="p-4 border-t flex justify-end gap-2">
                      <button
                        onClick={() => downloadFromList(pdfSelecionadoModal)}
                        className="pro-btn-green px-4 py-2"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => setPdfSelecionadoModal(null)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-full"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {pdfs.length > 1 && (
                <div className="w-full flex justify-center">
                  <button
                    onClick={baixarTodosPdfsUnificados}
                    className="pro-btn-blue flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition-transform" >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    Gerar Arquivo Único ({pdfs.length} atividades)
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Começar Nova Página
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
                        onClick={() => downloadPDF('atividades.pdf', pdfUrl)}
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
