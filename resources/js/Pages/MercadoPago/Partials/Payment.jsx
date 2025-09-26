import { useState } from "react";
import { Wallet, initMercadoPago } from "@mercadopago/sdk-react";



console.log(`Chave Publica no Payment: ${import.meta.env.VITE_APP_MP_ENVIRONMENT_TOKEN}`);

initMercadoPago(import.meta.env.VITE_APP_MP_ENVIRONMENT_TOKEN, { locale: 'pt-BR' });

export default function Payment({ preferenceId, orderData }) {



  const [isReady, setIsReady] = useState(false);
  const paymentClass = `payment-form dark ${!isReady ? 'payment-form--hidden' : ''}`;

  const handleOnReady = () => setIsReady(true);

  return (
    <div className={paymentClass}>
      <div className="container_payment">
        <h2>Checkout Payment</h2>
        <div className="products">
          <h2 className="title">Resumo</h2>
          <div className="item">
            <span className="price">R$ {orderData.price},00</span>
            <p>Meses contratados {orderData.quantity}</p>
          </div>
          <div className="total">
            Total: <span className="price">R$ {orderData.amount},00</span>
          </div>
        </div>
        <div className="payment-details">
          {preferenceId && (
            <Wallet initialization={{ preferenceId }} onReady={handleOnReady} />
          )}
        </div>
      </div>
    </div>
  );
}
