import FullScreenSpinner from '@/Components/FullScreenSpinner';
import { initMercadoPago } from '@mercadopago/sdk-react'
import { usePage } from '@inertiajs/react'
import { useState } from 'react';
import Checkout from './Checkout';
import axios from 'axios';
import Payment from './Payment';

// initMercadoPago(import.meta.env.VITE_APP_MP_ENVIRONMENT_TOKEN, { locale: 'pt-BR' });
initMercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY, { locale: 'pt-BR' });

export default function Mp() {

  // console.log("-Mp-VITE_APP_MP_ENVIRONMENT_TOKEN:", import.meta.env.VITE_APP_MP_ENVIRONMENT_TOKEN);
  console.log("-Mp-VITE_MERCADOPAGO_PUBLIC_KEY:", import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);

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

      console.log('Resposta da preferência:', response.data.accessToken);
      setPreferenceId(response.data.preferenceId);

    } catch (error) {
      console.error('Erro ao criar preferência:', error.response?.data || error.message);
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

      {errorMessage && <div className="error-message">{errorMessage}</div>}

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