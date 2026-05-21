import FolderPlusIcon from '@/Components/svgs/FolderPlusIcon'
import PlusIcon from '@/Components/svgs/PlusIcon'
import PdfThumbnail from "@/Components/usePdfThumbnail";

/**
 * Componente responsável pelo histórico de PDFs:
 *
 * - Grid desktop
 * - Lista mobile
 * - Modal de preview
 * - Download / Exclusão
 * - Arquivo único
 * - Nova página
 */
export default function PdfHistory({
  pdfs,
  showMobileList,
  setShowMobileList,
  pdfSelecionadoModal,
  setPdfSelecionadoModal,
  processarDownload,
  removerPdf,
  baixarTodosPdfsUnificados,
  handleLimparTudo,
  comecarNovaPagina,
  auth,
}) {


  
  return (
    <div className='w-full'>

      {/* =======================================================
               BOTÃO MOBILE
            ======================================================= */}
      {pdfs.length > 0 && (
        <div className="sm:hidden w-full">
          {!showMobileList ? (
            <button
              onClick={() => setShowMobileList(true)}
              className="pro-btn-purple"
            >
              Visualizar Atividades Salvas ({pdfs.length})
            </button>
          ) : (
            <button
              onClick={() => setShowMobileList(false)}
              className="pro-btn-purple"
            >
              Voltar / Fechar
            </button>
          )}
        </div>
      )}

      {/* =======================================================
               MOBILE
            ======================================================= */}
      {showMobileList && (
        <div className="sm:hidden flex flex-col gap-8 p-4 bg-gray-50">
          {pdfs.map((pdf) => (
            <div
              key={pdf.id}
              className="bg-white rounded-xl shadow-md border p-2"
            >
              <div className="w-full">
                <PdfThumbnail url={pdf.url} />
              </div>

              <div className="mt-4 flex gap-2">

                {!auth.alertService.isBlocked && (
                  <button
                    onClick={() => processarDownload(pdf, 'atividades')}
                    className="flex-1 pro-btn-green-no-outline text-sm"
                  >
                    Baixar PDF
                  </button>
                )}

                <button
                  onClick={() => removerPdf(pdf.id)}
                  className="pro-btn-red-no-outline text-sm"
                >
                  Excluir
                </button>
              </div>

              <p className="text-center text-[10px] text-gray-400 mt-2 uppercase">
                Gerado às {new Date(pdf.id).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* =======================================================
               DESKTOP
            ======================================================= */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-4">
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

            {/* Overlay hover */}
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
               MODAL
            ======================================================= */}
      {pdfSelecionadoModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4">

          <div
            className="
                            relative
                            bg-white
                            rounded-lg
                            w-full
                            max-w-4xl
                            max-h-[90vh]
                            overflow-hidden
                            flex
                            flex-col
                        "
          >

            {/* Cabeçalho */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">

              <h3 className="font-bold">
                Visualizando PDF Antigo
              </h3>

              <button
                onClick={() => setPdfSelecionadoModal(null)}
                className="text-2xl font-bold hover:text-red-500"
              >
                &times;
              </button>
            </div>

            {/* Corpo */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-200">

              <iframe
                src={pdfSelecionadoModal.url}
                className="w-full h-[70vh]"
                title="Preview"
              />
            </div>

            {/* Rodapé */}
            <div className="p-4 border-t flex justify-end gap-2">

              {!auth.alertService.isBlocked && (
                <button
                  onClick={() =>
                    processarDownload(
                      pdfSelecionadoModal,
                      'atividades'
                    )
                  }
                  className="pro-btn-green px-4 py-2"
                >
                  Download
                </button>
              )}

              <button
                onClick={() => setPdfSelecionadoModal(null)}
                className="
                                    bg-gray-500
                                    text-white
                                    px-4
                                    py-2
                                    rounded-full
                                "
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
               AÇÕES DO HISTÓRICO
            ======================================================= */}

      {pdfs.length > 1 && !auth.alertService.isBlocked && (
        <div className="w-full flex-1 items-center justify-center gap-2 my-6">

          {/* Arquivo único */}
          <button
            onClick={baixarTodosPdfsUnificados}
            className="
                            pro-btn-blue
                            flex
                            items-center
                            justify-center
                            text-nowrap
                            shadow-xl
                            hover:scale-105
                            transition-transform
                        "
          >
            <FolderPlusIcon className='mr-1' />
            Gerar Arquivo Único ({pdfs.length})
          </button>

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
            className="     w-full
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