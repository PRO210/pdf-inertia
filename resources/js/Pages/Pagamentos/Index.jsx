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
  payments: initialPayments = [],
}) {

  const { auth } = usePage().props;
  const [payments, setPayments] = useState(initialPayments);
  const [loading, setLoading] = useState(false);

  // Função de sincronização: atualiza preferência específica ou só lista
  const sincronizarPagamentos = async (preferenceId = null) => {
    try {
      setLoading(true);
      const url = preferenceId
        ? `/pagamentos/sincronizar/${preferenceId}`
        : `/pagamentos/sincronizar`;
      const res = await axios.get(url);
      setPayments(res.data.payments || []);
      return res.data;
    } catch (err) {
      console.error('Erro ao sincronizar pagamentos:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sincroniza na carga
    sincronizarPagamentos(detalhes?.preference_id || null);

    // Atualiza a lista a cada 30s
    const intervalo = setInterval(() => {
      sincronizarPagamentos(null);
    }, 30000);

    return () => clearInterval(intervalo);
  }, [detalhes]);

  // Spinner full screen enquanto carrega
  if (loading) {
    return <FullScreenSpinner size={60} borderWidth={6} />;
  }

  // Página com layout autenticado
  return (
    <AuthenticatedLayout
      auth={auth}
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800">
          Painel de Pagamentos/Créditos
        </h2>
      }
    >
      <div className="p-4">
        {mensagem && (
          <div className="mb-4 p-2 bg-gray-100 rounded-md border border-gray-300">
            <strong>{mensagem}</strong>
          </div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => sincronizarPagamentos(detalhes?.preference_id || null)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? '🔄 Atualizando...' : '🔁 Atualizar agora'}
          </button>
          <span className="text-sm text-gray-500">
            Última atualização: {new Date().toLocaleTimeString()}
          </span>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Usuário</th>
              <th className="p-2 border">Valor</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
              payments.map((p) => (

                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 border text-center">{p.id}</td>
                  <td className="p-2 border">{p.user?.name ?? '—'}</td>
                  <td className="p-2 border">R$ {Number(p.unit_price * p.quantity).toFixed(2)}</td>
                  <td
                    className={`p-2 border font-semibold ${p.status === 'approved' ? 'text-green-500' :
                      p.status === 'pending' ? 'text-orange-500' :
                        p.status === 'failure' || p.status === 'rejected' ? 'text-red-500' :
                          'text-gray-500'
                      }`}
                  >
                    {p.status}
                  </td>
                  <td className="p-2 border text-sm text-gray-600">
                    {new Date(p.created_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Nenhum pagamento encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='mt-auto'>
        <Footer ano={2025} />
      </div>

    </AuthenticatedLayout>
  );
}
