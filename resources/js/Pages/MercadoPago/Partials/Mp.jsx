import FullScreenSpinner from '@/Components/FullScreenSpinner';
import { initMercadoPago } from '@mercadopago/sdk-react'
import { usePage } from '@inertiajs/react'
import { useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

import Checkout from './Checkout';
import axios from 'axios';
import Payment from './Payment';
import Pix from '@/Components/Pix';

const MySwal = withReactContent(Swal);

// Verifica se está em produção ou desenvolvimento
const mpPublicKey =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_MP_PROD_PUBLIC_KEY
    : import.meta.env.VITE_MP_TEST_PUBLIC_KEY;

initMercadoPago(mpPublicKey, { locale: 'pt-BR' });
// console.log("Chave Pública do Mercado Pago:", mpPublicKey);


// export default function Mp() {


//   const { props } = usePage();
//   const user = props.auth.user;
//   const [preferenceId, setPreferenceId] = useState(null);

//   const [isLoading, setIsLoading] = useState(false);

//   const [orderData, setOrderData] = useState({
//     title: "Assinatura Mensal Pro",
//     price: 4,
//     quantity: 1,
//     amount: 4,
//     type: "mensalidade",
//   });


//   const [errorMessage, setErrorMessage] = useState('');

//   const handleClick = async () => {
//     setIsLoading(true);
//     try {

//       const items = [
//         {
//           title: orderData.title,
//           quantity: parseInt(orderData.quantity),
//           unit_price: parseFloat(orderData.price),
//           currency_id: "BRL",
//         }
//       ];

//       const payer = {
//         name: user.name || "Cliente",
//         email: user.email || "cliente@teste.com"
//       };

//       const response = await axios.post('/create_preference', { items, payer, type: orderData.type }, {
//         headers: { 'Content-Type': 'application/json' }
//       });


//       setPreferenceId(response.data.preferenceId);

//     } catch (error) {
//       console.error('Erro ao criar preferência:', error.response?.data || error.message);
//       setErrorMessage('Erro ao criar preferência. Por favor, tente novamente.');

//       // Mostra o erro usando SweetAlert2
//       MySwal.fire({
//         icon: 'error',
//         title: 'Erro ao criar preferência',
//         text: error.response?.data?.message || 'Ocorreu um erro inesperado. Tente novamente.',
//         timer: 10000,
//         timerProgressBar: true,
//         footer: '<a href="#">Contate o suporte se o problema persistir</a>',
//         confirmButtonColor: '#6b21a8', // roxo (como o Nubank)
//         customClass: {
//           confirmButton: 'px-8 py-3 text-lg w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white',
//         },
//         buttonsStyling: false, // necessário para usar classes customizadas
//       }).then(() => {
//         console.log('SweetAlert2 closed');
//       });


//     } finally {
//       setIsLoading(false);
//     }
//   };


//   const renderSpinner = () => {
//     if (isLoading) {
//       return (
//         <div className="spinner-wrapper">
//           <FullScreenSpinner />
//         </div>
//       )
//     }
//   }


//   return (
//     <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">

//       {renderSpinner()}

//       {/* {errorMessage && <div className="error-message">{errorMessage}</div>} */}

//       <Checkout
//         orderData={orderData}
//         setOrderData={setOrderData}
//         onClick={handleClick}
//       />

//       {preferenceId && (
//         <Payment preferenceId={preferenceId} orderData={orderData} />
//       )}


//     </div>
//   );
// }

export default function Mp() {
  const { props } = usePage();
  const user = props.auth.user;
  const [preferenceId, setPreferenceId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [orderData, setOrderData] = useState({
    title: "Assinatura Mensal Pro",
    price: 4,
    quantity: 1,
    amount: 4,
    type: "mensalidade",
  });

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const items = [{
        title: orderData.title,
        quantity: parseInt(orderData.quantity),
        unit_price: parseFloat(orderData.price),
        currency_id: "BRL",
      }];

      const payer = {
        name: user.name || "Cliente",
        email: user.email || "cliente@teste.com"
      };

      const response = await axios.post('/create_preference', { items, payer, type: orderData.type });
      setPreferenceId(response.data.preferenceId);
    } catch (error) {
      MySwal.fire({
        icon: 'error',
        title: 'Erro ao criar preferência',
        text: 'Ocorreu um erro inesperado. Tente novamente.',
        confirmButtonColor: '#6b21a8',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">
      {isLoading && <FullScreenSpinner />}

      {!preferenceId ? (
        <>
          {/* Fluxo Principal */}
          <Checkout
            orderData={orderData}
            setOrderData={setOrderData}
            onClick={handleClick}
          />

          {/* Divisor Visual */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-300"></span></div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Ou pague via Pix direto</span>
            </div>
          </div>

          {/* Opção Secundária */}
          <div className="max-w-xs mx-auto">
            <Pix />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center animate-in fade-in duration-500">


          <Payment preferenceId={preferenceId} orderData={orderData} />

          {/* Botão para voltar se o usuário desistir do MP e quiser o Pix manual */}
          <button
            onClick={() => setPreferenceId(null)}
            className="mt-8 flex items-center gap-2  font-medium text-gray-500 hover:text-purple-600 transition-colors group"
          >
            {/* Seta SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Escolher outra forma de pagamento / Alterar valor
          </button>
        </div>
      )}
    </div>
  );
}
