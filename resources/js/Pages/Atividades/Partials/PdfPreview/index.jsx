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
        const imgObj = imagens[i] ?? null;
        const imgSrc =
          typeof imgObj === 'string'
            ? imgObj
            : imgObj?.src ?? null;

        const imgKey =
          imgObj?.uid ??
          imgSrc ??
          i;

        /*
         * Página real (começa em 1)
         */
        const pageNumber = i + 1;

        /*
         * Validação do conteúdo do cabeçalho
         */
        const temTextoValido =
          Array.isArray(cabecalhoTexto) &&
          cabecalhoTexto.some(
            linha => linha?.trim()
          );

        const temImagemValida = !!cabecalhoImagem;

        /*
         * Decide se desenha cabeçalho
         */
        const shouldDrawHeader =
          cabecalhoAtivo &&
          (temTextoValido || temImagemValida) &&
          (
            cabecalhoModo === 'ambas' ||

            (cabecalhoModo === 'impares' &&
              pageNumber % 2 !== 0) ||

            (cabecalhoModo === 'pares' &&
              pageNumber % 2 === 0) ||

            (cabecalhoModo === 'primeira_pagina' &&
              pageNumber === 1)
          );

        /*
         * Layout
         */
        const layoutLadoALado = cabecalhoTipo === 'ambos' && !!cabecalhoImagem;

        const layoutBanner = cabecalhoTipo === 'banner' && !!cabecalhoImagem;

        return (
          <div key={i}
            className="w-full  h-full  border-2 border-dashed  rounded-md flex  flex-col relative overflow-hidden bg-white "
          >

            {/* CABEÇALHO */}
            {shouldDrawHeader && (
              <div
                className={`
            flex-none
            w-full
            font-bold
            text-gray-800
            bg-gray-50/50
            z-10
            flex
            items-center
            ${cabecalhoBorder ? 'border-b border-gray-300' : ''}
            ${layoutBanner ? 'flex-col p-0' : 'p-1'}
            ${layoutLadoALado ? 'flex-row gap-1' : 'flex-col gap-0.5'}
          `}
              >

                {layoutBanner && (
                  <img
                    src={cabecalhoImagem}
                    alt=""
                    className="
                w-full
                max-h-20
                object-cover
              "
                  />
                )}

                {!layoutBanner &&
                  (cabecalhoTipo === 'imagem' ||
                    cabecalhoTipo === 'ambos') &&
                  cabecalhoImagem && (
                    <div
                      className={`
                  flex-none
                  flex
                  justify-center
                  ${layoutLadoALado
                          ? 'w-1/5'
                          : 'w-full mb-1'
                        }
                `}
                    >
                      <img
                        src={cabecalhoImagem}
                        alt=""
                        className="
                    max-h-12
                    w-full
                    object-contain
                  "
                      />
                    </div>
                  )}

                {!layoutBanner &&
                  (cabecalhoTipo === 'texto' ||
                    cabecalhoTipo === 'ambos') && (
                    <div
                      className={`
                  flex-1
                  flex
                  flex-col
                  gap-0.5
                  ${layoutLadoALado
                          ? 'w-4/5'
                          : 'w-full'
                        }
                `}
                    >
                      {cabecalhoTexto?.map(
                        (linha, index) => (
                          <div
                            key={index}
                            className="
                        truncate
                        text-[10px]
                        leading-tight
                      "
                          >
                            {linha}
                          </div>
                        )
                      )}
                    </div>
                  )}

              </div>
            )}

            {/* IMAGEM */}
            <div className="flex-1 relative overflow-hidden">
              {imgSrc && !loadingThumbnails[i] ? (
                <>
                  <img
                    key={imgKey}
                    src={imgSrc}
                    alt={`Imagem ${pageNumber}`}
                    className={
                      aspecto
                        ? 'w-full h-full object-contain'
                        : 'w-full h-full object-fill'
                    }
                  />

                  <button title={limiteAtingido ? "Limite de 6 PDFs atingido" : "Remover imagem"}
                    onClick={() => removerImagem(i)} disabled={limiteAtingido}
                    className={`absolute top-1 right-1 z-20 rounded-full p-1 px-2 shadow transition-all  ${limiteAtingido
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                      : "bg-white bg-opacity-80 hover:bg-opacity-100 text-red-500"
                      }`}
                  >
                    ❌
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-2 h-full">
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
