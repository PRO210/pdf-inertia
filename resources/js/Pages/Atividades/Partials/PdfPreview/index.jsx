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
  cabecalhoBorder
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
    const total = pdf.numPages;

    // Cria thumbs em escala reduzida para performance
    for (let i = 1; i <= total; i++) {

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;
      thumbs.push(canvas.toDataURL('image/jpeg', 0.75));
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
    const dataUrl = canvas.toDataURL(mime, 0.75);

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
        setModalVisible(true);
      } catch (err) {
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
    setModalVisible(false);
    setModalData(null);
  };

  const slotsPerPage = Math.max(ampliacao?.colunas || 1, 1) * Math.max((ampliacao?.linhas || ampliacao?.colunas || 1), 1);

  return (
    <div
      className={`relative mx-auto bg-white rounded-lg
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

        // Paginação correta
        const pageIndex = Math.floor(i + 1 / slotsPerPage);
        const isOddPage = (pageIndex % 2) === 0;
        const isEvenPage = (pageIndex % 2) !== 0;

        let shouldDrawHeader = false;

        if (cabecalhoAtivo && cabecalhoTexto && cabecalhoTexto.some((t) => t.trim() !== '')) {
          if (cabecalhoModo === 'ambas') {
            shouldDrawHeader = true;
          } else if (cabecalhoModo === 'impares' && isOddPage) {
            shouldDrawHeader = true;
          } else if (cabecalhoModo === 'pares' && isEvenPage) {
            shouldDrawHeader = true;
          }
        }

        return (
          <div
            key={i}
            className="w-full h-full border-2 border-dashed rounded-md flex flex-col items-center justify-center text-xs text-gray-400 relative overflow-hidden"
          >
            {/* Cabeçalho dinâmico (Renderização Condicional) */}
            {shouldDrawHeader && (
              <div
                className={`
                  w-full flex flex-col gap-1 p-2 font-bold text-gray-800 text-sm
                  ${cabecalhoBorder ? 'border-b-2 border-gray-300' : 'border-b-0'} 
                  bg-gray-50/30
                `}
              >
                {cabecalhoTexto.map((linha, index) => (
                  <div key={index} className="w-full truncate" title={linha}>
                    {linha}
                  </div>
                ))}
              </div>
            )}

            {imgSrc && !loadingThumbnails[i] ? (
              <>
                <img
                  key={imgKey}
                  src={imgSrc}
                  alt={`Imagem ${i + 1}`}
                  className={`w-full h-full rounded-md ${aspecto ? 'object-contain' : 'object-fill'}`}
                />
                <button
                  title="Remover imagem"
                  onClick={() => removerImagem(i)}
                  className="absolute top-2 right-2 z-20 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow text-xs"
                >
                  Remover
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-2">
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-center">Envie imagem ou PDF :)</p>
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
              <div className="flex w-full items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-400 border-t-transparent"></div>
              </div>
            )}

          </div>
        );
      })}

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
