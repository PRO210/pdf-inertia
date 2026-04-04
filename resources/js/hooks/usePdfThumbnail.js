import { useEffect, useState } from 'react';

export const usePdfThumbnail = (url) => {
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    let currentThumbUrl = null;

    const generateThumb = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        canvas.toBlob((blob) => {
          if (blob) {
            currentThumbUrl = URL.createObjectURL(blob);
            setThumb(currentThumbUrl);
          }
        });
      } catch (error) {
        console.error("Erro ao gerar miniatura:", error);
      }
    };

    if (url) generateThumb();

    return () => {
      if (currentThumbUrl) {
        URL.revokeObjectURL(currentThumbUrl);
      }
    };
  }, [url]);

  return thumb;
};