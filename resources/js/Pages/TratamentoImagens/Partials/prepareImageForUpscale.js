/**
 * 1. Calcula os tamanhos original e esperado após o upscale.
 * 2. Reduz (downsize) a imagem original para um Base64 otimizado para envio.
 *
 * @param {File} image Objeto File da imagem original.
 * @param {number} scaleFactor Fator de escala desejado (ex: 2, 4).
 * @param {Function} downsizeParaReplicate Função que realiza a redução.
 * @returns {Promise<{dataToSend: Object, expectedMaxSide: number, originalWidth: number, originalHeight: number}>}
 */
async function prepareImageForUpscale(image, scaleFactor, downsizeParaReplicate) {
    
    const MAX_SIDE_REPLICATE = 9000; // Constante para o teto de 9k

    // 🔹 1. Calcula tamanho original para referência
    const originalBitmap = await createImageBitmap(image);
    const originalWidth = originalBitmap.width;
    const originalHeight = originalBitmap.height;
    const originalMaxSide = Math.max(originalWidth, originalHeight);

    // 🔹 2. Calcula o tamanho esperado
    const expectedMaxSide = Math.min(originalMaxSide * scaleFactor, MAX_SIDE_REPLICATE);
    console.log(`📏 Original: ${originalWidth}x${originalHeight} → Esperado: ${expectedMaxSide} px`);

    // 🔹 3. Reduz a imagem original e obtém o Base64
    const base64Image = await downsizeParaReplicate(image);
    
    // 🔹 4. Prepara o payload
    const dataToSend = {
        image: base64Image,
        scale: scaleFactor,
    };

    return {
        dataToSend,
        expectedMaxSide,
        originalWidth,
        originalHeight,
    };
}

export default prepareImageForUpscale;
//