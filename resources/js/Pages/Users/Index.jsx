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

  // Tradução PT-BR
  const localizationPTBR = {
    actions: "Ações",
    and: "e",
    cancel: "Cancelar",
    changeFilterMode: "Alterar modo do filtro",
    changeSearchMode: "Alterar modo de busca",
    clearFilter: "Limpar filtro",
    clearSearch: "Limpar busca",
    clearSort: "Limpar ordenação",
    contains: "Contém",
    dateBetween: "Entre",
    dateEquals: "Igual",
    dateAfter: "Depois",
    dateBefore: "Antes",
    empty: "Vazio",
    equals: "Igual a",
    expand: "Expandir",
    filter: "Filtro",
    filterByColumn: "Filtrar por {column}",
    grab: "Segurar",
    groupedBy: "Agrupado por",
    hideAll: "Ocultar tudo",
    hideColumn: "Ocultar coluna",
    invertSelection: "Inverter seleção",
    noRecordsToDisplay: "Nenhum registro encontrado",
    of: "de",
    or: "ou",
    page: "Página",
    rowsPerPage: "Linhas por página",
    save: "Salvar",
    search: "Buscar",
    selectedCountOfRowCountRowsSelected: "{selectedCount} de {rowCount} selecionados",
    select: "Selecionar",
    showAll: "Mostrar tudo",
    showColumn: "Mostrar coluna",
    toggleDensity: "Alternar densidade",
    toggleFullScreen: "Tela cheia",
    toggleFilters: "Mostrar filtros",
    toggleSearch: "Mostrar busca",
    toggleVisibility: "Visibilidade",
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
      <Head title="Lista de Usuários" />

      <div className="py-12 min-h-screen">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow sm:rounded">
            <div className="p-6 bg-white">

              {/* Barra de busca */}
              <div className="flex gap-3 mb-4 items-center">
                <input
                  type="text"
                  className="border px-3 py-2 rounded w-64"
                  placeholder="Buscar usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && atualizar()}
                />

                <button
                  onClick={() => atualizar()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                >
                  Buscar
                </button>

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
                  className="ml-2 bg-gray-300 hover:bg-gray-400 text-black px-3 py-2 rounded"
                >
                  Limpar filtros
                </button>
              </div>

              {/* Tabela */}
              <MantineReactTable table={table} />

              {/* Paginação Laravel */}
              <div className="flex justify-between mt-4">
                <select
                  className="border px-3 py-1 rounded"
                  value={perPage}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPerPage(v);
                    atualizar({ perPage: v });
                  }}
                >
                  {[5, 10, 25, 50].map((n) => (
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
    header={
      <h2 className="text-xl font-semibold leading-tight text-gray-800">
        Lista de Usuários
      </h2>
    }
  >
    {page}
  </AuthenticatedLayout>
);
