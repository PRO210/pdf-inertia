import FullScreenSpinner from '@/Components/FullScreenSpinner';
import { initMercadoPago } from '@mercadopago/sdk-react'
import { usePage } from '@inertiajs/react'
import { useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

import Checkout from './Checkout';
import axios from 'axios';
import Payment from './Payment';

const MySwal = withReactContent(Swal);

// Verifica se está em produção ou desenvolvimento
const mpPublicKey =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_MP_PROD_PUBLIC_KEY
    : import.meta.env.VITE_MP_TEST_PUBLIC_KEY;

initMercadoPago(mpPublicKey, { locale: 'pt-BR' });

export default function Mp() {

  const { props } = usePage();
  const user = props.auth.user;
  const [preferenceId, setPreferenceId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [orderData, setOrderData] = useState({
    title: "Assinatura Mensal",
    price: 3,
    quantity: 1,
    amount: 3,
  });


  const [errorMessage, setErrorMessage] = useState('');

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const items = [
        {
          title: "Assinatura Mensal",
          quantity: parseInt(orderData.quantity),
          unit_price: parseFloat(orderData.price),
          currency_id: "BRL",
        }
      ];

      const payer = {
        name: user.name || "Cliente",
        email: user.email || "cliente@teste.com"
      };

      const response = await axios.post('/create_preference', { items, payer }, {
        headers: { 'Content-Type': 'application/json' }
      });


      setPreferenceId(response.data.preferenceId);

    } catch (error) {
      console.error('Erro ao criar preferência:', error.response?.data || error.message);
      setErrorMessage('Erro ao criar preferência. Por favor, tente novamente.');

      // Mostra o erro usando SweetAlert2
      MySwal.fire({
        icon: 'error',
        title: 'Erro ao criar preferência',
        text: error.response?.data?.message || 'Ocorreu um erro inesperado. Tente novamente.',
        timer: 10000,
        timerProgressBar: true,
        footer: '<a href="#">Contate o suporte se o problema persistir</a>',
        confirmButtonColor: '#6b21a8', // roxo (como o Nubank)
        customClass: {
          confirmButton: 'px-8 py-3 text-lg w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white',
        },
        buttonsStyling: false, // necessário para usar classes customizadas
      }).then(() => {
        console.log('SweetAlert2 closed');
      });


    } finally {
      setIsLoading(false);
    }
  };


  const renderSpinner = () => {
    if (isLoading) {
      return (
        <div className="spinner-wrapper">
          <FullScreenSpinner />
        </div>
      )
    }
  }


  return (
    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">

      {renderSpinner()}

      {/* {errorMessage && <div className="error-message">{errorMessage}</div>} */}

      <Checkout
        orderData={orderData}
        setOrderData={setOrderData}
        onClick={handleClick}
      />

      {preferenceId && (
        <Payment preferenceId={preferenceId} orderData={orderData} />
      )}


    </div>
  );
}