import FullScreenSpinner from '@/Components/FullScreenSpinner'
import { router } from '@inertiajs/react'

/**
 * Componente responsável pelas ações principais:
 *
 * - Aplicar alterações
 * - Download preview
 * - Reset
 * - Aviso PRO
 */
export default function PdfActions({
  imagens,
  alteracoesPendentes,
  carregando,
  limiteAtingido,
  gerarPDF,
  pdfUrl,
  processarDownload,
  auth,
  handleResetConfig,
}) {

  return (
    <div className="flex flex-col gap-2 w-full">

      {/* =======================================================
               BOTÃO GERAR PDF
            ======================================================= */}

      {imagens.some(Boolean) && alteracoesPendentes && (
        <button
          disabled={limiteAtingido}
          onClick={gerarPDF}
          className={
            alteracoesPendentes
              ? "pro-btn-red"
              : "pro-btn-blue"
          }
        >
          {limiteAtingido
            ? "Limite de (6 PDFs) atingido"
            : "Aplicar alterações e Salvar no Histórico"}
        </button>
      )}

      {/* =======================================================
               LOADING
            ======================================================= */}
      {carregando && <FullScreenSpinner />}

      {/* =======================================================
               DOWNLOAD PREVIEW
            ======================================================= */}
      {pdfUrl &&
        !alteracoesPendentes &&
        !auth.alertService.isBlocked && (
          <button
            onClick={() =>
              processarDownload(
                { url: pdfUrl },
                'atividades'
              )
            }
            className="pro-btn-green mt-2"
          >
            Baixar o PDF do Preview
          </button>
        )}

      {/* =======================================================
               ALERTA PRO
            ======================================================= */}
      {auth.alertService.isBlocked && (
        <div
          className="
                        bg-red-50
                        border-l-4
                        border-red-500
                        text-red-800
                        px-4
                        py-4
                        rounded
                        shadow-sm
                        mt-4
                        flex
                        flex-col
                        sm:flex-row
                        items-center
                        justify-between
                        gap-4
                    "
          role="alert"
        >

          <div className="flex items-center">

            <svg
              className="w-6 h-6 text-red-500 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16z"
                clipRule="evenodd"
              />
            </svg>

            <div>
              <p className="font-bold">
                Limite Atingido
              </p>

              <p className="text-sm opacity-90">
                {auth.alertService.message}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              router.visit(route('pagamento.retorno'))
            }
            className="
                            w-full
                            sm:w-auto
                            bg-red-600
                            text-white
                            font-bold
                            px-6
                            py-2
                            rounded-lg
                            hover:bg-red-700
                            transition-colors
                            shadow-md
                        "
          >
            Assinar Plano PRO
          </button>
        </div>
      )}

      {/* =======================================================
               RESET CONFIG
            ======================================================= */}
      <button
        onClick={handleResetConfig}
        disabled={limiteAtingido}
        className={`
                    w-full
                    py-2
                    rounded-full
                    transition
                    ${limiteAtingido
            ? "bg-gray-300 cursor-not-allowed opacity-50"
            : "pro-btn-blue"
          }
                `}
      >
        {limiteAtingido
          ? "Limite de 6 PDFs atingido"
          : "Resetar Configurações"}
      </button>

    </div>
  )
}