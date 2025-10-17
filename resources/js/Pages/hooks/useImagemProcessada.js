import { useState, useEffect, useCallback } from "react";
import imageCompression from "browser-image-compression";

export function useImagemProcessada(imagemBase64Original, ampliacao) {
  const [imagemProcessada, setImagemProcessada] = useState(null);
  const [carregandoImagem, setCarregandoImagem] = useState(false);

  const processarImagem = useCallback(async () => {
    if (!imagemBase64Original) {
      console.log("⚠️ Nenhuma imagem para processar.");
      return;
    }

    console.log("🟡 [Início] Processamento da imagem...");
    setCarregandoImagem(true);

    let cancelado = false;

    try {
      const img = new Image();
      img.src = imagemBase64Original;

      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      if (cancelado) return;

      const larguraOriginal = img.width;
      const alturaOriginal = img.height;
      console.log(`🔹 Dimensões originais: ${larguraOriginal}×${alturaOriginal}`);

      let fator = 1;
      let qualidade = 0.9;
      let aplicadaReducao = false;

      if (larguraOriginal > 5000 && ampliacao.colunas < 5) {
        fator = 5000 / larguraOriginal;
        qualidade = 0.9;
        aplicadaReducao = true;
        console.log(
          `⚙️ Regra: imagem > 5000 e colunas < 5 → reduzir para 5000px (fator=${fator.toFixed(
            3
          )}), qualidade=${qualidade}`
        );
      } else if (larguraOriginal > 5000 && ampliacao.colunas >= 5) {
        fator = 1;
        qualidade = 0.85;
        console.log(
          `⚙️ Regra: imagem > 5000 e colunas ≥ 5 → manter tamanho original, qualidade=${qualidade}`
        );
      } else {
        fator = 1;
        qualidade = 0.9;
        console.log(`⚙️ Regra: imagem ≤ 5000px → manter tamanho, qualidade=${qualidade}`);
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = Math.round(larguraOriginal * fator);
      canvas.height = Math.round(alturaOriginal * fator);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (aplicadaReducao) {
        console.log(`↳ Redimensionado para: ${canvas.width}×${canvas.height}`);
      } else {
        console.log(`↳ Mantido em: ${canvas.width}×${canvas.height}`);
      }

      const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", qualidade));

      if (!blob) throw new Error("Falha ao gerar blob da imagem.");

      // Compressão final com a lib
      const compressed = await imageCompression(blob, {
        maxSizeMB: 10,
        useWebWorker: true,
      });

      const base64 = await imageCompression.getDataUrlFromFile(compressed);

      if (!cancelado) {
        console.log(
          `✅ [Fim] Imagem processada: ${canvas.width}×${canvas.height} | ${(compressed.size / 1024).toFixed(1)} KB`
        );
        setImagemProcessada(base64);
      }
    } catch (err) {
      console.error("❌ Erro ao processar imagem:", err);
    } finally {
      if (!cancelado) setCarregandoImagem(false);
    }

    return () => {
      cancelado = true;
    };
  }, [imagemBase64Original, ampliacao.colunas]);

  // dispara automaticamente
  useEffect(() => {
    const cancel = processarImagem();
    return () => {
      if (typeof cancel === "function") cancel();
    };
  }, [processarImagem]);

  return { imagemProcessada, carregandoImagem, processarImagem };
}
