import Footer from '@/Components/Footer';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useRef, useState } from 'react';

import {
  PDFDocument, rgb, StandardFonts, PageSizes, pushGraphicsState,
  popGraphicsState,
  clip,
  endPath
} from 'pdf-lib';

import * as pdfjsLib from 'pdfjs-dist'
import { aplicarMascaraCanvas } from './Partials/mask';
import Spinner from '@/Components/Spinner';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.js'





export default function Index() {
  const { user } = usePage().props;

  const [ampliacao, setAmpliacao] = useState({ colunas: 2, linhas: 2 })
  const [modoReducao, setModoReducao] = useState("grid");
  const [tamanhoQuadro, setTamanhoQuadro] = useState({ larguraCm: 4, alturaCm: 6 });
  const [espacamentoCm, setEspacamentoCm] = useState(1);

  const [orientacao, setOrientacao] = useState('paisagem')
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false)
  const [imagens, setImagens] = useState([]);
  const [imagensMask, setImagensMask] = useState([]);
  const uploadInputRef = useRef(null); // <--- Adicionar Ref
  const [mascaraSelecionada, setMascaraSelecionada] = useState('circulo'); // Novo estado para o tipo de máscara
  const [repeatMode, setRepeatMode] = useState("all");
  const [modoDimensionamento, setModoDimensionamento] = useState('grid');
  const [tamanhoCm, setTamanhoCm] = useState({ largura: 27.7, altura: 19.0 });
  const [mostrarImagensCarregadas, setMostrarImagensCarregadas] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* Criar o Pdf */
  const previewRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);



  // Função para converter File (usuário) ou URL (máscara) em ArrayBuffer
  const carregarImagemParaBuffer = async (imagemSource) => {

    if (imagemSource instanceof File) {
      // Imagem carregada pelo usuário (File)    
      return await imagemSource.arrayBuffer();
    } else if (typeof imagemSource === 'string') {
      // Imagem de máscara (URL da pasta public/Laravel)      
      const response = await fetch(imagemSource);
      if (!response.ok) throw new Error(`Falha ao carregar a máscara: ${response.statusText}`);
      return await response.arrayBuffer();
    }
    throw new Error('Fonte de imagem inválida.');
  };

  // // A função que você já usa, adaptada para o novo endpoint e dados
  // const enviarParaCorteBackend = async () => {
  //   try {
  //     const formData = new FormData();

  //     // Enviar todas as imagens
  //     imagens.forEach((img, index) => {
  //       formData.append(`imagens[]`, img);
  //     });

  //     // Enviar ampliacao
  //     formData.append("colunas", ampliacao.colunas);
  //     formData.append("linhas", ampliacao.linhas);
  //     formData.append("mascara", mascaraSelecionada);
  //     formData.append("orientacao", orientacao);

  //     const response = await axios.post(
  //       "/dashboard/image-in-mask",
  //       formData,
  //       { headers: { "Content-Type": "multipart/form-data" } }
  //     );

  //     console.log("Resposta:", response.data);
  //     return response.data;

  //   } catch (error) {
  //     console.error("Erro ao enviar imagens:", error);
  //   }
  // };

  const gerarPdf = async () => {

    if (modoReducao === "cm") {
      // usa modo por centímetros
      gerarPdfComQuadroCm();
    } else {
      // usa modo grid
      gerarPdfComGrid();
    }

  }


  const gerarPdfComGrid = async () => {
    console.log("========== 🟣 INICIANDO GERAR PDF ==========");

    setIsGenerating(true);

    if (pdfUrl) {
      console.log("🔁 Limpando PDF anterior...");
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      console.log("📏 Tamanho em cm recebido:", tamanhoCm);
      const { largura, altura } = tamanhoCm;

      const pageDimensions = orientacao === "retrato"
        ? [altura * 28.35, largura * 28.35]
        : [largura * 28.35, altura * 28.35];

      console.log("📄 Dimensões da página (px):", pageDimensions);

      const pdfDoc = await PDFDocument.create();
      console.log("📘 PDF criado!");

      const page = pdfDoc.addPage(pageDimensions);
      console.log("➕ Página adicionada!");

      const { width: pageW, height: pageH } = page.getSize();
      console.log("📐 Tamanho real da página:", pageW, pageH);

      const margem = 10;

      page.drawRectangle({
        x: margem,
        y: margem,
        width: pageW - margem * 2,
        height: pageH - margem * 2,
        borderWidth: 2,
        borderColor: rgb(1, 0, 0),
      });

      console.log("🟥 Borda desenhada!");

      // ----------------------
      // GRADE
      // ----------------------
      const drawW = pageW - margem * 2;
      const drawH = pageH - margem * 2;

      console.log("📦 Área útil:", { drawW, drawH });

      const numCols = ampliacao.colunas;
      const numRows = ampliacao.linhas;

      console.log("📊 Grade:", numCols, "colunas x", numRows, "linhas");

      const cellW = drawW / numCols;
      const cellH = drawH / numRows;

      console.log("📏 Tamanho das células:", { cellW, cellH });

      const totalCells = numCols * numRows;
      console.log("🔢 Total de células:", totalCells);

      console.log("🖼️ Total de imagens mask:", imagensMask.length);

      // ----------------------
      // RENDER DAS IMAGENS
      // ----------------------
      for (let i = 0; i < totalCells; i++) {
        console.log("----------------------------------");
        console.log(`➡️ Célula ${i + 1}/${totalCells}`);

        if (!imagensMask.length) {
          console.log("⚠️ Nenhuma imagem mascarada disponível!");
          break;
        }

        const imagemIndex = i % imagensMask.length;
        const imagemObj = imagensMask[imagemIndex];

        console.log("📷 Usando imagem index:", imagemIndex);
        console.log("🧪 OBJ:", imagemObj);

        const base64 = imagemObj.maskedBase64;

        if (!base64) {
          console.error("❌ ERRO: Imagem mascarada sem base64!", imagemObj);
          continue;
        }

        console.log("📨 Base64 tamanho:", base64.length);

        // posição grid
        const col = i % numCols;
        const row = Math.floor(i / numCols);

        const x = col * cellW + margem;
        const y = margem + (drawH - row * cellH - cellH);

        console.log("📍 Posicionamento:", { col, row, x, y });

        // -------------------------------
        // INCORPORAR IMAGEM BASE64
        // -------------------------------
        let pdfImage;
        try {
          console.log("🔄 Limpando prefixo base64...");
          const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");

          console.log("📥 Convertendo para Uint8Array...");
          const imgBuffer = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));

          console.log("🧩 Inserindo imagem no PDF...");
          pdfImage = await pdfDoc
            .embedPng(imgBuffer)
            .catch(() => pdfDoc.embedJpg(imgBuffer));

          console.log("✅ Imagem embutida!");

        } catch (err) {
          console.error("❌ ERRO AO INCORPORAR:", err);
          continue;
        }

        const { width: imgW, height: imgH } = pdfImage;
        console.log("📐 Tamanho original imagem:", imgW, imgH);

        let drawW_img = cellW;
        let drawH_img = cellH;
        let drawX_img = x;
        let drawY_img = y;

        const ratio = imgW / imgH;
        console.log("📏 Ratio IMG:", ratio);

        if (cellW / cellH < ratio) {
          drawH_img = cellW / ratio;
          drawY_img = y + (cellH - drawH_img) / 2;
        } else {
          drawW_img = cellH * ratio;
          drawX_img = x + (cellW - drawW_img) / 2;
        }

        console.log("🎨 Tamanho final imagem:", {
          drawW_img,
          drawH_img,
          drawX_img,
          drawY_img
        });

        // clipping
        page.pushOperators(pushGraphicsState());
        page.drawRectangle({ x, y, width: cellW, height: cellH, opacity: 0 });
        page.pushOperators(clip(), endPath());

        page.drawImage(pdfImage, {
          x: drawX_img,
          y: drawY_img,
          width: drawW_img,
          height: drawH_img,
        });

        page.drawRectangle({
          x,
          y,
          width: cellW,
          height: cellH,
          borderWidth: 0.5,
          borderColor: rgb(0.1, 0.1, 0.1),
        });

        console.log("🖼️ Imagem desenhada!");
      }

      console.log("💾 Salvando PDF...");
      const pdfBytes = await pdfDoc.save();
      console.log("📦 Bytes PDF:", pdfBytes.byteLength);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      console.log("🧱 Blob criado:", blob);

      const url = URL.createObjectURL(blob);
      console.log("🔗 URL do PDF:", url);

      setPdfUrl(url);

    } catch (error) {
      console.error("❌ ERRO CRÍTICO NA GERAÇÃO DO PDF:", error);
      alert("Erro ao gerar o PDF — veja os logs.");
    } finally {
      console.log("🏁 FINALIZADO GERAR PDF");
      setIsGenerating(false);
    }
  };

  const gerarPdfComQuadroCm = async () => {
    console.log("========== 🟣 INICIANDO GERAR PDF ==========");

    setIsGenerating(true);

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      console.log("📏 Tamanho da página em cm:", tamanhoCm);
      const { largura, altura } = tamanhoCm;

      // conversão cm → pontos PDF
      const pageW = largura * 28.35;
      const pageH = altura * 28.35;

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([pageW, pageH]);

      const margem = 5;

      // 🔥 tamanho do quadro fixo em cm
      const quadroW = tamanhoQuadro.larguraCm * 28.35;
      const quadroH = tamanhoQuadro.alturaCm * 28.35;

      const espacamento = espacamentoCm * 28.35;

      // posição inicial do primeiro quadro
      let atualX = margem;
      let atualY = pageH - margem - quadroH;

      for (let i = 0; i < imagensMask.length; i++) {

        const imagemObj = imagensMask[i];
        const base64 = imagemObj.maskedBase64;

        if (!base64) continue;

        // conversão base64
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
        const imgBuffer = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));

        const pdfImage = await pdfDoc
          .embedPng(imgBuffer)
          .catch(() => pdfDoc.embedJpg(imgBuffer));

        const imgW = pdfImage.width;
        const imgH = pdfImage.height;
        const ratio = imgW / imgH;

        // 🔥 ajustar imagem para caber no quadro mantendo proporção
        let drawW = quadroW;
        let drawH = quadroH;

        // if (quadroW / quadroH < ratio) {
        //   drawH = quadroW / ratio;
        // } else {
        //   drawW = quadroH * ratio;
        // }

        // // centralizar dentro do quadro
        // const offsetX = atualX + (quadroW - drawW) / 2;
        // const offsetY = atualY + (quadroH - drawH) / 2;

        // imagem começa exatamente dentro do quadro
        const offsetX = atualX;
        const offsetY = atualY;

        // borda do quadro
        page.drawRectangle({
          x: atualX,
          y: atualY,
          width: quadroW,
          height: quadroH,
          borderWidth: 1,
          borderColor: rgb(0, 0, 0),
        });

        // imagem
        page.drawImage(pdfImage, {
          x: offsetX,
          y: offsetY,
          width: drawW,
          height: drawH,
        });

        // avançar posição X
        atualX += quadroW + espacamento;

        // 🔄 se passar da página → nova linha
        if (atualX + quadroW + margem > pageW) {
          atualX = margem;
          atualY -= quadroH + espacamento;
        }

        // 🔄 se passar da página → nova página
        if (atualY < margem) {
          const newPage = pdfDoc.addPage([pageW, pageH]);
          page = newPage;

          atualX = margem;
          atualY = pageH - margem - quadroH;
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setPdfUrl(url);

    } catch (error) {
      console.error("❌ ERRO CRÍTICO:", error);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };


  const removerImagem = (indexParaRemover) => {
    // Filtra o array `imagens`, mantendo apenas os elementos cujo índice é diferente do índice a ser removido.
    setImagens((prevImagens) => {
      const novasImagens = prevImagens.filter((_, index) => index !== indexParaRemover);

      // Se a lista ficar vazia, fechar modal, desmarcar checkbox, E LIMPAR O INPUT:
      if (novasImagens.length === 0) {
        setIsModalOpen(false);
        setMostrarImagensCarregadas(false);

        if (uploadInputRef.current) {
          uploadInputRef.current.value = null;
        }
      }

      setAlteracoesPendentes(true);
      return novasImagens;
    });
  };


  const resetarConfiguracoes = () => {
    setAmpliacao({ colunas: 2, linhas: 1 })
    setOrientacao('paisagem')
    setAlteracoesPendentes(false)
    setImagens([]);
    setImagensMask([]);
    setRepeatMode("all");
    uploadInputRef.current.value = null;
    pdfUrl && URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setMascaraSelecionada('circulo');

  }

  const aplicarMascaraNaImagem = async () => {
    console.log("🟣 Iniciando aplicação de máscara em todas as imagens...");
    console.log("👉 Total de imagens:", imagens.length);
    console.log("👉 Máscara selecionada:", mascaraSelecionada);
    console.log("📌 Conteúdo real de imagens:", imagens);

    if (!imagens.length) {
      console.warn("⚠️ Nenhuma imagem encontrada no array.");
      return;
    }

    const mascaraPath = `http://localhost/imagens/mascaras/${mascaraSelecionada}.png`;
    console.log("📌 Caminho da máscara:", mascaraPath);

    const inicio = performance.now();

    const mascaradas = await Promise.all(
      imagens.map(async (file, index) => {
        console.log("\n------------------------------");
        console.log(`🔵 Processando imagem ${index + 1}/${imagens.length}`);
        console.log("📦 File recebido:", file);

        try {
          if (!(file instanceof File)) {
            console.error("❌ Item não é File!", file);
            throw new Error("Item do array não é File válido.");
          }

          console.log("⏳ Criando URL temporária...");
          const caminhoImagem = URL.createObjectURL(file);

          console.log("👉 Caminho temporário:", caminhoImagem);

          console.log("⏳ Aplicando máscara...");
          const base64 = await aplicarMascaraCanvas(caminhoImagem, mascaraPath);

          console.log("✅ Máscara aplicada!");
          console.log("📤 Base64 gerada (tamanho):", base64.length);

          // liberar memória
          URL.revokeObjectURL(caminhoImagem);

          return {
            fileOriginal: file,
            name: file.name,
            maskedBase64: base64,
          };

        } catch (err) {
          console.error("❌ Erro ao aplicar máscara:", err);
          return null;
        }
      })
    );

    // remove nulls (em caso de erro)
    const filtradas = mascaradas.filter(Boolean);

    console.log("\n==============================");
    console.log("🏁 Finalizado!");
    console.log(`⏱️ Tempo total: ${(performance.now() - inicio).toFixed(1)} ms`);
    console.log("📸 Total mascaradas:", filtradas.length);
    console.log("==============================\n");

    // salvar em um array separado sem tocar nas originais
    setImagensMask(filtradas);
    setAlteracoesPendentes(false);

  };

  return (
    <>
      <Head title="Fotos em Formas" />

      <div className="flex flex-col lg:flex-row items-start gap-4 min-h-screen">

        <div className="w-full lg:w-1/3 flex flex-col justify-start items-center px-4" id="opcoes">
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

            <label className="block pro-label text-xl text-center">Modo de Redução:</label>

            <select
              className="pro-input rounded-full w-full mb-4"
              value={modoReducao}
              onChange={(e) => {
                // 1. Atualiza o valor do modo de redução (como já fazia)
                setModoReducao(e.target.value);

                // 2. SETA ALTERAÇÕES PENDENTES COMO TRUE
                setAlteracoesPendentes(true);
              }}
            >
              <option value="grid">Por Colunas x Linhas</option>
              <option value="cm">Por Tamanho em CM</option>
            </select>


            {/* Ampliacao (colunas / linhas) - mantém igual */}
            {modoReducao === "grid" && (
              <>
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
              </>
            )}

            {modoReducao === "cm" && (
              <>
                <label className="block pro-label text-xl text-center">Redução (Tamanho Fixo em CM):</label>

                <div className="flex flex-col sm:flex-row gap-4 w-full">

                  <div className="flex-1">
                    <label className="block mb-2 pro-label text-center">Largura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tamanhoQuadro.larguraCm}
                      className="pro-input rounded-full w-full"
                      onChange={(e) =>
                        setTamanhoQuadro(prev => ({
                          ...prev,
                          larguraCm: parseFloat(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block mb-2 pro-label text-center">Altura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tamanhoQuadro.alturaCm}
                      className="pro-input rounded-full w-full"
                      onChange={(e) =>
                        setTamanhoQuadro(prev => ({
                          ...prev,
                          alturaCm: parseFloat(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>

                </div>
              </>
            )}


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


            {/* Input de Imagens e Controle de Visualização */}
            <div className="w-full mt-4">
              <label className="block mb-1 pro-label text-center text-xl">Carregar Imagens:</label>
              <div className='flex flex-col gap-2'>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={uploadInputRef}
                  onChange={(e) => {
                    const novosArquivos = Array.from(e.target.files);
                    setImagens(prev => [...prev, ...novosArquivos]);
                    setAlteracoesPendentes(true);
                  }}
                  className="px-2 w-full rounded-lg pro-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />

              </div>
            </div>

            {/* Botão para abrir o Modal (Visível se o checkbox estiver marcado) */}
            {imagens.length > 0 && (
              <div className='w-full'>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="pro-btn-blue w-full"
                >
                  Visualizar Imagens Carregadas ({imagens.length})
                </button>
              </div>
            )}


            {/*  Seleção do Tipo de Máscara */}
            <div className="w-full mt-4">
              <label className="block mb-1 pro-label text-center text-xl">Formato da Máscara:</label>
              <select
                className="px-2 w-full rounded-full pro-input"
                value={mascaraSelecionada}
                onChange={(e) => {
                  setMascaraSelecionada(e.target.value);
                  setAlteracoesPendentes(true);
                }}
              >
                <option value="retangulo">Retângulo</option>
                <option value="circulo">Círculo</option>
                <option value="coracao">Coração</option>

              </select>
            </div>


            <div className='w-full'>
              <button onClick={resetarConfiguracoes} className="pro-btn-slate">
                Resetar Configurações
              </button>
            </div>

            {/* ÁREA DOS BOTÕES */}
            <div className="w-full mt-4 flex flex-col items-center gap-2">

              {/* 1. Quando há alterações pendentes */}
              {alteracoesPendentes && (
                <button
                  onClick={aplicarMascaraNaImagem}
                  className="pro-btn-green my-2"
                  disabled={imagens.length === 0 || isGenerating}
                >
                  {isGenerating ? "Processando imagens..." : "Aplicar alterações"}
                </button>
              )}


              {/* 2. Quando NÃO há alterações pendentes e já existe PDF */}
              {!alteracoesPendentes && !isGenerating && (
                <button
                  onClick={gerarPdf}
                  title="Gerar PDF"
                  className="pro-btn-purple my-2"
                  disabled={isGenerating}
                >
                  ⚙️ Gerar/Atualizar PDF
                </button>
              )}

              {/* 2. Quando NÃO há alterações pendentes e já existe PDF */}
              {!alteracoesPendentes && !isGenerating && pdfUrl && (
                <a
                  href={pdfUrl}
                  download="arquivo.pdf"
                  className="pro-btn-red my-2 text-center cursor-pointer"
                >
                  📥 Baixar PDF
                </a>
              )}
            </div>


          </div>


        </div>


        {/* Coluna do Preview */}
        <div className="w-full lg:w-2/3 flex flex-col justify-center items-center mx-4 " id="preview">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            Visualização do PDF
          </h2>

          {/* Contêiner de Visualização */}
          <div
            className="w-full h-[80vh] bg-gray-100 dark:bg-gray-700 shadow-xl p-2 flex items-center justify-center"
          >
            {pdfUrl ? (
              // 1. Iframe para visualizar o PDF gerado
              <iframe
                src={pdfUrl} // <--- ONDE O URL É USADO
                title="Prévia do PDF de Máscaras"
                className="w-full h-full border-none"
              />
            ) : (
              // Mensagem de espera
              <p className="text-center text-gray-500 dark:text-gray-400">
                Clique em **Gerar PDF** para visualizar o documento final.
              </p>

            )}
          </div>

        </div>

      </div>


      {/* MODAL PARA VISUALIZAÇÃO DE IMAGENS CARREGADAS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[120vh] overflow-hidden flex flex-col">

            {/* Cabeçalho do Modal */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Imagens Carregadas ({imagens.length})
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                aria-label="Fechar Modal"
              >
                <svg className="w-6 h-6 hover:text-purple-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Corpo do Modal - Grid de Imagens */}
            <div className="p-4 overflow-y-auto">
              {imagens.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400">Nenhuma imagem carregada.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {imagens.map((imagem, index) => (
                    // Container da Imagem com Posição Relativa para o Botão
                    <div
                      key={index}
                      className="relative aspect-square overflow-hidden rounded-lg shadow-md border border-gray-200 dark:border-gray-600 group"
                    >

                      {/* Imagem */}
                      <img
                        src={URL.createObjectURL(imagem)}
                        alt={`Imagem ${index + 1}`}
                        className="object-cover w-full h-full"
                      />

                      {/* Botão Flutuante de REMOVER (Sempre visível ou visível ao passar o mouse) */}
                      <button
                        onClick={() => removerImagem(index)}
                        title="Remover Imagem"
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-lg opacity-80 hover:opacity-100 transition duration-200"
                      >
                        {/* Ícone "X" */}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>

                      <span className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              {/* Botão + para adicionar mais */}
              <button
                onClick={() => uploadInputRef.current.click()}
                title="Adicionar Mais Imagens"
                className="pro-btn-purple text-center"
              >
                {/* Ícone + */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </button>

              {/* Botão Concluído */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="pro-btn-slate text-purple-600"
              >
                Concluído
              </button>
            </div>


          </div>
        </div>
      )}



      <Footer ano={2025} />
    </>

  );
}

Index.layout = (page) => (
  <AuthenticatedLayout
    auth={page.props.auth}
    header={
      <h2 className="text-xl text-center font-semibold leading-tight text-gray-800">
        Aplicar Mascaras em Imagens
      </h2>
    }
  >
    {page}
  </AuthenticatedLayout>
);
