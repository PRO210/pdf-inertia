import FullScreenSpinner from '@/Components/FullScreenSpinner';
import { initMercadoPago } from '@mercadopago/sdk-react'
import { useState } from 'react';
import Checkout from './Checkout';
import axios from 'axios';
import Payment from './Payment';


initMercadoPago(import.meta.env.VITE_APP_MP_ENVIRONMENT_TOKEN, { locale: 'pt-BR' });


export default function Mp() {

  const [preferenceId, setPreferenceId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderData, setOrderData] = useState({
    price: 3,
    quantity: 1,
    amount: 3,
  });

  // console.log(`Chave Publica no Mp: ${import.meta.env.VITE_APP_MP_ENVIRONMENT_TOKEN}`);

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
        name: "Cliente Teste",
        email: "cliente@teste.com"
      };

      const response = await axios.post('/create_preference', { items, payer }, {
        headers: { 'Content-Type': 'application/json' }
      });

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

      {/* <h1 className="text-2xl font-bold mb-4">
        Checkout de Pagamento/Doação com Mercado Pago
      </h1>
      <p className="mb-4">
        Esta é uma integração simples do checkout do Mercado Pago
        utilizando React e Inertia.js.
      </p>
      <p>
        Clique no botão abaixo para iniciar o processo de pagamento ou
        doação.
      </p> */}

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