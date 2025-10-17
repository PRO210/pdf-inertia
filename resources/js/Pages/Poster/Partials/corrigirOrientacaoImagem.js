export async function corrigirOrientacaoImagem(base64) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let width = img.width;
        let height = img.height;

        // Corrige se a imagem estiver deitada (orientação EXIF 6)
        if (width > height * 1.5) {
          canvas.width = height;
          canvas.height = width;
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, 0, -height);
        } else {
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
        }

        const corrigida = canvas.toDataURL("image/jpeg", 1);
        resolve(corrigida);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = base64;
  });
}
