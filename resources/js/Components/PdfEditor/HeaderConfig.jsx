export default function HeaderConfig({
  cabecalhoAtivo,
  setCabecalhoAtivo,

  cabecalhoModo,
  setCabecalhoModo,

  cabecalhoTipo,
  setCabecalhoTipo,

  cabecalhoImagem,
  setCabecalhoImagem,

  cabecalhoBorder,
  setCabecalhoBorder,

  cabecalhoTexto,
  setCabecalhoTexto,

  orientacao,
  setAlteracoesPendentes,
}) {

  return (
    <>
      {/* Cabeçalho */}
      <label className="flex items-center gap-2 pro-label text-xl cursor-pointer">
        <input
          type="checkbox"
          checked={cabecalhoAtivo}
          onChange={(e) => {
            setCabecalhoAtivo(e.target.checked);
            setAlteracoesPendentes(true);
          }}
        />
        Mostrar Cabeçalho:
      </label>

      {cabecalhoAtivo && (
        <div className="w-full mt-2">

          <label className="block mb-1 pro-label text-center text-xl">
            Modo de Exibição:
          </label>

          <select
            value={cabecalhoModo}
            onChange={(e) => {
              setCabecalhoModo(e.target.value);
              setAlteracoesPendentes(true);
            }}
            className="px-2 w-full rounded-full pro-input"
          >
            <option value="ambas">Todas as páginas</option>
            <option value="impares">Somente Páginas Ímpares</option>
            <option value="pares">Somente Páginas Pares</option>
            <option value="primeira_pagina">Somente na 1º página - Experimental (Layout 2Col x 1Lin)</option>
            <option value="nenhuma">Não mostrar em nenhuma</option>
          </select>

          <label className="flex items-center gap-2 pro-label text-xl cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={cabecalhoBorder}
              onChange={(e) => {
                setCabecalhoBorder(e.target.checked);
                setAlteracoesPendentes(true);
              }}
            />
            Bordas no Cabeçalho
          </label>

        </div>
      )}

      {/* Inputs do texto */}
      {cabecalhoAtivo && (

        <div className="w-full">

          {/* TIPO */}
          <label className="block mb-1 pro-label text-center text-xl mt-4">
            Tipo do Cabeçalho:
          </label>

          <select
            value={cabecalhoTipo}
            onChange={(e) => {

              const novoTipo = e.target.value;

              setCabecalhoTipo(novoTipo);

              if (novoTipo === "imagem") {
                setCabecalhoTexto(
                  cabecalhoTexto.map(() => "")
                );
              }

              if (novoTipo === "texto") {
                setCabecalhoImagem(null);
              }

              setAlteracoesPendentes(true);

            }}
            className="px-2 w-full rounded-full pro-input"
          >
            <option value="texto">Somente Texto</option>
            <option value="ambos">Texto + Imagem</option>
            <option value="imagem">Somente Imagem</option>
            <option value="banner">Imagem Tela Cheia (Banner)</option>
          </select>

          {/* IMAGEM */}
          {(cabecalhoTipo === "imagem" || cabecalhoTipo === "ambos" || cabecalhoTipo === "banner") && (

              <div className="mt-4">

                <label className="block pro-label text-lg mb-2">
                  Imagem do Cabeçalho
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {

                    const file = e.target.files[0];

                    if (!file) return;

                    const reader = new FileReader();

                    reader.onload = () => {

                      setCabecalhoImagem(reader.result);

                      setAlteracoesPendentes(true);
                    };

                    reader.readAsDataURL(file);
                  }}
                  className="w-full"
                />

                {cabecalhoImagem && (
                  <img
                    src={cabecalhoImagem}
                    alt="preview"
                    className="mt-3 max-h-32 object-contain border rounded"
                  />
                )}

              </div>
            )}

          {/* TEXTO */}
          {(cabecalhoTipo === "texto" ||
            cabecalhoTipo === "ambos") && (

              <div className="w-full mt-4">

                {cabecalhoTexto.map((linha, index) => {

                  const isModoFull =
                    cabecalhoModo === "primeira_pagina";

                  let maxPorLinha;

                  if (isModoFull) {
                    maxPorLinha =
                      orientacao === "paisagem"
                        ? 100
                        : 66;
                  } else {
                    maxPorLinha =
                      orientacao === "paisagem"
                        ? 50
                        : 32;
                  }

                  return (

                    <div key={index}>

                      <input
                        type="text"
                        value={linha}
                        onChange={(e) => {

                          const valor = e.target.value;

                          const ajustado =
                            valor.slice(0, maxPorLinha);

                          const novoTexto =
                            [...cabecalhoTexto];

                          novoTexto[index] = ajustado;

                          setCabecalhoTexto(novoTexto);

                          setAlteracoesPendentes(true);
                        }}
                        maxLength={maxPorLinha}
                        className="w-full border rounded p-2 mt-2 pro-input"
                        placeholder={`Linha ${index + 1}`}
                      />

                      <p className="text-gray-500 text-xs mt-1">
                        {linha.length} / {maxPorLinha}
                      </p>

                    </div>

                  );
                })}

              </div>
            )}

        </div>
      )}
    </>
  );
}