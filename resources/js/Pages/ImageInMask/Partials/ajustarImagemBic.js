import imageCompression from 'browser-image-compression';

const UM_MB = 1024 * 1024;

/**
 * Redimensiona SOMENTE imagens >= 1MB
 */
export async function ajustarImagemBic(file, larguraIdeal, alturaIdeal) {

  console.log('--- TESTE DE TAMANHO DA IMAGEM ---');
  console.log(`Tamanho original: ${(file.size / UM_MB).toFixed(2)} MB`);

  // ✅ Se for menor que 1MB, NÃO comprime
  if (file.size < UM_MB) {
    console.log('🟢 Imagem < 1MB — mantendo original');

    const base64 = await imageCompression.getDataUrlFromFile(file);

    const img = new Image();
    const tempURL = URL.createObjectURL(file);

    await new Promise(resolve => {
      img.onload = () => {
        URL.revokeObjectURL(tempURL);
        resolve();
      };
      img.src = tempURL;
    });

    return {
      blob: file,
      width: img.naturalWidth,
      height: img.naturalHeight,
      url: tempURL,
      base64
    };
  }

  // 🔽 Se for >= 1MB, comprime
  console.log('🟠 Imagem ≥ 1MB — aplicando compressão');

  const options = {
    maxWidthOrHeight: Math.max(larguraIdeal, alturaIdeal),
    useWebWorker: true,
    maxSizeMB: 0.5,
    initialQuality: 0.7,
    fileType: 'image/jpeg',
    alwaysKeepResolution: false,
  };

  const compressedBlob = await imageCompression(file, options);
  const finalBase64 = await imageCompression.getDataUrlFromFile(compressedBlob);

  const tempURL = URL.createObjectURL(compressedBlob);
  const img = new Image();
  img.crossOrigin = "Anonymous";

  await new Promise(resolve => {
    img.onload = () => {
      URL.revokeObjectURL(tempURL);
      resolve();
    };
    img.src = tempURL;
  });

  return {
    blob: compressedBlob,
    width: img.naturalWidth,
    height: img.naturalHeight,
    url: tempURL,
    base64: finalBase64
  };
}
