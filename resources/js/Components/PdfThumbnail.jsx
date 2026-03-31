const PdfThumbnail = ({ url }) => {
  const canvasRef = useRef(null);
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    const generateThumb = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1); // Pega a primeira página
        
        const viewport = page.getViewport({ scale: 0.3 }); // Escala pequena para miniatura
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        setThumb(canvas.toDataURL()); // Converte para imagem base64
      } catch (error) {
        console.error("Erro ao gerar miniatura:", error);
      }
    };

    if (url) generateThumb();
  }, [url]);

  return (
    <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center overflow-hidden border">
      {thumb ? (
        <img src={thumb} alt="Preview" className="object-cover w-full h-full" />
      ) : (
        <span className="text-xs text-gray-400">Carregando...</span>
      )}
    </div>
  );
};
