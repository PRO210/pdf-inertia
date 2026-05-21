export default function ResumoAtividade({
  resumoTamanho
}) {

  return (

    <>
      {/* =========================
                TÍTULO
            ========================== */}
      <h3 className='p-2 text-center font-bold sm:text-xl'>
        Resumo das atividades:
      </h3>

      {/* =========================
                RESUMO
            ========================== */}
      <div className="p-3 mb-3 border rounded text-center bg-gray-50 sm:text-lg">

        <p>

          {resumoTamanho.imagemCompleta ? (
            <>
              ✨
              <b>
                Imagem + Bordas + Cabeçalho:
              </b>

              {" "}
              {resumoTamanho.imagemCompleta.largura}
              ×
              {resumoTamanho.imagemCompleta.altura}
              cm aproximadamente
            </>
          ) : resumoTamanho.imagemCabecalho ? (

            <>
              ➕
              <b>
                Imagem + Cabeçalho:
              </b>

              {" "}
              {resumoTamanho.imagemCabecalho.largura}
              ×
              {resumoTamanho.imagemCabecalho.altura}
              cm aproximadamente
            </>
          ) : resumoTamanho.imagemBorda ? (

            <>
              ➕
              <b>
                Imagem + Bordas:
              </b>

              {" "}
              {resumoTamanho.imagemBorda.largura}
              ×
              {resumoTamanho.imagemBorda.altura}
              cm aproximadamente
            </>
          ) : resumoTamanho.imagem ? (

            <>
              📐
              <b>
                Imagem:
              </b>

              {" "}
              {resumoTamanho.imagem.largura}
              ×
              {resumoTamanho.imagem.altura}
              cm aproximadamente
            </>
          ) : (

            <>Nenhuma imagem disponível</>
          )}

        </p>
      </div>
    </>
  );
}