import imageCompression from 'browser-image-compression';

/**
 * Ajusta o tamanho da imagem de entrada para garantir que ela não exceda o limite de pixels
 * da GPU do Replicate (aprox. 2.1MP), mantendo a proporção original.  
 */
export async function ImageDownsizeCompression(file) {
  const MAX_PIXELS = 2096704;
  const img = new Image();
  const tempUrl = URL.createObjectURL(file);
  img.src = tempUrl;

  // Aguarda a leitura das dimensões da imagem
  await new Promise((resolve) => {
    img.onload = () => {
      URL.revokeObjectURL(tempUrl);
      resolve();
    };
  });

  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;
  const originalPixels = originalWidth * originalHeight;

  let targetMaxWidthOrHeight = Math.max(originalWidth, originalHeight);

  if (originalPixels > MAX_PIXELS) {
    const reductionFactor = Math.sqrt(originalPixels / MAX_PIXELS);
    targetMaxWidthOrHeight = Math.floor(Math.max(originalWidth, originalHeight) / reductionFactor);
    console.warn(`⚠️ Imagem original será reduzida. Novo max size: ${targetMaxWidthOrHeight} px`);
  } else {
    console.log(`✅ Imagem original está no limite. Não será redimensionada.`);
  }

  const options = {
    maxWidthOrHeight: targetMaxWidthOrHeight,
    useWebWorker: true,
    maxSizeMB: 2,
    initialQuality: 1.0,
    fileType: 'image/jpeg',
    alwaysKeepResolution: true,
  };

  const compressedBlob = await imageCompression(file, options);
  const finalBase64 = await imageCompression.getDataUrlFromFile(compressedBlob);

  console.log(`--- AJUSTE CONCLUÍDO ---`);
  console.log(`Tamanho final do Base64: ${(finalBase64.length / (1024 * 1024)).toFixed(2)} MB`);

  return finalBase64;
}