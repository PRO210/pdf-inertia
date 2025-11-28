/**
 * Baixa um arquivo a partir de uma URL ou string Base64.
 *
 * @param {string} source - A URL do arquivo ou a string Base64 (Data URI).
 * @param {string} fileName - O nome base do arquivo (ex: 'resultado_final').
 * @param {string} defaultExt - A extensão padrão ou detectada (ex: 'webp', 'png').
 */
export const downloadImageFromReplicate = async (source, fileName, defaultExt) => {
    if (!source) {
        console.error("Fonte da imagem não fornecida.");
        return;
    }

    try {
        const link = document.createElement('a');
        let finalExt = defaultExt;
        let blobUrl = source; // Assume que a fonte é Base64 ou já uma URL local

        // 1. Lógica para URLs públicas (HTTPS/HTTP)
        if (source.startsWith('http') || source.startsWith('/storage')) {
            console.log("Tentando buscar URL externa para download...");
            
            // A. Detecta a extensão do arquivo
            const urlParts = source.split('.');
            if (urlParts.length > 1) {
                finalExt = urlParts.pop().split(/[?#]/)[0] || defaultExt;
            }

            // B. Usa fetch para obter o conteúdo (ignora CORS para download)
            // O 'mode: cors' é importante, mas o 'cache: no-cache' ajuda
            const response = await fetch(source, { mode: 'cors', cache: 'no-cache' });

            if (!response.ok) {
                throw new Error(`Erro de rede ao baixar a imagem: ${response.statusText}`);
            }

            // C. Converte a resposta em um Blob (objeto binário de dados)
            const blob = await response.blob();
            
            // D. Cria uma URL temporária local (Blob URL)
            // Esta nova URL local não tem restrição de origem cruzada, então o download funciona!
            blobUrl = URL.createObjectURL(blob);
        } 
        
        // 2. Define o href e o nome do arquivo
        link.href = blobUrl;
        link.download = `${fileName}.${finalExt}`;

        // 3. Simula o clique para iniciar o download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 4. Limpeza: Revoga a Blob URL para liberar memória
        if (blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(blobUrl);
        }

        console.log(`Download iniciado para: ${fileName}.${finalExt}`);

    } catch (err) {
        console.error('Erro ao iniciar o download:', err);
        // Seu código de notificação de erro aqui
    }
};
