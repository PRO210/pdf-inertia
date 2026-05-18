// resources/js/Services/PicaService.js

/**
* Redimensiona o ImagemBitmap (imgBitmap) para se ajustar proporcionalmente
* ao tamanho ideal (larguraIdeal, alturaIdeal), escalonando em múltiplos passos,
*
* @param {ImageBitmap} imgBitmap O objeto ImageBitmap (a imagem real).
* @param {number} larguraIdeal A largura máxima desejada.
* @param {number} alturaIdeal A altura máxima desejada.
* @returns {Promise<{base64: string, blob: Blob, width: number, height: number}>} Objeto com os dados da imagem final.
*/

export async function ajustarImagemPica(imgBitmap, larguraIdeal, alturaIdeal, picaInstance) {
  const MAX_STEP = 2; // Fator máximo de escala por passo

  // Inicializa o canvas de origem com a imagem original
  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = imgBitmap.width;
  currentCanvas.height = imgBitmap.height;
  currentCanvas.getContext('2d').drawImage(imgBitmap, 0, 0);

  // 1. Determina a proporção e o lado maior alvo
  const ratio = imgBitmap.height / imgBitmap.width;
  let isHeightGreater = imgBitmap.height > imgBitmap.width;
  let currentMaxSide = isHeightGreater ? imgBitmap.height : imgBitmap.width;
  const finalMaxSide = Math.max(larguraIdeal, alturaIdeal);

  // Cria a instância do Pica (usando a instância do estado)
  const p = picaInstance;

  // Loop de redimensionamento progressivo (em múltiplos passos)
  while (currentMaxSide < finalMaxSide) {
    // 2. Calcula a escala para este passo, limitada a MAX_STEP (2x)
    let scale = Math.min(MAX_STEP, finalMaxSide / currentMaxSide);

    // Calcula o próximo lado maior que não ultrapasse o alvo final
    let nextMaxSide = Math.min(Math.round(currentMaxSide * scale), finalMaxSide);

    // Se não houver mudança, saímos do loop para evitar um ciclo infinito
    if (nextMaxSide <= currentMaxSide) {
      break;
    }

    // 3. Calcula as novas dimensões de Largura e Altura, respeitando o ratio
    let nextW, nextH;

    if (isHeightGreater) {
      nextH = nextMaxSide;
      nextW = Math.round(nextH / ratio);
    } else {
      nextW = nextMaxSide;
      nextH = Math.round(nextW * ratio);
    }

    // 4. Atualiza o lado maior atual para o próximo passo
    currentMaxSide = nextMaxSide;

    // 5. Configura as opções de redimensionamento e filtros de nitidez
    let resizeOptions = {
      quality: 3,             // Filtro Lanczos3 (Melhor qualidade)
      alpha: true,           // Se vai salvar em JPEG, mude para false (melhora performance e canais de cor)
      unsharpAmount: 40,      // Ativa o filtro de nitidez (valores entre 30 e 50 são ideais)
      unsharpRadius: 0.6,     // Raio do borrão para a máscara (0.5 a 1.0)
      unsharpThreshold: 2     // Evita criar ruído em superfícies lisas (como pele)
    };

    // Cria o canvas de destino para este passo
    const dst = document.createElement('canvas');
    dst.width = nextW; dst.height = nextH;

    // ⚡ Adiciona esse "respiro" para evitar travar a UI
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 6. Redimensiona usando o Pica
    await p.resize(currentCanvas, dst, resizeOptions);

    // O canvas de destino se torna o canvas de origem para o próximo passo
    currentCanvas = dst;
  }

  // Obtém o canvas final que está em 'currentCanvas'
  const resultadoCanvas = currentCanvas;
  const newWidth = resultadoCanvas.width;
  const newHeight = resultadoCanvas.height;

  // 7. Converte o Canvas para Blob (JPEG com qualidade 1.0)
  const blob = await new Promise(res => resultadoCanvas.toBlob(res, 'image/jpeg', 0.85));

  // 8. Converte o Blob para Base64
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  // 9. Retorna o objeto de destino completo
  return { base64, blob, width: newWidth, height: newHeight };
}
