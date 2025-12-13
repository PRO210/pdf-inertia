/**
 * Helper: Obtém a largura e altura de um File (imagem)
 * @param {File} file O objeto File da imagem.
 * @returns {Promise<{width: number, height: number}>} As dimensões originais.
 */
const getOriginalImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Cria uma URL temporária a partir do File/Blob
    const tempURL = URL.createObjectURL(file);

    img.onload = () => {
      // Libera a URL temporária assim que as dimensões forem lidas
      URL.revokeObjectURL(tempURL);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(tempURL);
      reject(new Error("Falha ao carregar imagem para verificar as dimensões."));
    };

    img.src = tempURL;
  });
};

export { getOriginalImageDimensions };