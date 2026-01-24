import pica from 'pica';
import imageCompression from 'browser-image-compression';

/**
 * Service para redimensionamento de alta qualidade usando Pica
 */
export const ImageUpscalePicaJs = {
  
  async ajustarImagemPica(imgBitmap, larguraIdeal, alturaIdeal, onLoadingChange = null) {
    const MAX_STEP = 3;
    const p = pica();

    // Notifica que o processamento começou
    if (onLoadingChange) onLoadingChange(true);

    try {
      let currentCanvas = document.createElement('canvas');
      currentCanvas.width = imgBitmap.width;
      currentCanvas.height = imgBitmap.height;
      currentCanvas.getContext('2d').drawImage(imgBitmap, 0, 0);

      const ratio = imgBitmap.height / imgBitmap.width;
      let isHeightGreater = imgBitmap.height > imgBitmap.width;
      let currentMaxSide = isHeightGreater ? imgBitmap.height : imgBitmap.width;
      const finalMaxSide = Math.max(larguraIdeal, alturaIdeal);

      while (currentMaxSide < finalMaxSide) {
        let scale = Math.min(MAX_STEP, finalMaxSide / currentMaxSide);
        let nextMaxSide = Math.min(Math.round(currentMaxSide * scale), finalMaxSide);

        if (nextMaxSide <= currentMaxSide) break;

        let nextW, nextH;
        if (isHeightGreater) {
          nextH = nextMaxSide;
          nextW = Math.round(nextH / ratio);
        } else {
          nextW = nextMaxSide;
          nextH = Math.round(nextW * ratio);
        }

        currentMaxSide = nextMaxSide;

        let resizeOptions = { quality: 3, alpha: true };

        // Nitidez apenas no último passo
        if (nextMaxSide === finalMaxSide) {
          resizeOptions.unsharpAmount = 160;
          resizeOptions.unsharpRadius = 0.6;
          resizeOptions.unsharpThreshold = 2;
        }

        const dst = document.createElement('canvas');
        dst.width = nextW;
        dst.height = nextH;

        await new Promise((resolve) => setTimeout(resolve, 0));
        await p.resize(currentCanvas, dst, resizeOptions);
        currentCanvas = dst;
      }

      const blob = await new Promise(res => currentCanvas.toBlob(res, 'image/jpeg', 1.0));
      const base64 = await imageCompression.getDataUrlFromFile(blob);

      return { 
        base64, 
        blob, 
        width: currentCanvas.width, 
        height: currentCanvas.height 
      };

    } catch (error) {
      console.error("Erro no Service ImageProcessor:", error);
      throw error;
    } finally {
      // Notifica que o processamento terminou
      if (onLoadingChange) onLoadingChange(false);
    }
  }
};