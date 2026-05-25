export default function PdfActionsEditor({
  state,
  actions
}) {

  const {
    pdfUrl,
    pdfModificadoUrl,
    alteracoesPendentes,
    carregando,
    bloqueado
  } = state;

  const {
    gerar,
    baixar,
    limpar,
    resetar
  } = actions;

  if (!pdfUrl || bloqueado)
    return null;

  const mostrarProcessar =
    !pdfModificadoUrl ||
    alteracoesPendentes;

  const mostrarBaixar =
    pdfModificadoUrl &&
    !alteracoesPendentes;

  return (
    <div className="flex-1 flex-col gap-3">

      {mostrarProcessar && (
        <button onClick={gerar} disabled={carregando} className="pro-btn-red mt-2" >
          {
            carregando
              ? 'Processando...'
              : 'Processar alterações'
          }
        </button>
      )}

      {mostrarBaixar && (
        <>
          <button onClick={baixar} className="pro-btn-green flex gap-2 text-center items-center mt-4"  >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar PDF do Preview Modificado
          </button>

          <button onClick={limpar} className="text-sm text-gray-500 mt-4">
            Limpar arquivo gerado
          </button>
        </>
      )}

      <button onClick={resetar} className=" pro-btn-blue mt-4"  >
        Resetar as configurações
      </button>

    </div>
  );
}