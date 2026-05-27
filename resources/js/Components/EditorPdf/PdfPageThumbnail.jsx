import { memo, useEffect, useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Caches globais para reaproveitamento de memória
const thumbCache = new Map();
const pdfCache = new Map();

const PdfPageThumbnail = ({ url, pageNumber }) => {
  const cacheKey = `${url}-${pageNumber}`;
  const containerRef = useRef(null);

  const [thumb, setThumb] = useState(thumbCache.get(cacheKey) || null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // 1. Observer para detectar quando a página está próxima da tela
  useEffect(() => {
    if (thumb) return; // Se já tem cache, não precisa observar

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect(); // Acionou uma vez, pode parar de observar
        }
      },
      {
        rootMargin: "200px", // Começa a carregar 200px antes de aparecer na tela
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [thumb]);

  // 2. Efeito responsável pela renderização (só roda se estiver visível)
  useEffect(() => {
    if (!url || !pageNumber || !isIntersecting || thumb) return;

    let isCancelled = false;
    let pageInstance = null;

    const generateThumb = async () => {
      try {
        let pdf = pdfCache.get(url);

        if (!pdf) {
          const loadingTask = pdfjsLib.getDocument(url);
          pdf = await loadingTask.promise;
          pdfCache.set(url, pdf);
        }

        if (isCancelled) return;

        pageInstance = await pdf.getPage(pageNumber);
        if (isCancelled) return;

        const viewport = pageInstance.getViewport({ scale: 0.3 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = pageInstance.render({
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;
        if (isCancelled) return;

        const data = canvas.toDataURL("image/jpeg", 0.6); 
        thumbCache.set(cacheKey, data);
        setThumb(data);

        // Limpeza estrita de memória
        canvas.width = 0;
        canvas.height = 0;
      } catch (err) {
        if (!isCancelled) {
          console.error(`Erro ao gerar miniatura da página ${pageNumber}:`, err);
        }
      } finally {
        if (pageInstance) {
          pageInstance.cleanup();
        }
      }
    };

    generateThumb();

    return () => {
      isCancelled = true;
    };
  }, [url, pageNumber, isIntersecting, thumb, cacheKey]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-white rounded shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all overflow-hidden border flex flex-col items-center p-2 group cursor-pointer"
    >
      <div className="w-full h-48 bg-gray-50 flex items-center justify-center overflow-hidden rounded border border-gray-100">
        {thumb ? (
          <img
            src={thumb}
            alt={`Página ${pageNumber}`}
            className="object-contain w-full h-full"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* Um esqueleto de loading discreto e profissional */}
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-gray-400">Carregando...</span>
          </div>
        )}
      </div>

      <span className="text-[10px] font-medium text-gray-500 mt-1 group-hover:text-indigo-600">
        Página {pageNumber}
      </span>
    </div>
  );
};

export default memo(PdfPageThumbnail);