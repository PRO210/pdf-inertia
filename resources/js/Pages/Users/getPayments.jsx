import Footer from '@/Components/Footer';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';

import { useMemo, useState } from 'react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';

import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';

import { useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function GetPayments() {

  // 1. Pegue os props corretamente (users agora é uma lista simples para o modal)
  const { users, payments, filters, flash } = usePage().props;

  // Monitora mensagens de sucesso/erro vindas do Laravel
  useEffect(() => {
    if (flash.success) {
      MySwal.fire({
        title: 'Sucesso!',
        text: flash.success,
        icon: 'success',
        timer: 3000,
        confirmButtonColor: '#4f46e5', // Indigo-600
      });
    }

    if (flash.error) {
      MySwal.fire({
        title: 'Erro!',
        text: flash.error,
        icon: 'error',
        confirmButtonColor: '#ef4444',
      });
    }
  }, [flash]);

  // Estados iniciais vindos do backend
  const [search, setSearch] = useState(filters.search ?? "");
  const [perPage, setPerPage] = useState(filters.perPage ?? 5);
  const [sortBy, setSortBy] = useState(filters.sortBy ?? null);
  const [sortDir, setSortDir] = useState(filters.sortDir ?? null);

  // Colunas focadas no PAGAMENTO
  const columns = useMemo(
    () => [
      {
        accessorKey: "preference_id",
        header: "Preference_id",
      },
      {
        accessorKey: "date_created",
        header: "Data",
        Cell: ({ cell }) => new Date(cell.getValue()).toLocaleString('pt-BR')
      },
      {
        accessorKey: "user.name", // Acessa o nome do usuário dentro do objeto user
        header: "Usuário"
      },
      { accessorKey: "description", header: "Descrição" },
      {
        accessorKey: "unit_price",
        header: "Valor",
        Cell: ({ cell }) => `R$ ${cell.getValue()}`
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }) => {
          const status = cell.getValue();
          const colors = {
            approved: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800',
          };
          return (
            <span className={`px-2 py-1 rounded text-xs ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
              {status || 'Iniciado'}
            </span>
          );
        }
      },
      {
        accessorKey: "actions",
        header: "Ações",
        Cell: ({ row }) => {
          const p = row.original;

          // Mostra botões apenas se não estiver aprovado
          if (p.status !== 'approved') {
            return (
              <div className="flex gap-2">
                {p.preference_id && !p.preference_id.startsWith('MANUAL') && (
                  <a
                    href={`https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${p.preference_id}`}
                    target="_blank"
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                  >
                    Pagar
                  </a>
                )}
                <button
                  onClick={() => handleCancelPayment(p.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                >
                  Apagar
                </button>
              </div>
            );
          }
          return <span className="text-gray-400 text-xs italic">Concluído</span>;
        }
      }

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

    router.get(route("get.payments"), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });
  };

  // -------- ⭐ CONFIGURAÇÃO DA TABELA ⭐ --------
  const table = useMantineReactTable({
    columns,
    data: payments.data || [], // Use .data pois vem de um paginate(),
    localization: localizationPTBR,
    enablePagination: false,
    isMultiSortEvent: () => true,
  });


  // Função para disparar a exclusão via Inertia
  const handleCancelPayment = (id) => {
    MySwal.fire({
      title: 'Remover Intenção?',
      text: "Esta ação apagará o registro desta tentativa de pagamento.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, apagar',
      cancelButtonText: 'Voltar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Chama a rota de delete do Laravel
        router.delete(route('payments.destroy', id), {
          onSuccess: () => {
            // O Laravel enviará o flash 'success' e o useEffect do MySwal mostrará o aviso
          },
          onError: () => {
            // Trata erros caso necessário
          }
        });
      }
    });
  };

  return (
    <>
      <Head title="Pagamentos" />

      <div className="min-h-screen">
        <div className="mx-auto  sm:px-6 lg:px-8">
          <h2 className="text-xl py-4 text-center font-semibold leading-tight text-gray-800">
            Lista de Pagamentos pos Usuários
          </h2>
          <div className="overflow-hidden bg-white shadow sm:rounded">
            <div className="p-6 bg-white">

              {/* Barra de busca */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center sm:items-stretch">
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
                  <button onClick={() => atualizar()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded w-1/2 sm:w-auto"
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
                        route("get.payments"),
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

              {/* Paginação Estilo DataTables Responsiva */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pb-4">

                {/* Seletor de Itens por Página - Esconde o texto longo no mobile */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="hidden sm:inline">Exibir</span>
                  <select
                    className="border-gray-300 rounded px-3 py-1 text-sm focus:ring-indigo-500"
                    value={perPage}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPerPage(v);
                      atualizar({ perPage: v });
                    }}
                  >
                    {[5, 10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span>por página</span>
                </div>

                {/* Controles de Navegação */}
                <div className="flex items-center shadow-sm rounded-md overflow-hidden">
                  {payments.links.map((link, i) => {
                    // Lógica para mostrar apenas "Anterior", "Próximo" e a Página Ativa no Mobile
                    const isPrevOrNext = i === 0 || i === payments.links.length - 1;
                    const isActive = link.active;

                    return (
                      <button
                        key={i}
                        disabled={!link.url}
                        onClick={() => link.url && router.visit(link.url, { preserveState: true })}
                        className={`
                          px-4 py-2 text-sm font-medium border-y border-r first:border-l transition-colors
                          ${isActive ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 hover:bg-gray-50"}
                          ${!link.url ? "opacity-50 cursor-not-allowed bg-gray-50 text-gray-400" : ""}
                          ${!isPrevOrNext && !isActive ? "hidden md:inline-block" : "inline-block"} 
                        `}
                      // No mobile, se for número e não for ativo, usamos a classe 'hidden md:inline-block'
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
      </div>

      <Footer ano={2025} />
    </>
  );
}

GetPayments.layout = (page) => (
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
