import React, { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
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
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
  });

  // ============================
  // 🔄 FUNÇÃO: SINCRONIZAR DADOS
  // ============================
  const sincronizar = async (page = 1, preferenceId = null) => {
    try {
      setLoading(true);

      const url = preferenceId
        ? `/pagamentos/sincronizar/${preferenceId}?page=${page}`
        : `/pagamentos/sincronizar?page=${page}`;


      const res = await axios.get(url);

      const paginator = res.data.wallet;

      setWallet(paginator);
      setItems(paginator.data ?? []);

      console.log("📘 Wallet:", res.data.wallet);

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
    sincronizar(detalhes?.preference_id || null);

    const intervalo = setInterval(() => {
      sincronizar();
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
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800">
          Sua Carteira
        </h2>
      }
    >
      <div className="p-4">

        {/* MENSAGEM */}
        {mensagem && (
          <div className="mb-4 p-2 bg-gray-100 rounded-md border border-gray-300">
            <strong>{mensagem}</strong>
          </div>
        )}

        {/* BOTÃO ATUALIZAR */}
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => sincronizar(detalhes?.preference_id || null)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? '🔄 Atualizando...' : '🔁 Atualizar agora'}
          </button>

          <span className="text-sm text-gray-500">
            Última atualização: {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* ==============================
              TABELA DA CARTEIRA
           ============================== */}
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Tipo</th>
              <th className="p-2 border">Descrição</th>
              <th className="p-2 border">Valor</th>
              <th className="p-2 border">Criado em</th>
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
            onClick={() => sincronizar(wallet.current_page - 1)}
            className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-40"
          >
            ◀ Anterior
          </button>

          <span className="px-4 py-2">
            Página {wallet?.current_page} / {wallet?.last_page}
          </span>

          <button
            disabled={!wallet?.next_page_url}
            onClick={() => sincronizar(wallet.current_page + 1)}
            className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-40"
          >
            Próxima ▶
          </button>
        </div>


      </div>

      <Footer ano={2025} />
    </AuthenticatedLayout>
  );
}
