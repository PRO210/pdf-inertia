import PlusIcon from '@/Components/svgs/PlusIcon'
import PdfThumbnail from "@/Components/usePdfThumbnail";

/**
 * Componente responsável pelo histórico de PDFs:
 *
 * - Grid desktop
 * - Download / Exclusão
 * - Limpar histórico
 * - Nova página
 */
export default function PdfHistoryEditor({
  pdfs,
  processarDownload,
  removerPdf,
  handleLimparTudo,
  comecarNovaPagina,
  auth,
}) {

  return (
    <div className='w-full'>

      {/* =======================================================
               GRID DESKTOP (HISTÓRICO)
            ======================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {pdfs.map((pdf) => (
          <div
            key={pdf.id}
            className="
              group
              relative
              bg-white
              p-2
              rounded-lg
              shadow-sm
              border
              hover:shadow-md
              transition-shadow
            "
          >
            <PdfThumbnail url={pdf.url} />

            <div className="mt-2 text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold">
                {new Date(pdf.id).toLocaleTimeString()}
              </p>
            </div>

            {/* Overlay hover - Ações do Card */}
            <div
              className="
                absolute
                inset-0
                bg-black/40
                opacity-0
                group-hover:opacity-100
                transition-opacity
                flex
                flex-col
                items-center
                justify-center
                gap-3
                rounded-lg
              "
            >
              {!auth.alertService.isBlocked && (
                <button
                  onClick={() => processarDownload(pdf, 'atividades')}
                  className="pro-btn-green-no-outline"
                >
                  Baixar
                </button>
              )}

              <button
                onClick={() => removerPdf(pdf.id)}
                className="pro-btn-red-no-outline"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* =======================================================
               AÇÕES DO HISTÓRICO
            ======================================================= */}
      {pdfs.length > 1 && !auth.alertService.isBlocked && (
        <div className="w-full flex-1 items-center justify-center gap-2 my-6">

          {/* Limpar histórico */}
          <button
            onClick={handleLimparTudo}
            title="Limpar todo o histórico"
            className="my-4
              pro-btn-red
              flex
              items-center
              justify-center
              shadow-md
              hover:scale-105
              transition-transform
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79"
              />
            </svg>
            Limpar
          </button>
        </div>
      )}

      {/* =======================================================
               NOVA PÁGINA
            ======================================================= */}
      {pdfs.length > 0 && pdfs.length <= 5 && (
        <div className="w-full flex justify-center my-6">
          <button
            onClick={comecarNovaPagina}
            className="     
              w-full
              flex
              items-center
              justify-center
              gap-2
              bg-gray-100
              hover:bg-gray-200
              text-gray-700
              font-bold
              py-3
              px-4
              rounded-full
              border-2
              border-dashed
              border-gray-300
              transition-all
            "
          >
            <PlusIcon />
            Começar Nova Página
          </button>
        </div>
      )}

    </div>
  );
}