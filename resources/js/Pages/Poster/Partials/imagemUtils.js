// Poster/Partials/imagemUtils.js

/**
 * 🧮 calcularRedimensionamentoProporcional()
 *
 * Esta função calcula como redimensionar proporcionalmente uma imagem
 * (ou um pedaço dela) para caber dentro do tamanho de uma folha A4
 * mantendo a proporção e a escala corretas.
 *
 * Ela serve como base para cortes de imagem ou geração de PDFs,
 * garantindo que cada "pedaço" da imagem ocupe o espaço certo no papel,
 * sem distorção.
 *
 * Parâmetros:
 * - imgLarguraPx: largura total da imagem original (em pixels)
 * - imgAlturaPx: altura total da imagem original (em pixels)
 * - numColunas: número de colunas em que a imagem será dividida
 * - numLinhas: número de linhas em que a imagem será dividida
 * - orientacao: 'retrato' (padrão) ou 'paisagem' — define a orientação da folha A4
 *
 * Retorna um objeto com:
 * {
 *   dpiCanvas,        // resolução real usada para encaixar no A4
 *   larguraUtilPx,    // largura total útil do A4 em pixels
 *   alturaUtilPx,     // altura total útil do A4 em pixels
 *   larguraAlvoPx,    // largura final de cada pedaço no canvas
 *   alturaAlvoPx,     // altura final de cada pedaço no canvas
 *   larguraFinalCm,   // largura final do pedaço no A4 (em cm)
 *   alturaFinalCm     // altura final do pedaço no A4 (em cm)
 * }
 */
export function calcularRedimensionamentoProporcional(
  imgLarguraPx,
  imgAlturaPx,
  numColunas,
  numLinhas,
  orientacao = 'retrato'
) {
  // Conversão de polegadas para centímetros
  const INCH_TO_CM = 2.54;

  // 📄 1. Define dimensões padrão de uma folha A4 em cm
  let larguraCm = 21.0;
  let alturaCm = 29.7;

  // 📐 2. Ajusta dimensões caso a orientação seja "paisagem"
  if (orientacao.toLowerCase() === 'paisagem') {
    [larguraCm, alturaCm] = [29.7, 21.0];
  }

  // 📏 3. Converte dimensões do A4 para polegadas
  const larguraIn = larguraCm / INCH_TO_CM;
  const alturaIn = alturaCm / INCH_TO_CM;

  // 🔹 4. Calcula o tamanho de cada pedaço da imagem em pixels
  const pedacoLarguraPx = imgLarguraPx / numColunas;
  const pedacoAlturaPx = imgAlturaPx / numLinhas;

  // 🎯 5. Calcula o DPI proporcional de cada pedaço em relação ao A4
  // (quanto mais DPI, mais detalhes cabem no mesmo espaço físico)
  const dpiX = pedacoLarguraPx / larguraIn;
  const dpiY = pedacoAlturaPx / alturaIn;

  // 📸 6. Usa o menor DPI como base para manter a proporção sem esticar
  const dpiCanvas = Math.min(dpiX, dpiY);

  // 🧭 7. Calcula a área útil total do A4 em pixels com base no DPI final
  const larguraUtilPx = Math.round(larguraIn * dpiCanvas);
  const alturaUtilPx = Math.round(alturaIn * dpiCanvas);

  // 🧩 8. Calcula a largura e altura alvo de cada pedaço no canvas,
  // proporcionalmente ao DPI final
  const larguraAlvoPx = Math.round(pedacoLarguraPx * (dpiCanvas / dpiX));
  const alturaAlvoPx = Math.round(pedacoAlturaPx * (dpiCanvas / dpiY));

  // 📐 9. Converte o tamanho final do pedaço para centímetros (para debug ou exibição)
  const larguraFinalCm = (larguraAlvoPx / dpiCanvas) * INCH_TO_CM;
  const alturaFinalCm = (alturaAlvoPx / dpiCanvas) * INCH_TO_CM;

  // 📦 10. Retorna os valores calculados
  return {
    dpiCanvas: dpiCanvas.toFixed(2),
    larguraUtilPx,
    alturaUtilPx,
    larguraAlvoPx,
    alturaAlvoPx,
    larguraFinalCm: larguraFinalCm.toFixed(2),
    alturaFinalCm: alturaFinalCm.toFixed(2),
  };
}
