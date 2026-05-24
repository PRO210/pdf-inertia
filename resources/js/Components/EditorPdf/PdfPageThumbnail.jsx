import { memo, useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Cache agora usa uma chave composta: "url-pageNumber"
const thumbCache = new Map();

const PdfPageThumbnail = ({ url, pageNumber }) => {
  const cacheKey = `${url}-${pageNumber}`;
  const [thumb, setThumb] = useState(thumbCache.get(cacheKey) || null);

  useEffect(() => {
    if (!url || !pageNumber) return;

    if (thumbCache.has(cacheKey)) {
      setThumb(thumbCache.get(cacheKey));
      return;
    }

    let cancelado = false;

    const generateThumb = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelado) return;

        // renderiza a página específica passada por props
        const page = await pdf.getPage(pageNumber);

        if (cancelado) return;

        // DICA: Para miniaturas, um scale menor (ex: 0.3 ou 0.5) melhora MUITO a performance
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (cancelado) return;

        const data = canvas.toDataURL("image/jpeg", 0.7); // 0.7 economiza memória no cache

        thumbCache.set(cacheKey, data);
        setThumb(data);
      } catch (err) {
        if (!cancelado) {
          console.error(`Erro na miniatura da página ${pageNumber}:`, err);
        }
      }
    };

    generateThumb();

    return () => {
      cancelado = true;
    };
  }, [url, pageNumber, cacheKey]);

  return (
    <div className="relative w-full bg-white rounded shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all overflow-hidden border flex flex-col items-center p-2 group cursor-pointer">
      <div className="w-full h-48 bg-gray-50 flex items-center justify-center overflow-hidden rounded border border-gray-100">
        {thumb ? (
          <img
            src={thumb}
            alt={`Página ${pageNumber}`}
            className="object-contain w-full h-full"
          />
        ) : (
          <span className="text-xs text-gray-400">Carregando...</span>
        )}
      </div>
      <span className="text-[10px] font-medium text-gray-500 mt-1 group-hover:text-indigo-600">
        Página {pageNumber}
      </span>
    </div>
  );
};

export default memo(PdfPageThumbnail);