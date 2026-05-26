import { memo, useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// cache das miniaturas
const thumbCache = new Map();

// cache dos PDFs carregados ← ADICIONE
const pdfCache = new Map();

const PdfPageThumbnail = ({ url, pageNumber }) => {
  const cacheKey = `${url}-${pageNumber}`;

  const [thumb, setThumb] = useState(
    thumbCache.get(cacheKey) || null
  );

  useEffect(() => {
    if (!url || !pageNumber) return;

    if (thumbCache.has(cacheKey)) {
      setThumb(thumbCache.get(cacheKey));
      return;
    }

    let cancelado = false;

    const generateThumb = async () => {
      try {
        // REUTILIZA O PDF
        let pdf = pdfCache.get(url);

        if (!pdf) {
          const loadingTask = pdfjsLib.getDocument(url);

          pdf = await loadingTask.promise;

          pdfCache.set(url, pdf);
        }

        if (cancelado) return;

        const page = await pdf.getPage(pageNumber);

        if (cancelado) return;

        const viewport = page.getViewport({
          scale: 0.5, // pequena redução já ajuda
        });

        const canvas = document.createElement("canvas");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        }).promise;

        if (cancelado) return;

        const data = canvas.toDataURL("image/jpeg", 0.5);

        thumbCache.set(cacheKey, data);

        setThumb(data);

        // libera memória
        canvas.width = 0;
        canvas.height = 0;

      } catch (err) {
        if (!cancelado) {
          console.error(
            `Erro miniatura página ${pageNumber}`,
            err
          );
        }
      }
    };

    generateThumb();

    return () => {
      cancelado = true;
    };
  }, [url, pageNumber]);

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
          <span className="text-xs text-gray-400">
            Carregando...
          </span>
        )}
      </div>

      <span className="text-[10px] font-medium text-gray-500 mt-1 group-hover:text-indigo-600">
        Página {pageNumber}
      </span>
    </div>
  );
};

export default memo(PdfPageThumbnail);