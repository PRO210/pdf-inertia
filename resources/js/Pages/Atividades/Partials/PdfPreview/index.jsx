import * as pdfjsLib from "pdfjs-dist";
import PdfPageSelector from "./PdfPageSelector";
import { useState } from "react";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/js/pdf.worker.min.js";


export default function PdfPreview({
  imagens,
  setImagens,
  cabecalhoAtivo,
  cabecalhoTexto,
  cabecalhoModo,
  repeatBorder,
  espessuraBorda,
  tamanhoTile,
  orientacao,
  ampliacao,
  totalSlots,
  aspecto,
  removerImagem,
  setAlteracoesPendentes,
  erroPdf,
  carregando,
  adicionarPrimeiraImagem,
  repeatMode,
  cabecalhoBorder,
  paginaAtual,
  limiteAtingido,
  cabecalhoTipo,
  cabecalhoImagem,
}) {
  const makeItem = (src) => ({ src, uid: Date.now() + Math.random() });

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [loadingThumbnails, setLoadingThumbnails] = useState({});

  // modalData: { pdf, thumbs: [], slotIndex }

  // Helper: extrai thumbnails de todas as páginas do PDF
  async function extractPdfPages(file) {
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    const pdf = await loadingTask.promise;

    const thumbs = [];

    const MAX_PAGES = 25; // 🔥 controle de performance
    const total = Math.min(pdf.numPages, MAX_PAGES);

    for (let i = 1; i <= total; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport }).promise;

        thumbs.push(canvas.toDataURL('image/jpeg', 0.8)); // reduz qualidade pra economizar memória
      } catch (err) {
        console.warn(`Erro na página ${i}`, err);
      }
    }

    return { pdf, thumbs };
  }

  // Renderiza uma página específica em alta qualidade e coloca no slot
  async function renderPdfPageToSlot({ pdf, pageNumber, slotIndex, fileType = 'jpeg' }) {
    const page = await pdf.getPage(pageNumber);

    // Ajuste de scale: 1.0 é um bom ponto de partida
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const mime = fileType === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mime, 0.9);

    const item = makeItem(dataUrl);

    const temImagens = Array.isArray(imagens) && imagens.some(Boolean);

    if (typeof adicionarPrimeiraImagem === 'function' && repeatMode === 'all' && !temImagens) {
      adicionarPrimeiraImagem(item.src, repeatMode);
    } else {
      setImagens((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        const novas = Array.from({ length: totalSlots }, (_, idx) => {
          const p = prevArr[idx];
          return p ? (typeof p === 'string' ? makeItem(p) : p) : null;
        });
        novas[slotIndex] = item;
        return novas;
      });
    }

    setAlteracoesPendentes(true);
  }

  // Handler quando o input file muda
  const handleFileChange = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      try {

        setLoadingThumbnails(prev => ({ ...prev, [index]: true })); // ATIVA O LOADING DO SLOT

        // Extrai thumbs e pdf (mantemos o objeto pdf na modal para uso posterior)
        const { pdf, thumbs } = await extractPdfPages(file);

        setModalData({ pdf, thumbs, slotIndex: index, file });

        // 🔥 guarda o input pra limpar depois
        e.target.dataset.index = index;

        setModalVisible(true);
      } catch (err) {
        // 🔥 limpa em caso de erro
        e.target.value = '';
        console.error('Erro ao processar PDF:', err);
      }

    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const item = makeItem(dataUrl);

        const temImagens = Array.isArray(imagens) && imagens.some(Boolean);

        if (typeof adicionarPrimeiraImagem === 'function' && repeatMode === 'all' && !temImagens) {
          adicionarPrimeiraImagem(item.src, repeatMode);
        } else {
          setImagens((prev) => {
            const prevArr = Array.isArray(prev) ? prev : [];
            const novas = Array.from({ length: totalSlots }, (_, idx) => {
              const p = prevArr[idx];
              return p ? (typeof p === 'string' ? makeItem(p) : p) : null;
            });
            novas[index] = item;
            return novas;
          });
        }

        setAlteracoesPendentes(true);
      };
      reader.readAsDataURL(file);

    } else {
      alert('Formato não suportado. Envie imagem ou PDF.');
    }
  };

  // Quando o usuário clica numa miniatura no modal
  const handleModalSelect = async (pageNumber) => {
    if (!modalData) return;

    const { pdf, slotIndex } = modalData;

    try {
      await renderPdfPageToSlot({ pdf, pageNumber, slotIndex });
    } catch (err) {
      console.error('Erro ao renderizar página selecionada:', err);
    }

    // DESLIGA O LOADING DO SLOT CORRETO
    setLoadingThumbnails(prev => {
      const newObj = { ...prev };
      delete newObj[slotIndex];
      return newObj;
    });

    setModalVisible(false);
    setModalData(null);
  };

  const handleModalClose = () => {

    // Remove loading
    if (modalData?.slotIndex !== undefined) {
      setLoadingThumbnails(prev => {
        const newObj = { ...prev };
        delete newObj[modalData.slotIndex];
        return newObj;
      });

      // 🔥 limpa todos os inputs (mais simples sem ref)
      document.querySelectorAll('input[type="file"]').forEach(input => {
        input.value = '';
      });
    }

    setModalVisible(false);
    setModalData(null);
  };

  const slotsPerPage = Math.max(ampliacao?.colunas || 1, 1) * Math.max((ampliacao?.linhas || ampliacao?.colunas || 1), 1);

  return (

    <div className={`relative mx-auto bg-white rounded-lg
    ${orientacao === 'retrato' ? 'aspect-[595/842]' : 'aspect-[842/750]'}
    w-full max-w-[842px]
  `}
      style={{
        display: 'grid',
        gap: '0.5rem',
        padding: espessuraBorda,
        gridTemplateColumns: `repeat(${Math.max(ampliacao?.colunas || 1, 1)}, 1fr)`,
        gridTemplateRows: `repeat(${Math.max((ampliacao?.linhas || ampliacao?.colunas || 1), 1)}, 1fr)`,
      }}
    >
      {/* Bordas (mantidas) */}
      {repeatBorder !== 'none' && (
        <>
          <div
            className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{
              height: espessuraBorda,
              backgroundImage: `url(/imagens/bordas/${repeatBorder}.png)`,
              backgroundRepeat: 'repeat-x',
              backgroundSize: `${tamanhoTile}px auto`,
              backgroundPosition: 'top left',
            }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 pointer-events-none"
            style={{
              height: espessuraBorda,
              backgroundImage: `url(/imagens/bordas/${repeatBorder}.png)`,
              backgroundRepeat: 'repeat-x',
              backgroundSize: `${tamanhoTile}px auto`,
              backgroundPosition: 'bottom left',
            }}
          />
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none"
            style={{
              width: espessuraBorda,
              backgroundImage: `url(/imagens/bordas/${repeatBorder}Y.png)`,
              backgroundRepeat: 'repeat-y',
              backgroundSize: `auto ${tamanhoTile}px`,
              backgroundPosition: 'top left',
            }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none"
            style={{
              width: espessuraBorda,
              backgroundImage: `url(/imagens/bordas/${repeatBorder}Y.png)`,
              backgroundRepeat: 'repeat-y',
              backgroundSize: `auto ${tamanhoTile}px`,
              backgroundPosition: 'top right',
            }}
          />
        </>
      )}

      {/* Slots do grid */}
      {Array.from({ length: totalSlots }).map((_, i) => {
        const imgObj = imagens[i] || null;
        const imgSrc = imgObj ? (typeof imgObj === 'string' ? imgObj : imgObj.src) : null;
        const imgKey = imgObj?.uid ?? imgSrc ?? i;

        const pageIndex = Math.floor(i / slotsPerPage);
        const isOddPage = (i % slotsPerPage) === 0; // Esquerda
        const isEvenPage = (i % slotsPerPage) !== 0; // Direita

        let shouldDrawHeader = false;

        const temTextoValido = cabecalhoTexto && cabecalhoTexto.some((t) => t.trim() !== '');
        const temImagemValida = cabecalhoImagem !== null;

        if (cabecalhoAtivo && (temTextoValido || temImagemValida)) {
          if (cabecalhoModo === 'ambas') {
            shouldDrawHeader = true;
          } else if (cabecalhoModo === 'impares' && isOddPage) {
            shouldDrawHeader = true;
          } else if (cabecalhoModo === 'pares' && isEvenPage) {
            shouldDrawHeader = true;
          } else if (cabecalhoModo === 'primeira_pagina') {
            shouldDrawHeader = true;
          }
        }

        // Identifica os modos de layout baseados no tipo de cabeçalho escolhido
        const layoutLadoALado = cabecalhoTipo === 'ambos' && cabecalhoImagem;
        const layoutBanner = cabecalhoTipo === 'banner' && cabecalhoImagem;

        return (
          <div
            key={i}
            className="w-full h-full border-2 border-dashed rounded-md flex flex-col justify-start text-xs text-gray-400 relative overflow-hidden bg-white"
          >
            {/* 1. Cabeçalho Real */}
            {shouldDrawHeader && (cabecalhoModo !== 'primeira_pagina' || isOddPage) && (
              <div
                className={`
            flex-none w-full flex font-bold text-gray-800 bg-gray-50/50 z-10 items-center
            ${cabecalhoBorder ? 'border-b border-gray-300' : ''} 
            ${layoutBanner ? 'p-0 flex-col' : 'p-1'} 
            ${layoutLadoALado ? 'flex-row gap-1' : 'flex-col gap-0.5'}
          `}
              >
                {/* MODO BANNER: Ocupa toda a largura da folha */}
                {layoutBanner && (
                  <img
                    src={cabecalhoImagem}
                    alt="Banner do Cabeçalho"
                    className="w-full h-auto max-h-20 object-cover"
                  />
                )}

                {/* MODOS TRADICIONAIS: Imagem comum (centralizada ou do lado esquerdo do texto) */}
                {!layoutBanner && (cabecalhoTipo === 'imagem' || cabecalhoTipo === 'ambos') && cabecalhoImagem && (
                  <div className={`flex-none flex justify-center ${layoutLadoALado ? 'w-1/5' : 'w-full mb-1'}`}>
                    <img
                      src={cabecalhoImagem}
                      alt="Imagem do Cabeçalho"
                      className="max-h-12 w-full object-contain"
                    />
                  </div>
                )}

                {/* Seção de Texto do Cabeçalho */}
                {!layoutBanner && (cabecalhoTipo === 'texto' || cabecalhoTipo === 'ambos') && (
                  <div className={`flex-1 flex flex-col gap-0.5 ${layoutLadoALado ? 'w-4/5' : 'w-full'}`}>
                    {cabecalhoTexto.map((linha, index) => (
                      <div key={index} className="w-full truncate text-[10px] leading-tight" title={linha}>
                        {linha}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. O Espaçador (Modo primeira_pagina) */}
            {shouldDrawHeader && cabecalhoModo === 'primeira_pagina' && isEvenPage && (
              <div
                className={`
            flex-none w-full flex items-center
            ${cabecalhoBorder ? 'border-b border-transparent' : ''}
            ${layoutBanner ? 'p-0 flex-col' : 'p-1'}
            ${layoutLadoALado ? 'flex-row gap-1' : 'flex-col gap-0.5'}
          `}
                aria-hidden="true"
              >
                {/* Espaçador invisível do Modo Banner */}
                {layoutBanner && (
                  <div className="w-full max-h-20 opacity-0 select-none">&nbsp;</div>
                )}

                {/* Espaçador invisível da Imagem Tradicional */}
                {!layoutBanner && (cabecalhoTipo === 'imagem' || cabecalhoTipo === 'ambos') && cabecalhoImagem && (
                  <div className={`flex-none ${layoutLadoALado ? 'w-1/5' : 'w-full'}`}>
                    <div className="max-h-12 w-full opacity-0">&nbsp;</div>
                  </div>
                )}

                {/* Espaçador invisível do Texto */}
                {!layoutBanner && (cabecalhoTipo === 'texto' || cabecalhoTipo === 'ambos') && (
                  <div className={`flex-1 flex flex-col gap-0.5 ${layoutLadoALado ? 'w-4/5' : 'w-full'}`}>
                    {cabecalhoTexto.map((_, index) => (
                      <div key={index} className="w-full text-[10px] opacity-0">&nbsp;</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Área da Imagem Principal da Atividade */}
            <div className="flex-1 w-full min-h-0 relative flex items-center justify-center overflow-hidden">
              {imgSrc && !loadingThumbnails[i] ? (
                <>
                  <img
                    key={imgKey}
                    src={imgSrc}
                    alt={`Imagem ${i + 1}`}
                    className={`rounded-md ${aspecto ? 'max-w-full max-h-full object-contain' : 'w-full h-full object-fill'}`}
                  />
                  <button
                    title={limiteAtingido ? "Limite de 6 PDFs atingido" : "Remover imagem"}
                    onClick={() => removerImagem(i)}
                    disabled={limiteAtingido}
                    className={`absolute top-1 right-1 z-20 rounded-full p-1 shadow transition-all text-[10px] ${limiteAtingido
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                      : "bg-white bg-opacity-80 hover:bg-opacity-100 text-red-500"
                      }`}
                  >
                    Remover
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-2">
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl text-center">Envie Imagem ou PDF :)</p>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, i)}
                    className="pro-btn-blue file:mr-2 file:py-2 file:px-2 
                file:rounded-md file:border-0 file:text-sm sm:text-base md:text-lg lg:text-xl 
                file:font-semibold file:bg-blue-50 
                file:text-blue-700 hover:file:bg-blue-100 
                cursor-pointer"
                  />
                </div>
              )}

              {loadingThumbnails[i] && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>
        );
      })}




      {/* 1. Criar linhas verticais (entre colunas) */}
      {Array.from({ length: ampliacao.colunas - 1 }).map((_, col) => (
        <div
          key={`v-${col}`}
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: `${((col + 1) / ampliacao.colunas) * 100}%`,
            width: espessuraBorda,
            transform: 'translateX(-50%)',
            backgroundImage: `url(/imagens/bordas/${repeatBorder}Y.png)`,
            backgroundRepeat: 'repeat-y',
            backgroundSize: `auto ${tamanhoTile}px`,
          }}
        />
      ))}

      {/* 2. Criar linhas horizontais (entre linhas) */}
      {Array.from({ length: ampliacao.linhas - 1 }).map((_, row) => (
        <div
          key={`h-${row}`}
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${((row + 1) / ampliacao.linhas) * 100}%`,
            height: espessuraBorda,
            transform: 'translateY(-50%)',
            backgroundImage: `url(/imagens/bordas/${repeatBorder}.png)`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: `${tamanhoTile}px auto`,
          }}
        />
      ))}

      {/* Modal de seleção de página */}
      <PdfPageSelector
        visible={modalVisible}
        thumbs={modalData?.thumbs || []}
        onSelect={handleModalSelect}
        onClose={handleModalClose}
        slotIndex={modalData?.slotIndex}
      />
    </div>
  );
}
