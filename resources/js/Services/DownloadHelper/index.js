/**
 * Baixa um arquivo a partir de uma URL ou string Base64.
 *
 * @param {string} source - A URL do arquivo ou a string Base64 (Data URI).
 * @param {string} fileName - O nome base do arquivo (ex: 'resultado_final').
 * @param {string} defaultExt - A extensão padrão ou detectada (ex: 'webp', 'png').
 */
export const downloadImageFromSource = (source, fileName, defaultExt) => {
    if (!source) {
        console.error("Fonte da imagem não fornecida.");
        return;
    }

    try {
        const link = document.createElement('a');
        
        // 1. Define o href: A própria URL ou Base64
        link.href = source;
        
        // 2. Define a extensão e o nome do arquivo
        let finalExt = defaultExt;
        
        // Se a fonte for uma URL, tentamos detectar a extensão no final da URL para maior precisão
        if (source.startsWith('http') || source.startsWith('/storage')) {
            const urlParts = source.split('.');
            if (urlParts.length > 1) {
                finalExt = urlParts.pop().split(/[?#]/)[0] || defaultExt;
            }
        } 
        // Se for Base64 (Data URI), a extensão já deve ser passada via defaultExt
        
        link.download = `${fileName}.${finalExt}`;

        // 3. Simula o clique para iniciar o download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpeza (necessária apenas se estiver usando createObjectURL, mas bom manter)
        if (source.startsWith('blob:')) {
            URL.revokeObjectURL(source);
        }

        console.log(`Download iniciado para: ${fileName}.${finalExt}`);

    } catch (err) {
        console.error('Erro ao iniciar o download:', err);
        // Opcional: Mostrar notificação de erro aqui
        Swal.fire({
            icon: 'error',
            title: 'Erro ao baixar o arquivo',
            text: 'Ocorreu um erro ao tentar baixar. Por favor, tente novamente ou contate o administrador.',
        });
    }
};