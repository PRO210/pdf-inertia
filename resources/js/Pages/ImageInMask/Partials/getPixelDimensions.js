/**
 * Lê o arquivo de imagem (File object) e retorna suas dimensões em pixels.
 * @param {File} file O objeto File da imagem.
 * @returns {Promise<{width: number, height: number}>} Largura e altura em pixels.
 */
const getPixelDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // As dimensões estão disponíveis
      resolve({
        width: img.width,
        height: img.height,
      });
      URL.revokeObjectURL(url); // Limpa o URL temporário
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar a imagem para leitura de dimensões."));
    };

    img.src = url;
  });
};