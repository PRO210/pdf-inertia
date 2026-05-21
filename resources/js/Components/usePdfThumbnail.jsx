import { memo, useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

const thumbCache = new Map();

const PdfThumbnail = ({ url }) => {

  const [thumb, setThumb] = useState(
    thumbCache.get(url) || null
  );

  useEffect(() => {

    if (!url) return;

    // já existe → não gera de novo
    if (thumbCache.has(url)) {
      setThumb(thumbCache.get(url));
      return;
    }

    let cancelado = false;

    const generateThumb = async () => {
      try {

        const loadingTask =
          pdfjsLib.getDocument(url);

        const pdf =
          await loadingTask.promise;

        if (cancelado) return;

        const page =
          await pdf.getPage(1);

        if (cancelado) return;

        const viewport = page.getViewport({ scale: 1 });

        const canvas =
          document.createElement("canvas");

        const context =
          canvas.getContext("2d");

        canvas.height = viewport.height;

        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (cancelado) return;

        const data = canvas.toDataURL("image/jpeg", 0.8);

        // salva cache
        thumbCache.set(
          url,
          data
        );

        setThumb(data);

      } catch (err) {

        if (!cancelado) {
          console.error(
            "Erro miniatura:",
            err
          );
        }

      }
    };

    generateThumb();

    return () => {
      cancelado = true;
    };

  }, [url]);

  return (
    <div className="
        w-full
        h-40
        bg-gray-100
        rounded
        flex
        items-center
        justify-center
        overflow-hidden
        border
      "
    >
      {thumb ? (
        <img
          src={thumb}
          alt="Preview"
          className="
            object-fill
            w-full
            h-full
          "
        />
      ) : (
        <span className="text-xs text-gray-400">
          Carregando...
        </span>
      )}
    </div>
  );
};

export default memo(PdfThumbnail);