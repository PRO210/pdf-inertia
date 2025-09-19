import { useEffect, useRef, useState } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'

import * as pdfjsLib from 'pdfjs-dist'
import Footer from '@/Components/Footer'
import FullScreenSpinner from '@/Components/FullScreenSpinner'
import PdfPreview from './Atividades/Partials/PdfPreview'

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
  cabecalhoAtivo = false
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
    const gap = 6;

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

      const dataUrl = imagens[i];
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

      // converte o canvas para JPEG em qualidade máxima (100%)
      const rotatedDataUrl = canvas.toDataURL("image/jpeg", 1.0);

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
      const temCabecalho = cabecalhoAtivo && cabecalhoAltura > 0;

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


      // desenha imagem
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
      if (cabecalhoTexto && headerFont && cabecalhoAtivo) {
        const fontSizeCab = 12;   // tamanho da fonte
        const lineHeight = 15;    // altura da linha
        const leftMargin = 2 + (bordaX ? fixedBorderHeight + 2 : 0);
        const rightMargin = 0;

        const cellTop = cellBottomY + cellH - (bordaX ? fixedBorderHeight : 0);
        const maxWidth = cellW - leftMargin - rightMargin;

        cabecalhoTexto.forEach((linha, idx) => {
          const texto = linha.trim();

          const y = cellTop - lineHeight * (idx + 1);

          page.drawText(texto, {
            x: cellLeftX + leftMargin,
            y,
            size: fontSizeCab,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
        });
      }


    } // fim loop

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
  const [cabecalhoAtivo, setCabecalhoAtivo] = useState(false);
  const [cabecalhoTexto, setCabecalhoTexto] = useState(["Escola ", "Professor(a):", "Aluno:_____________________________", "Turma:"]);


  const adicionarPrimeiraImagem = (novaImagem, modoRepeticao) => {
    setImagens((prev) => {
      const imagensExistentes = prev.filter(Boolean);
      const novaListaComImagem = [...imagensExistentes, novaImagem];

      // Agora, usamos o parâmetro 'modoRepeticao'
      if (modoRepeticao === "all") {
        const novoArrayRepetido = [];
        for (let i = 0; i < totalSlots; i++) {
          novoArrayRepetido.push(novaListaComImagem[i % novaListaComImagem.length]);
        }
        return novoArrayRepetido;
      } else {
        const novoArraySemRepetir = [...novaListaComImagem];
        while (novoArraySemRepetir.length < totalSlots) {
          novoArraySemRepetir.push(null);
        }
        return novoArraySemRepetir;
      }
    });
    setAlteracoesPendentes(true);
  };


  useEffect(() => {
    setImagens((prev = []) => {
      // Se já tem o tamanho certo, não mexe (preserva posições)
      if (prev.length === totalSlots) return prev;

      // Copia preservando índices (não compacta)
      const novas = Array.from({ length: totalSlots }, (_, idx) => prev[idx] ?? null);

      // Se o modo for "all" e existir ao menos 1 imagem, preenche repetindo as existentes
      if (repeatMode === "all") {
        const imagensExistentes = prev.filter(Boolean);
        if (imagensExistentes.length > 0) {
          for (let i = 0; i < totalSlots; i++) {
            novas[i] = imagensExistentes[i % imagensExistentes.length];
          }
        }
      }

      return novas;
    });

  }, [ampliacao.colunas, ampliacao.linhas, totalSlots, repeatMode, repeatBorder]);


  // remover imagem específica
  const removerImagem = (index) => {
    setImagens((prev) => {
      const novas = [...prev];
      novas[index] = null;
      return novas;
    });
    setAlteracoesPendentes(true);
  };


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
    setCabecalhoTexto(["Escola ", "Professor(a):", "Aluno:_____________________________", "Turma:"]);
  }


  const downloadPDF = () => {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = 'documento.pdf'
    a.click()
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
  }, [ampliacao, orientacao, repeatBorder, espessuraBorda, cabecalhoAtivo, cabecalhoTexto]);



  return (
    <AuthenticatedLayout>
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
                Mostrar cabeçalho:
              </label>

              <div className="w-full">
                {cabecalhoAtivo && (
                  <>
                    {cabecalhoTexto.map((linha, index) => (
                      <input
                        key={index}
                        type="text"
                        value={linha}
                        onChange={(e) => {
                          const valor = e.target.value;

                          // máximo por linha de acordo com orientação
                          const maxPorLinha = orientacao === "paisagem" ? 54 : 42;

                          // corta o excesso (se quiser confiar no maxLength pode remover slice)
                          const ajustado = valor.slice(0, maxPorLinha);

                          // atualiza apenas a linha editada
                          const novoTexto = [...cabecalhoTexto];
                          novoTexto[index] = ajustado;
                          setCabecalhoTexto(novoTexto);
                          setAlteracoesPendentes(true);
                        }}
                        maxLength={orientacao === "paisagem" ? 54 : 42} // 🔑 limita direto no input
                        className="w-full border rounded p-2 mt-2 pro-input"
                        placeholder={`Linha ${index + 1}`}
                      />
                    ))}

                    <p className="text-gray-500 mt-1">
                      Máximo de {orientacao === "paisagem" ? 54 : 42} caracteres por linha.
                    </p>
                  </>
                )}
              </div>

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
                            cabecalhoAtivo
                          );

                          setCarregando(false);
                        }}
                        className={alteracoesPendentes ? "pro-btn-red" : "pro-btn-purple"}
                      >
                        Aplicar alterações
                      </button>
                    )}

                    {pdfUrl && !alteracoesPendentes && (
                      <button onClick={downloadPDF} className="pro-btn-green mt-2" disabled={!pdfUrl}>
                        Baixar PDF
                      </button>
                    )}

                    {carregando && (
                      <FullScreenSpinner />
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

              <PdfPreview
                imagens={imagens}
                setImagens={setImagens}
                cabecalhoAtivo={cabecalhoAtivo}
                cabecalhoTexto={cabecalhoTexto}
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

              />

            </div>
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

      <Footer ano={2025} />
    </AuthenticatedLayout >
  )
}
