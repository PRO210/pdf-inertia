export function aplicarMascaraCanvas(imagemSrc, mascaraSrc) {
    return new Promise(async (resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const img = await carregarImg(imagemSrc);
        const mask = await carregarImg(mascaraSrc);

        canvas.width = img.width;
        canvas.height = img.height;

        // 1) Desenha máscara
        ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);

        const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const alphaData = new Uint8ClampedArray(maskData.data.length);

        for (let i = 0; i < maskData.data.length; i += 4) {
            alphaData[i + 3] = maskData.data[i]; // Branco = visível, preto = invisível
        }

        // 2) Desenha a imagem original
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 3) Aplica alpha vindo da máscara
        for (let i = 0; i < finalData.data.length; i += 4) {
            finalData.data[i + 3] = alphaData[i + 3];
        }

        ctx.putImageData(finalData, 0, 0);

        resolve(canvas.toDataURL("image/png"));
    });
}

function carregarImg(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.src = src;
    });
}
