// import { useState } from "react";
// import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

// // Verifica se está em produção ou desenvolvimento
// const mpPublicKey =
//   import.meta.env.MODE === 'production'
//     ? import.meta.env.VITE_MP_PROD_PUBLIC_KEY
//     : import.meta.env.VITE_MP_TEST_PUBLIC_KEY;

// initMercadoPago(mpPublicKey, { locale: 'pt-BR' });

// // console.log("Chave Pública do Mercado Pago Payment:", mpPublicKey);

// export default function Payment({ preferenceId, orderData }) {

//   const [isReady, setIsReady] = useState(false);
//   const paymentClass = `payment-form dark ${!isReady ? 'payment-form--hidden' : ''}`;

//   const handleOnReady = () => setIsReady(true);

//   return (
//     <div className={paymentClass}>
//       <div className="container_payment">
//         <h2>Checkout Payment</h2>
//         <div className="products">
//           <h2 className="title">Resumo</h2>
//           <div className="item">
//             <span className="price">R$ {orderData.price},00</span>
//             <p>Meses contratados {orderData.quantity}</p>
//           </div>
//           <div className="total">
//             Total: <span className="price">R$ {orderData.amount},00</span>
//           </div>
//         </div>

//         <div className="payment-details">
//           {preferenceId && (
//             <Wallet initialization={{ preferenceId: preferenceId }} onReady={handleOnReady} />
//           )}
//         </div>

//       </div>
//     </div>
//   );
// }
import { useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

const mpPublicKey =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_MP_PROD_PUBLIC_KEY
    : import.meta.env.VITE_MP_TEST_PUBLIC_KEY;

initMercadoPago(mpPublicKey, { locale: 'pt-BR' });

export default function Payment({ preferenceId, orderData }) {
  const [isReady, setIsReady] = useState(false);
  const paymentClass = `payment-form dark ${!isReady ? 'payment-form--hidden' : ''}`;

  const handleOnReady = () => setIsReady(true);

  // Lógica para exibir o texto correto baseado no tipo
  const renderDetails = () => {
    if (orderData.type === 'mensalidade') {
      return (
        <div className="item">
          <p>Plano: <strong>{orderData.title}</strong></p>
          <p>Duração: {orderData.quantity} mês(es)</p>
          <span className="price">R$ {orderData.price.toFixed(2)}</span>
        </div>
      );
    } else {
      return (
        <div className="item">
          <p>Serviço: <strong>{orderData.title}</strong></p>
          <p>Quantidade: {orderData.quantity} pacote(s)</p>
          <span className="price">R$ {orderData.price.toFixed(2)}</span>
        </div>
      );
    }
  };

  return (
    <div className={paymentClass}>
      <div className="container_payment">
        <h2 className="text-xl font-bold mb-4 text-purple-600">Finalizar Pagamento</h2>

        <div className="products bg-gray-50 p-4 rounded-lg mb-4">
          <h2 className="title font-semibold border-b pb-2 mb-2">Resumo do Pedido</h2>

          {renderDetails()}

          <div className="total mt-4 pt-2 border-t font-bold text-lg flex justify-between">
            <span>Total:</span>
            <span className="price text-green-600">
              R$ {(orderData.price * orderData.quantity).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="payment-details mt-6">
          {preferenceId && (
            <Wallet
              initialization={{ preferenceId: preferenceId }}
              onReady={handleOnReady}
            />
          )}
        </div>
      </div>
    </div>
  );
}
