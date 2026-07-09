// export function aplicarMascaraCanvas(imagemSrc, mascaraSrc) {
//     return new Promise(async (resolve) => {

//         const canvas = document.createElement("canvas");
//         const ctx = canvas.getContext("2d");

//         const img = await carregarImg(imagemSrc);
//         const mask = await carregarImg(mascaraSrc);

//         const ehCirculo = mascaraSrc.toLowerCase().includes("circulo");
//         const ehCoracao = mascaraSrc.toLowerCase().includes("coracao");


//         if (ehCirculo || ehCoracao) {

//             canvas.width = img.width;
//             canvas.height = img.height;

//             if (ehCirculo) {

//                 // 1) Desenha máscara
//                 ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);

//                 const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//                 const alphaData = new Uint8ClampedArray(maskData.data.length);

//                 for (let i = 0; i < maskData.data.length; i += 4) {
//                     alphaData[i + 3] = maskData.data[i]; // Branco = visível, preto = invisível
//                 }

//                 // 2) Desenha a imagem original
//                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

//                 const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);

//                 // 3) Aplica alpha vindo da máscara
//                 for (let i = 0; i < finalData.data.length; i += 4) {
//                     finalData.data[i + 3] = alphaData[i + 3];
//                 }

//                 ctx.putImageData(finalData, 0, 0);



//             } else if (ehCoracao) {


//                 // 1) Desenha a máscara de coração esticada no tamanho da diagonal
//                 ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);

//                 const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//                 const alphaData = new Uint8ClampedArray(maskData.data.length);

//                 // Recupera a opacidade baseada na cor (exatamente como no seu código original)
//                 for (let i = 0; i < maskData.data.length; i += 4) {
//                     alphaData[i + 3] = maskData.data[i]; // Branco (255) = visível, Preto (0) = invisível
//                 }


//                 // 2) Desenha a imagem original centralizada no meio da diagonal
//                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

//                 const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);

//                 // 3) Aplica o alpha gerado pela máscara sobre a imagem final
//                 for (let i = 0; i < finalData.data.length; i += 4) {
//                     finalData.data[i + 3] = alphaData[i + 3];
//                 }

//                 ctx.putImageData(finalData, 0, 0);
//             }

//         } else {

//             canvas.width = img.width;
//             canvas.height = img.height;           

//             ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);

//             const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//             const alphaData = new Uint8ClampedArray(maskData.data.length);

//             for (let i = 0; i < maskData.data.length; i += 4) {
//                 alphaData[i + 3] = maskData.data[i];
//             }

//             ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

//             const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);

//             for (let i = 0; i < finalData.data.length; i += 4) {
//                 finalData.data[i + 3] = alphaData[i + 3];
//             }

//             ctx.putImageData(finalData, 0, 0);
//         }

//         resolve(canvas.toDataURL("image/png"));
//     });
// }

// function carregarImg(src) {
//     return new Promise((resolve) => {
//         const img = new Image();
//         img.crossOrigin = "anonymous";
//         img.onload = () => resolve(img);
//         img.src = src;
//     });
// }


export function aplicarMascaraCanvas(imagemSrc, mascaraSrc) {
    return new Promise(async (resolve) => {

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const img = await carregarImg(imagemSrc);
        const mask = await carregarImg(mascaraSrc);

        const ehCirculo = mascaraSrc.toLowerCase().includes("circulo");
        const ehCoracao = mascaraSrc.toLowerCase().includes("coracao");

        // --- NOVA VARIÁVEL DE PERCENTUAL ---
        // Exemplo: 1.15 significa que o canvas será 15% MAIOR que a imagem.
        let escalaCanvas = 1.0;
        
        if (ehCirculo || ehCoracao) {
            escalaCanvas = 1.1;
        }

        // O canvas ganha o tamanho com o percentual aplicado
        const width = Math.round(img.width * escalaCanvas);
        const height = Math.round(img.height * escalaCanvas);

        canvas.width = width;
        canvas.height = height;

        // --- REQUISITO: REMOVER TRANSPARÊNCIA (Mudar para fundo branco) ---
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);

        // 1) Desenha a máscara ocupando o novo tamanho total do canvas
        ctx.drawImage(mask, 0, 0, width, height);
        const maskData = ctx.getImageData(0, 0, width, height);
        const maskPixels = maskData.data;

        const alphaData = new Uint8ClampedArray(maskPixels.length);
        const bordaPixels = new Uint8Array(width * height);

        // 2) Mapeia o Alpha da máscara e descobre onde fica a borda
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = maskPixels[i];

                alphaData[i + 3] = r;

                if (r > 128) {
                    let ehBorda = false;
                    if (x > 0 && maskPixels[i - 4] <= 128) ehBorda = true;
                    if (x < width - 1 && maskPixels[i + 4] <= 128) ehBorda = true;
                    if (y > 0 && maskPixels[i - width * 4] <= 128) ehBorda = true;
                    if (y < height - 1 && maskPixels[i + width * 4] <= 128) ehBorda = true;

                    if (ehBorda) {
                        bordaPixels[y * width + x] = 1;
                    }
                }
            }
        }

        // 3) Desenha a imagem real do usuário centralizada no novo canvas maior
        // Calculamos o deslocamento (offset) para a imagem ficar bem no meio do espaço extra
        const offsetX = Math.round((width - img.width) / 2);
        const offsetY = Math.round((height - img.height) / 2);
        ctx.drawImage(img, offsetX, offsetY, img.width, img.height);

        const finalData = ctx.getImageData(0, 0, width, height);
        const finalPixels = finalData.data;

        // 4) Combina tudo: Aplica a máscara e a borda preta de corte
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;

                if (bordaPixels[y * width + x] === 1) {
                    finalPixels[i] = 0;
                    finalPixels[i + 1] = 0;
                    finalPixels[i + 2] = 0;
                    finalPixels[i + 3] = 255;
                } else {
                    if (alphaData[i + 3] < 128) {
                        finalPixels[i] = 255;
                        finalPixels[i + 1] = 255;
                        finalPixels[i + 2] = 255;
                        finalPixels[i + 3] = 255;
                    }
                }
            }
        }

        ctx.putImageData(finalData, 0, 0);

        // Exportar como JPEG
        resolve(canvas.toDataURL("image/jpeg", 0.8));
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