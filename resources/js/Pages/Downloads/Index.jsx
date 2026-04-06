// import React from 'react';
// import { Head, Link } from '@inertiajs/react';
// import Footer from '@/Components/Footer';
// import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';


// export default function Index({ downloads }) {
//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <Head title="Listagem de Downloads" />

//       <div className="flex items-center justify-between mb-6">
//         <h1 className="text-2xl font-bold text-gray-800 flex items-center">
//           <span className="mr-2">📋</span> Histórico de Downloads
//         </h1>
//         <div className="text-sm text-gray-500">
//           Total: {downloads.total} registros
//         </div>
//       </div>

//       <div className="bg-white shadow-md rounded-xl border border-gray-200 overflow-hidden">
//         <table className="min-w-full divide-y divide-gray-200">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuário</th>
//               <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Arquivo</th>
//               <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantidade</th>
//               <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Último Acesso</th>
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-100">
//             {downloads.data.length > 0 ? (
//               downloads.data.map((item) => (
//                 <tr key={item.id} className="hover:bg-gray-50 transition-colors">
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <div className="text-sm font-medium text-gray-900">
//                       {/* O emoji ✨ que você queria */}
//                       <span className="mr-1">✨ {item.user_name}</span>
//                     </div>
//                     <div className="text-sm text-gray-500">{item.user_email}</div>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
//                     {/* O estilo de código para o nome do arquivo */}
//                     <code className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
//                       {item.file_name}
//                     </code>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-center">
//                     <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
//                       {item.count}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {/* Aqui usamos a data já formatada que veio do PHP (25/01/2026...) */}
//                     {item.updated_at}
//                   </td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan="4" className="px-6 py-10 text-center text-gray-400">
//                   Nenhum download encontrado.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Paginação Estilizada */}
//       <div className="mt-6 flex justify-center">
//         <nav className="flex space-x-1">
//           {downloads.links.map((link, index) => (
//             link.url ? (
//               <Link
//                 key={index}
//                 href={link.url}
//                 dangerouslySetInnerHTML={{ __html: link.label }}
//                 className={`px-4 py-2 text-sm rounded-md border transition-colors ${link.active
//                   ? 'bg-blue-600 text-white border-blue-600'
//                   : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
//                   }`}
//               />
//             ) : (
//               <span
//                 key={index}
//                 dangerouslySetInnerHTML={{ __html: link.label }}
//                 className="px-4 py-2 text-sm rounded-md border border-gray-200 text-gray-400 cursor-not-allowed"
//               />
//             )
//           ))}
//         </nav>
//       </div>

//       <Footer ano={2026} />

//     </div>
//   );
// }

// Index.layout = (page) => (
//   <AuthenticatedLayout
//     auth={page.props.auth}
//   // header={
//   //   <h2 className="text-xl font-semibold leading-tight text-gray-800">
//   //     Lista de Usuários
//   //   </h2>
//   // }
//   >
//     {page}
//   </AuthenticatedLayout>
// );

import Footer from '@/Components/Footer';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';

export default function Index() {
  const { downloads, filters } = usePage().props;

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

  // Estados locais sincronizados com os props do Inertia
  const [search, setSearch] = useState(filters.search ?? "");
  const [perPage, setPerPage] = useState(filters.perPage ?? 5);

  const columns = useMemo(
    () => [
      {
        accessorKey: "user_name",
        header: "Usuário",
        Cell: ({ row }) => (
          <div>
            <div className="font-bold">✨ {row.original.user_name}</div>
            <div className="text-xs text-gray-500">{row.original.user_email}</div>
          </div>
        )
      },
      {
        accessorKey: "file_name",
        header: "Arquivo",
        Cell: ({ cell }) => <code className="bg-gray-100 px-1 rounded text-xs">{cell.getValue()}</code>
      },
      {
        accessorKey: "count",
        header: "Qtd",
        size: 80,
        Cell: ({ cell }) => <span className="font-bold text-blue-600">{cell.getValue()}x</span>
      },
      { accessorKey: "updated_at", header: "Último Acesso" },
    ],
    []
  );

  // Copie o objeto localizationPTBR aqui (omitido por brevidade)...

  const atualizar = (extras = {}) => {
    const params = { perPage, search, ...extras };

    // Limpa parâmetros vazios
    Object.keys(params).forEach(key => (params[key] == null || params[key] === '') && delete params[key]);

    router.get(route("downloads.index"), params, {
      preserveState: true,
      replace: true,
    });
  };

  const table = useMantineReactTable({
    columns,
    data: downloads.data,
    localization: localizationPTBR, // Use o objeto que você já tem
    enablePagination: false, // Usaremos a paginação do Laravel abaixo
    enableColumnActions: false,
    enableDensityToggle: false,
  });

  return (
    <>
      <Head title="Downloads" />
      <div className="py-12 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white p-6 shadow rounded-lg">

            <h2 className="text-xl font-bold mb-6 flex items-center">
              <span className="mr-2">📋</span> Histórico de Downloads
            </h2>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                className="border-gray-300 rounded-md shadow-sm w-full sm:w-80"
                placeholder="Buscar arquivo ou usuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && atualizar()}
              />
              <button onClick={() => atualizar()} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition">
                Buscar
              </button>
              <button
                onClick={() => { setSearch(""); atualizar({ search: "" }); }}
                className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Limpar
              </button>
            </div>

            <MantineReactTable table={table} />

            {/* Paginação do Laravel */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 pb-2">

              {/* Seletor de Itens por Página */}
              <div className="flex items-center gap-2 text-sm text-gray-600 order-2 sm:order-1">
                <span className="hidden sm:inline">Exibir</span>
                <select
                  className="border-gray-300 rounded-md px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                  value={perPage}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPerPage(v);
                    atualizar({ perPage: v });
                  }}
                >
                  {[5, 10, 25, 50].map(n => (
                    <option key={n} value={n}>
                      {n} por página
                    </option>
                  ))}
                </select>
              </div>

              {/* Controles de Navegação (Links do Laravel) */}
              <div className="inline-flex shadow-sm rounded-md order-1 sm:order-2 overflow-hidden border border-gray-300">
                {downloads.links.map((link, i) => {
                  // Lógica de exibição inteligente:
                  // Mostra o botão "Anterior", o "Próximo" e a página "Ativa".
                  // Os demais números só aparecem em telas maiores (md).
                  const isFirst = i === 0;
                  const isLast = i === downloads.links.length - 1;
                  const isActive = link.active;

                  return (
                    <button
                      key={i}
                      disabled={!link.url}
                      onClick={() => link.url && router.visit(link.url, { preserveState: true })}
                      className={`
                        relative inline-flex items-center px-4 py-2 text-sm font-medium transition-colors
                        border-r last:border-r-0 border-gray-300
                        ${isActive
                                      ? "z-10 bg-indigo-600 text-white border-indigo-600"
                                      : "bg-white text-gray-700 hover:bg-gray-50"
                                    }
                        ${!link.url ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "cursor-pointer"}
                        ${(!isFirst && !isLast && !isActive) ? "hidden md:inline-flex" : "inline-flex"}
                      `}
                    >
                      <span dangerouslySetInnerHTML={{ __html: link.label }} />
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer ano={2026} />
    </>
  );
}

Index.layout = (page) => <AuthenticatedLayout auth={page.props.auth}>{page}</AuthenticatedLayout>;