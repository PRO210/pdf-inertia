// constantes
const INCH_TO_CM = 2.54;

export function calcularRedimensionamentoProporcional(
  img,                // Image
  imgLarguraPx,       // largura real da imagem (px) - normalmente img.width
  imgAlturaPx,        // altura real da imagem (px) - normalmente img.height
  numColunas,
  numLinhas,
  orientacao = 'retrato',
  aspecto = true,
  DPI_MAX = 150       // você pode ajustar se quiser outro DPI máximo
) {
  // 1) área útil em cm
  let larguraCm = 19.0;
  let alturaCm = 27.7;
  if (orientacao === 'paisagem') {
    [larguraCm, alturaCm] = [27.7, 19.0];
  }

  // 2) converte para polegadas
  const larguraIn = larguraCm / INCH_TO_CM;
  const alturaIn = alturaCm / INCH_TO_CM;

  // 3) tamanho de cada pedaço em px (originais)
  const pedacoLarguraPx = imgLarguraPx / numColunas;
  const pedacoAlturaPx = imgAlturaPx / numLinhas;

  // 4) DPI teórico para preencher a área útil
  const dpiX = pedacoLarguraPx / larguraIn;
  const dpiY = pedacoAlturaPx / alturaIn;

  // 5) escolhe DPI sem ultrapassar DPI_MAX
  let dpiCanvas = Math.min(dpiX, dpiY, DPI_MAX);
  // se por algum motivo dpiCanvas for 0 ou NaN, fallback
  if (!isFinite(dpiCanvas) || dpiCanvas <= 0) dpiCanvas = Math.min(dpiX || DPI_MAX, dpiY || DPI_MAX, DPI_MAX);

  // 6) calcula em pixels qual seria a área "útil" com esse DPI
  const larguraUtilPx = Math.round(larguraIn * dpiCanvas);
  const alturaUtilPx = Math.round(alturaIn * dpiCanvas);

  // 7) cálculo da parte alvo em px respeitando o aspecto (ou preenchendo)
  let larguraAlvoPx, alturaAlvoPx, scale;

  if (aspecto) {
    // manter proporção: calcula escala separada e aplica a menor (não estica)
    const scaleX = larguraUtilPx / pedacoLarguraPx;
    const scaleY = alturaUtilPx / pedacoAlturaPx;
    scale = Math.min(scaleX, scaleY);

    // se scale for >1 e você não deseja upscaling, pode limitar com 1
    // scale = Math.min(scale, 1);

    larguraAlvoPx = Math.round(pedacoLarguraPx * scale);
    alturaAlvoPx = Math.round(pedacoAlturaPx * scale);
  } else {
    // estica totalmente para preencher a área útil
    larguraAlvoPx = larguraUtilPx;
    alturaAlvoPx = alturaUtilPx;
    scale = null;
  }

  // 8) dimensões finais em cm (baseadas no dpiCanvas usado)
  const larguraFinalCm = (larguraAlvoPx / dpiCanvas) * INCH_TO_CM;
  const alturaFinalCm = (alturaAlvoPx / dpiCanvas) * INCH_TO_CM;

  // logs úteis (sem limpar console)
  console.log("🧾 Dimensões finais com margens e DPI limitado:");
  console.log(`Área útil (cm): ${larguraCm.toFixed(2)} × ${alturaCm.toFixed(2)} (orientacao: ${orientacao})`);
  console.log(`DPI Canvas usado: ${Math.round(dpiCanvas.toFixed(2))}`);
  console.log(`Parte alvo (px): ${larguraAlvoPx} × ${alturaAlvoPx}`);
  console.log(`Parte original (px): ${pedacoLarguraPx.toFixed(2)} × ${pedacoAlturaPx.toFixed(2)}`);
  console.log(`Tamanho final (cm): ${larguraFinalCm.toFixed(2)} × ${alturaFinalCm.toFixed(2)}`);
  console.log(`Escala aplicada: ${scale !== null ? scale : 'preenchimento total (esticado)'}`);
  console.log(`Aspecto: ${aspecto ? 'Mantendo proporção' : 'Esticando para preencher área útil'}`);

  // 9) faz os cortes no canvas (usando larguraAlvoPx/alturaAlvoPx como destino)
  const partes = [];

  const destCanvas = document.createElement('canvas');
  destCanvas.width = Math.max(1, Math.round(larguraAlvoPx));
  destCanvas.height = Math.max(1, Math.round(alturaAlvoPx));
  
  const ctx = destCanvas.getContext('2d');

  for (let linha = 0; linha < numLinhas; linha++) {
    for (let coluna = 0; coluna < numColunas; coluna++) {
      const sx = (img.width / numColunas) * coluna;
      const sy = (img.height / numLinhas) * linha;
      const sw = img.width / numColunas;
      const sh = img.height / numLinhas;

      ctx.clearRect(0, 0, destCanvas.width, destCanvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destCanvas.width, destCanvas.height);

      partes.push(destCanvas.toDataURL('image/jpeg', 1));
    }
  }

  // 10) retorno ampliado com tudo que o gerarPDF precisa
  return {
    partes,                  // array de base64
    dpiCanvas,               // DPI usado para converter px -> cm
    larguraAlvoPx,
    alturaAlvoPx,
    larguraFinalCm,
    alturaFinalCm,
    larguraAreaUtilCm: larguraCm,
    alturaAreaUtilCm: alturaCm,
    numColunas,
    numLinhas,
    aspecto
  };
}
