import Footer from '@/Components/Footer';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';

import { useMemo, useState } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';

export default function Index() {
  const { users, filters } = usePage().props;

  // Estados iniciais vindos do backend
  const [search, setSearch] = useState(filters.search ?? "");
  const [perPage, setPerPage] = useState(filters.perPage ?? 5);
  const [sortBy, setSortBy] = useState(filters.sortBy ?? null);
  const [sortDir, setSortDir] = useState(filters.sortDir ?? null);

  // Colunas da tabela
  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "created_at", header: "Criado em" },
    ],
    []
  );

  const localizationPTBR = {
    actions: 'Ações',
    and: 'e',
    cancel: 'Cancelar',
    changeFilterMode: 'Alterar o modo de filtro',
    changeSearchMode: 'Alterar o modo de pesquisa',
    clearFilter: 'Limpar filtros',
    clearSearch: 'Limpar pesquisa',
    clearSort: 'Limpar classificações',
    clickToCopy: 'Clique para copiar',
    collapse: 'Recolher',
    collapseAll: 'Recolher tudo',
    columnActions: 'Ações das colunas',
    copiedToClipboard: 'Copiado para área de transferência',
    dropToGroupBy: 'Solte para agrupar por {column}',
    edit: 'Editar',
    expand: 'Expandir',
    expandAll: 'Expandir tudo',
    filterArrIncludes: 'Inclui',
    filterArrIncludesAll: 'Incluir tudo',
    filterArrIncludesSome: 'Inclui alguns',
    filterBetween: 'Entre',
    filterBetweenInclusive: 'Entre valores incluídos',
    filterByColumn: 'Filtrar por {column}',
    filterContains: 'Contém',
    filterEmpty: 'vazio',
    filterEndsWith: 'Termina com',
    filterEquals: 'Igual',
    filterEqualsString: 'Igual',
    filterFuzzy: 'Impreciso',
    filterGreaterThan: 'Maior que',
    filterGreaterThanOrEqualTo: 'Maior ou igual que',
    filterInNumberRange: 'Entre',
    filterIncludesString: 'Contém',
    filterIncludesStringSensitive: 'Contém',
    filterLessThan: 'Menor que',
    filterLessThanOrEqualTo: 'Menor ou igual que',
    filterMode: 'Modo de filtro: {filterType}',
    filterNotEmpty: 'Não é vazio',
    filterNotEquals: 'Não é igual',
    filterStartsWith: 'Começa com',
    filterWeakEquals: 'Igual',
    filteringByColumn: 'Filtrando por {column} - {filterType} {filterValue}',
    goToFirstPage: 'Ir para a primeira página',
    goToLastPage: 'Ir para a última página',
    goToNextPage: 'Ir para a próxima página',
    goToPreviousPage: 'Ir para a página anterior',
    grab: 'Agarrar',
    groupByColumn: 'Agrupar por {column}',
    groupedBy: 'Agrupado por ',
    hideAll: 'Ocultar tudo',
    hideColumn: 'Ocultar coluna {column}',
    max: 'Max',
    min: 'Min',
    move: 'Mover',
    noRecordsToDisplay: 'Não há registros a serem exibidos',
    noResultsFound: 'Nenhum resultado encontrado',
    of: 'de',
    or: 'ou',
    pinToLeft: 'Fixar à esquerda',
    pinToRight: 'Fixar à direita',
    resetColumnSize: 'Restaurar tamanho da coluna',
    resetOrder: 'Restaurar ordem',
    rowActions: 'Ações da linha',
    rowNumber: '#',
    rowNumbers: 'Número da linha',
    rowsPerPage: 'Linhas por página',
    save: 'Salvar',
    search: 'Pesquisar',
    selectedCountOfRowCountRowsSelected:
      '{selectedCount} de {rowCount} linha(s) selecionada(s)',
    select: 'Selecionar',
    showAll: 'Mostrar tudo',
    showAllColumns: 'Mostrar todas as colunas',
    showHideColumns: 'Mostrar/Ocultar colunas',
    showHideFilters: 'Mostrar/Ocultar filtros',
    showHideSearch: 'Mostrar/Ocultar barra de pesquisa',
    sortByColumnAsc: 'Ordenar por {column} em ascendente',
    sortByColumnDesc: 'Ordenar por {column} em descendente',
    sortedByColumnAsc: 'Ordenado por {column} em ascendente',
    sortedByColumnDesc: 'Ordenado por {column} em descendente',
    thenBy: ', depois por ',
    toggleDensity: 'Alternar densidade',
    toggleFullScreen: 'Alternar tela cheia',
    toggleSelectAll: 'Alternar selecionar tudo',
    toggleSelectRow: 'Alternar seleção da linha',
    toggleVisibility: 'Alternar visibilidade',
    ungroupByColumn: 'Desagrupar por {column}',
    unpin: 'Desfixar',
    unpinAll: 'Desfixar tudo'
  };

  // -------- ⭐ FUNÇÃO CENTRAL DE ATUALIZAÇÃO ⭐ --------
  const atualizar = (extras = {}) => {
    const params = { perPage };

    if (search.trim() !== "") params.search = search;
    if (sortBy) params.sortBy = sortBy;
    if (sortDir) params.sortDir = sortDir;

    // aplica valores extras removendo nulls
    Object.entries(extras).forEach(([k, v]) => {
      if (v === null || v === "") {
        delete params[k]; // remove da URL se null
      } else {
        params[k] = v;
      }
    });

    console.log("➡️ Enviando para o backend:", params);

    router.get(route("users.index"), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  // -------- ⭐ CONFIGURAÇÃO DA TABELA ⭐ --------
  const table = useMantineReactTable({
    columns,
    data: users.data,
    localization: localizationPTBR,
    enablePagination: false,
    isMultiSortEvent: () => true,
  });

  return (
    <>
      <Head title="Usuários" />

      <div className="min-h-screen">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <h2 className="text-xl py-4 text-center font-semibold leading-tight text-gray-800">
            Lista de Usuários
          </h2>
          <div className="overflow-hidden bg-white shadow sm:rounded">
            <div className="p-6 bg-white">

              {/* Barra de busca */}           

              <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center sm:items-stretch">
                {/* Campo de Busca */}
                <input
                  type="text"
                  className="border px-3 py-2 rounded w-full sm:w-64"
                  placeholder="Buscar usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && atualizar()}
                />

                {/* Container para os Botões - Ajuda a empilhá-los ou alinhá-los */}
                <div className="flex gap-3 w-full sm:w-auto">
                  {/* Botão Buscar */}
                  <button
                    onClick={() => atualizar()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded w-1/2 sm:w-auto"
                  >
                    Buscar
                  </button>

                  {/* Botão Limpar Filtros */}
                  <button
                    onClick={() => {
                      setSearch("");
                      setSortBy(null);
                      setSortDir(null);
                      setPerPage(5);
                      router.get(
                        route("users.index"),
                        { perPage: 5 },
                        { preserveState: false, replace: true }
                      );
                    }}
                    // Removida a classe ml-2 que atrapalharia no modo coluna
                    className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-2 rounded w-1/2 sm:w-auto"
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>

              {/* Tabela */}
              <MantineReactTable table={table} />

              {/* Paginação Laravel */}
              <div className="flex justify-between mt-4">
                <select
                  className="border px-4 py-1 rounded min-w-40 "
                  value={perPage}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPerPage(v);
                    atualizar({ perPage: v });
                  }}
                >
                  {[5, 10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} por página
                    </option>
                  ))}
                </select>

                <div className="flex gap-1">
                  {users.links.map((link, i) => (
                    <button
                      key={i}
                      disabled={!link.url}
                      onClick={() =>
                        link.url && router.visit(link.url, { preserveState: true })
                      }
                      className={`px-3 py-1 rounded border
                        ${link.active ? "bg-indigo-600 text-white" : ""}
                        ${!link.url ? "opacity-40 cursor-not-allowed" : ""}
                      `}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <Footer ano={2025} />
    </>
  );
}

Index.layout = (page) => (
  <AuthenticatedLayout
    auth={page.props.auth}
  // header={
  //   <h2 className="text-xl font-semibold leading-tight text-gray-800">
  //     Lista de Usuários
  //   </h2>
  // }
  >
    {page}
  </AuthenticatedLayout>
);
