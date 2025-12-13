import imageCompression from 'browser-image-compression';


/**
   * Redimensiona usando browser-image-compression (modo mais natural)
  */
export async function ajustarImagemBic(file, larguraIdeal, alturaIdeal) {

  const options = {
    maxWidthOrHeight: Math.max(larguraIdeal, alturaIdeal),
    useWebWorker: true,
    maxSizeMB: 1,
    initialQuality: 1.0,
    fileType: 'image/jpeg',
    alwaysKeepResolution: true,
  };

  console.log('--- DETALHES DO REDIMENSIONAMENTO (BIC) ---');
  console.log(`Ideal: ${larguraIdeal}px x ${alturaIdeal}px`);
  console.log('Opções:', options);

  const compressedBlob = await imageCompression(file, options);

  const finalBase64 = await imageCompression.getDataUrlFromFile(compressedBlob);

  // Cria uma URL temporária e carrega como imagem
  const tempURL = URL.createObjectURL(compressedBlob);

  const img = new Image();

  img.crossOrigin = "Anonymous";

  await new Promise((resolve) => {
    img.onload = () => {
      URL.revokeObjectURL(tempURL);
      resolve();
    };
    img.src = tempURL;
  });

  img.width = img.naturalWidth;
  img.height = img.naturalHeight;

  return { blob: compressedBlob, width: img.width, height: img.height, url: tempURL, base64: finalBase64 };
}


