import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/js/pdf.worker.min.js";

export default function PdfPreview({
  imagens,
  setImagens,
  cabecalhoAtivo,
  cabecalhoTexto,
  repeatBorder,
  espessuraBorda,
  tamanhoTile,
  orientacao,
  ampliacao,
  totalSlots,
  aspecto,
  removerImagem,
  setAlteracoesPendentes,
  erroPdf,
  carregando,
  adicionarPrimeiraImagem,
  repeatMode,
}) {

  // Função de upload de imagem/PDF (usa adicionarPrimeiraImagem e repeatMode)
  const handleFileChange = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async () => {
        const typedArray = new Uint8Array(reader.result);

        try {
          const loadingTask = pdfjsLib.getDocument({ data: typedArray });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.0 });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");

          await page.render({ canvasContext: context, viewport }).promise;

          const pdfPreviewImg = canvas.toDataURL("image/jpeg", 1.0);

          // chama adicionarPrimeiraImagem (se fornecida)
          if (typeof adicionarPrimeiraImagem === "function") {
            adicionarPrimeiraImagem(pdfPreviewImg, repeatMode);
          }

          setImagens((prev = []) => {
            const novas = [...prev];
            if (novas.length < totalSlots) {
              while (novas.length < totalSlots) novas.push(null);
            }
            novas[index] = pdfPreviewImg;
            return novas;
          });

          setAlteracoesPendentes(true);
        } catch (err) {
          console.error("Erro ao carregar PDF:", err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;

        // chama adicionarPrimeiraImagem (se fornecida)
        if (typeof adicionarPrimeiraImagem === "function") {
          adicionarPrimeiraImagem(dataUrl, repeatMode);
        }

        setImagens((prev = []) => {
          const novas = [...prev];
          if (novas.length < totalSlots) {
            while (novas.length < totalSlots) novas.push(null);
          }
          novas[index] = dataUrl;
          return novas;
        });

        setAlteracoesPendentes(true);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Formato não suportado. Envie imagem ou PDF.");
    }
  };

  return (
    <div
      className={`relative mx-auto bg-white rounded-lg
    ${orientacao === "retrato" ? "aspect-[595/842]" : "aspect-[842/750]"}
    w-full max-w-[842px]
  `}
      style={{
        display: "grid",
        gap: "0.5rem",
        padding: espessuraBorda, // 🔹 reserva espaço para bordas
        gridTemplateColumns: `repeat(${Math.max(ampliacao?.colunas || 1, 1)}, 1fr)`,
        gridTemplateRows: `repeat(${Math.max((ampliacao?.linhas || ampliacao?.colunas || 1), 1)}, 1fr)`,
      }}
    >
      {/* 🔹 Bordas agora estão DENTRO do grid */}
      {repeatBorder !== "none" && (
        <>
          {/* Topo */}
          <div
            className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{
              height: espessuraBorda,
              backgroundImage: `url(/imagens/bordas/${repeatBorder}.png)`,
              backgroundRepeat: "repeat-x",
              backgroundSize: `${tamanhoTile}px auto`,
              backgroundPosition: "top left",
            }}
          />
          {/* Baixo */}
          <div
            className="absolute left-0 right-0 bottom-0 pointer-events-none"
            style={{
              height: espessuraBorda,
              backgroundImage: `url(/imagens/bordas/${repeatBorder}.png)`,
              backgroundRepeat: "repeat-x",
              backgroundSize: `${tamanhoTile}px auto`,
              backgroundPosition: "bottom left",
            }}
          />
          {/* Esquerda */}
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none"
            style={{
              width: espessuraBorda,
              backgroundImage: `url(/imagens/bordas/${repeatBorder}Y.png)`,
              backgroundRepeat: "repeat-y",
              backgroundSize: `auto ${tamanhoTile}px`,
              backgroundPosition: "top left",
            }}
          />
          {/* Direita */}
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none"
            style={{
              width: espessuraBorda,
              backgroundImage: `url(/imagens/bordas/${repeatBorder}Y.png)`,
              backgroundRepeat: "repeat-y",
              backgroundSize: `auto ${tamanhoTile}px`,
              backgroundPosition: "top right",
            }}
          />
        </>
      )}

      {/* Slots do grid */}
      {Array.from({ length: totalSlots }).map((_, i) => {
        const imgSrc = imagens[i] || null;

        return (
          <div
            key={i}
            className="w-full h-full border-2 border-dashed rounded-md flex flex-col items-center justify-center text-xs text-gray-400 relative overflow-hidden"
          >
            {/* Cabeçalho dinâmico */}
            {cabecalhoAtivo && (
              <div className="w-full flex flex-col gap-1 p-2">
                {cabecalhoTexto.map((linha, index) => (
                  <div
                    key={index}
                    className="w-full truncate"
                    title={linha}
                  >
                    {linha}
                  </div>
                ))}
              </div>
            )}

            {imgSrc ? (
              <>
                <img
                  src={imgSrc}
                  alt={`Imagem ${i + 1}`}
                  className={`w-full h-full rounded-md ${aspecto ? "object-contain" : "object-fill"}`}
                />
                <button
                  title="Remover imagem"
                  onClick={() => removerImagem(i)}
                  className="absolute top-2 right-2 z-20 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow text-xs"
                >
                  Remover
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-2">
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-center">Envie imagem ou PDF :)</p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, i)}
                  className="pro-btn-blue file:mr-2 file:py-2 file:px-2 
                            file:rounded-md file:border-0 file:text-sm sm:text-base md:text-lg lg:text-xl 
                            file:font-semibold file:bg-blue-50 
                            file:text-blue-700 hover:file:bg-blue-100 
                            cursor-pointer"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>

  )
}
