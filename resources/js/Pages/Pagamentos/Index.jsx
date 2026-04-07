import React, { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import Footer from '@/Components/Footer';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FullScreenSpinner from '@/Components/FullScreenSpinner';

export default function Index({
  status = null,
  mensagem = null,
  detalhes = {},
  wallet: initialPayments = [],
}) {
  const { auth } = usePage().props;

  // Agora `wallet` ao invés de `payments`
  const [wallet, setWallet] = useState(initialPayments);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [resumo, setResumo] = useState({
    total_entradas: 0,
    total_gastos: 0,
    saldo_restante: 0,
  });

  const formatStatus = (status) => {
    const map = {
      approved: "Aprovado",
      pending: "Pendente",
    };

    return map[status] || status;
  };

  // ============================
  // 🔄 FUNÇÃO: SINCRONIZAR DADOS
  // ============================
  const sincronizar = async (page = 1, preferenceId = null) => {
    try {
      setLoading(true);

      // Garante que se vier um objeto ou nulo por erro, seja 1
      const pageNumber = typeof page === 'number' ? page : 1;

      const cleanPage = pageNumber > 100000 ? 1 : pageNumber;

      const url = preferenceId
        ? `/pagamentos/sincronizar/${preferenceId}?page=${cleanPage}`
        : `/pagamentos/sincronizar?page=${cleanPage}`;


      const res = await axios.get(url);

      const paginator = res.data.wallet;

      setWallet(paginator);
      setItems(paginator.data ?? []);

      // ✨ CAPTURA E ATUALIZAÇÃO DO RESUMO
      if (res.data.resumo_carteira) {
        setResumo(res.data.resumo_carteira);
      }

      // console.log("📘 Wallet:", res.data);

      return res.data;
    } catch (err) {
      console.error('Erro ao sincronizar carteira:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // 🔁 USE EFFECT - SINCRONIZAÇÃO INICIAL + INTERVALO
  // ============================
  useEffect(() => {
    sincronizar(1, detalhes?.preference_id || null);

    const intervalo = setInterval(() => {
      sincronizar(1, detalhes?.preference_id || null);
    }, 50000);

    return () => clearInterval(intervalo);
  }, [detalhes]);

  // ============================
  // ⏳ LOADING FULL SCREEN
  // ============================
  if (loading) {
    return <FullScreenSpinner size={60} borderWidth={6} />;
  }

  // ============================
  // 📄 TEMPLATE PRINCIPAL
  // ============================
  return (
    <AuthenticatedLayout
      auth={auth}
    // header={
    //   <h2 className="text-xl font-semibold leading-tight text-gray-800">
    //     Sua Carteira
    //   </h2>
    // }
    >
      <div className="p-4 min-h-screen">

        {/* MENSAGEM */}
        {/* {mensagem && (
          <div className="mb-4 p-2 bg-gray-100 rounded-md border border-gray-300">
            <strong>{mensagem}</strong>
          </div>
        )} */}

        {/* BOTÃO ATUALIZAR */}
        <div className="mb-3 flex flex-wrap items-center text-center gap-2 text-nowrap">

          <Link href={route('pdf.pagamentos')} className="flex-1 pro-btn-blue w-full">
            ➕ Créditos
          </Link>

          <button
            onClick={() => sincronizar(1, detalhes?.preference_id || null)}
            className="pro-btn-purple flex-1 w-full"
            disabled={loading}
          >
            {loading ? '🔄 Atualizando...' : '🔁 Atualizar '}
          </button>

          <span className="text-sm border-gray-300 border rounded-full p-3 text-gray-500 font-bold flex-1">
            Última atualização: {new Date().toLocaleTimeString()}
          </span>

        </div>

        {/* ==============================
              RESUMO DA CARTEIRA ✨ NOVO BLOCO
           ============================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Entradas */}
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-500">Total de Entradas (Receitas)</h3>
            <p className="mt-1 text-2xl font-bold text-green-600">
              R$ {Number(resumo.total_entradas).toFixed(2)}
            </p>
          </div>

          {/* Card 2: Gastos */}
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500">Total de Gastos (Saídas)</h3>
            <p className="mt-1 text-2xl font-bold text-red-600">
              R$ {Number(resumo.total_gastos).toFixed(2)}
            </p>
          </div>

          {/* Card 3: Saldo */}
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-500">Saldo Atual (Restante)</h3>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              R$ {Number(resumo.saldo_restante).toFixed(2)}
            </p>
          </div>
        </div>

        {/* ==============================
              TABELA DA CARTEIRA
           ============================== */}
        <table className="w-full border-collapse ">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border">#</th>
              <th className="p-3 border">Tipo</th>
              <th className="p-3 border">Descrição</th>
              <th className="p-3 border">Valor</th>
              <th className="p-3 border">Criado em</th>
              <th className="p-3 border">Status</th>
            </tr>
          </thead>

          <tbody>
            {items.length > 0 ? (
              items.map((item) => {
                const isEntrada = item.type === 'entrada';
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 border text-center">{item.id}</td>

                    <td
                      className={`p-2 border font-semibold ${isEntrada ? 'text-green-600' : 'text-red-600'
                        }`}
                    >
                      {isEntrada ? 'Entrada' : 'Saída'}
                    </td>

                    <td className="p-2 border">{item.description ?? '—'}</td>

                    <td
                      className={`p-2 border font-bold ${isEntrada ? 'text-green-600' : 'text-red-600'
                        }`}
                    >
                      {isEntrada ? '+ ' : '- '} R$ {Number(item.amount).toFixed(2)}
                    </td>

                    <td className="p-2 border text-sm text-gray-600">
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </td>

                    <td
                      className={`p-2 border ${item.status === "approved"
                        ? "text-green-600"
                        : item.status === "pending"
                          ? "text-yellow-600"
                          : "text-red-600"
                        }`}
                    >
                      {formatStatus(item.status)}
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex justify-center mt-4 gap-2">
          <button
            disabled={!wallet?.prev_page_url}
            onClick={() => {
              const urlParams = new URLSearchParams(wallet.prev_page_url.split('?')[1]);
              sincronizar(Number(urlParams.get('page')));
            }}
            className="pro-btn-green px-4 rounded-md disabled:opacity-40"
          >
            ◀ Anterior
          </button>

          <button
            disabled={!wallet?.next_page_url}
            onClick={() => {
              const urlParams = new URLSearchParams(wallet.next_page_url.split('?')[1]);
              sincronizar(Number(urlParams.get('page')));
            }}
            className="pro-btn-green px-4 rounded-md disabled:opacity-40"
          >
            Próxima ▶
          </button>
        </div>


      </div>

      <Footer ano={2025} />
    </AuthenticatedLayout>
  );
}
