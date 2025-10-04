import Footer from '@/Components/Footer';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

import React, { useEffect } from 'react';

export default function Retorno({ status, mensagem, detalhes }) {
  const cor = {
    approved: 'green',
    pending: 'orange',
    failure: 'red',
    rejected: 'red',
  }[status] || 'gray';

  // (Opcional) Redirecionar após X segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      // window.location.href = '/dashboard'; // ou qualquer rota que quiser
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800">
          Bem-vindo ao Pôster Digital Fácil!
        </h2>
      }
    >
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: cor, fontSize: '2rem', fontWeight: 'bold' }}>
          {mensagem}
        </h1>

        <p>Você será redirecionado em alguns segundos...</p>

        <h2 style={{ marginTop: '1rem' }}>Detalhes técnicos:</h2>
        <pre style={{ background: '#f4f4f4', padding: '1rem' }}>
          {JSON.stringify(detalhes, null, 2)}
        </pre>
      </div>

      <Footer />
    </AuthenticatedLayout>
    
  );
}
