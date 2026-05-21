export default function PageSettings({

  // =========================
  // ESTADOS
  // =========================
  modoDimensionamento,
  setModoDimensionamento,

  tamanhoCm,
  setTamanhoCm,

  orientacao,
  setOrientacao,

  aspecto,
  setAspecto,

  ampliacao,
  setAmpliacao,

  repeatMode,
  setRepeatMode,

  repeatBorder,
  setBorder,

  // =========================
  // FUNÇÕES
  // =========================
  setAlteracoesPendentes,
}) {

  return (
    <>

      {/* =========================
                MODO DE REDUÇÃO
            ========================== */}
      <div className="w-full">

        <label className="block mb-1 pro-label text-center text-xl">
          Modo de Redução:
        </label>

        <select
          className="px-2 w-full rounded-full pro-input"
          value={modoDimensionamento}
          onChange={(e) => {
            setModoDimensionamento(e.target.value);

            // Marca alterações pendentes
            setAlteracoesPendentes(true);
          }}
        >
          <option value="grid">
            A4 padrão Grid
          </option>

          <option value="custom">
            A4 Personalizado (cm)
          </option>
        </select>
      </div>

      {/* =========================
                TAMANHO PERSONALIZADO
            ========================== */}
      {modoDimensionamento === "custom" && (

        <div className="flex gap-2 w-full">

          {/* LARGURA */}
          <div className="flex-1">

            <label className="block mb-1 text-center">
              Largura dos slots(cm)
            </label>

            <input
              type="number"
              step="0.1"
              value={tamanhoCm.largura}
              onChange={(e) => {

                setTamanhoCm(prev => ({
                  ...prev,
                  largura:
                    parseFloat(e.target.value) || 0
                }));

                setAlteracoesPendentes(true);
              }}
              className="pro-input w-full rounded-full px-2"
            />
          </div>

          {/* ALTURA */}
          <div className="flex-1">

            <label className="block mb-1 text-center">
              Altura dos slots(cm)
            </label>

            <input
              type="number"
              step="0.1"
              value={tamanhoCm.altura}
              onChange={(e) => {

                setTamanhoCm(prev => ({
                  ...prev,
                  altura:
                    parseFloat(e.target.value) || 0
                }));

                setAlteracoesPendentes(true);
              }}
              className="pro-input w-full rounded-full px-2"
            />
          </div>
        </div>
      )}

      {/* =========================
                ORIENTAÇÃO
            ========================== */}
      <div className="w-full">

        <label className="block mb-1 pro-label text-center text-xl">
          Orientação:
        </label>

        <select
          className="px-2 w-full rounded-full pro-input"
          value={orientacao}
          onChange={(e) => {

            setOrientacao(e.target.value);

            setAlteracoesPendentes(true);
          }}
        >
          <option value="retrato">
            Retrato
          </option>

          <option value="paisagem">
            Paisagem
          </option>
        </select>
      </div>

      {/* =========================
                ASPECTO DA IMAGEM
            ========================== */}
      {modoDimensionamento === 'grid' && (

        <div className="w-full">

          <label className="block mb-1 pro-label text-center text-xl">
            Aspecto:
          </label>

          <select
            className="px-2 w-full rounded-full pro-input"
            value={aspecto}
            onChange={(e) => {

              setAspecto(
                e.target.value === "true"
              );

              setAlteracoesPendentes(true);
            }}
          >
            <option value="true">
              Manter aspecto original
            </option>

            <option value="false">
              Preencher toda a folha
            </option>
          </select>
        </div>
      )}

      {/* =========================
                GRID DE COLUNAS/LINHAS
            ========================== */}
      {modoDimensionamento === 'grid' && (
        <>
          <label className="block pro-label text-xl text-center">
            Redução:
          </label>

          <div className="flex flex-col sm:flex-row gap-2 w-full">

            <div className="flex gap-2 w-full">

              {/* COLUNAS */}
              <div className="flex-1">

                <label className="block mb-2 pro-label text-center">
                  Colunas
                </label>

                <select
                  className="pro-input rounded-full w-full"
                  value={ampliacao.colunas}
                  onChange={(e) => {

                    setAmpliacao((prev) => ({
                      ...prev,
                      colunas:
                        parseInt(e.target.value) || 1,
                    }));

                    setAlteracoesPendentes(true);
                  }}
                >
                  {[...Array(11)].map((_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>

              {/* X */}
              <div className="flex items-end justify-center px-2">
                <span className="text-xl font-bold">
                  ×
                </span>
              </div>

              {/* LINHAS */}
              <div className="flex-1">

                <label className="block mb-2 pro-label text-center">
                  Linhas
                </label>

                <select
                  className="pro-input rounded-full w-full"
                  value={ampliacao.linhas}
                  onChange={(e) => {

                    setAmpliacao((prev) => ({
                      ...prev,
                      linhas:
                        parseInt(e.target.value) || 1,
                    }));

                    setAlteracoesPendentes(true);
                  }}
                >
                  {[...Array(11)].map((_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================
                REPETIÇÃO
            ========================== */}
      <div className="w-full">

        <label className="block mb-1 pro-label text-center text-xl">
          Ativar Repetição:
        </label>

        <select
          value={repeatMode}
          onChange={(e) => {

            setRepeatMode(e.target.value);

            setAlteracoesPendentes(true);
          }}
          className="px-2 w-full rounded-full pro-input"
        >
          <option value="none">
            Não repetir
          </option>

          <option value="all">
            Repetir em todas
          </option>
        </select>
      </div>

      {/* =========================
                BORDAS
            ========================== */}
      <div className="w-full">

        <label className="block mb-1 pro-label text-center text-xl">
          Bordas:
        </label>

        <select
          value={repeatBorder}
          onChange={(e) => {

            setBorder(e.target.value);

            setAlteracoesPendentes(true);
          }}
          className="px-2 w-full rounded-full pro-input"
        >
          <option value="none">Sem bordas</option>
          <option value="numerosColoridos">Números Coloridos</option>
          <option value="notasMusicais">Notas Músicais</option>
          <option value="coracao">Corações</option>
          <option value="coracaoVazado">Corações (Vazado)</option>
          <option value="abelhas">Abelhas</option>
          <option value="lapis">Lápis</option>
          <option value="baloes">Balões</option>
          <option value="baloesVazado">Balões (Vazado)</option>
          <option value="fogueira">Fogueirinha</option>
        </select>
      </div>

    </>
  );
}