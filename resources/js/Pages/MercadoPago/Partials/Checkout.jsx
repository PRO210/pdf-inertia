export default function Checkout({ onClick, orderData, setOrderData }) {
  const isVisible = true;
  const shoppingCartClass = `shopping-cart dark ${!isVisible ? 'shopping-cart--hidden' : ''}`;

  // Função para mudar o tipo de produto
  const handleTypeChange = (type) => {
    let newPrice = 0;
    let newTitle = "";

    if (type === 'mensalidade') {
      newPrice = 4; // Preço da mensalidade
      newTitle = 'Assinatura Mensal Pro';
    } else {
      newPrice = 10; // Preço dos créditos
      newTitle = 'Créditos Avulsos IA';
    }

    setOrderData({
      ...orderData,
      type: type,
      title: newTitle,
      price: newPrice,     
      amount: newPrice * orderData.quantity,        
    });
  };

  const updateQuantity = (event) => {
    const quantity = parseInt(event.target.value) || 1;
    // Multiplica o preço atual (que vem do estado) pela nova quantidade
    const amount = orderData.price * quantity;
    setOrderData({ ...orderData, quantity, amount });
  };

  return (
    <section className={shoppingCartClass}>
      <div id="container">
        <div className="block-heading">
          <h2 className="sm:text-4xl font-bold text-center mb-8">O que deseja contratar?</h2>
        </div>

        {/* SELETOR DE TIPO */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            type="button" // Evita submeter formulários por acidente
            onClick={() => handleTypeChange('mensalidade')}
            className={`p-4 border-2 rounded-xl transition-all w-1/2 ${orderData.type === 'mensalidade' ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-gray-200'}`}
          >
            <span className="block font-bold">Ajuda Mensal</span>
            <span className="text-xs text-gray-500 italic">Acesso ilimitado aos downloads</span>
            <span className="block mt-2 font-semibold text-blue-600">R$ 4,00</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('extra')}
            className={`p-4 border-2 rounded-xl transition-all w-1/2 ${orderData.type === 'extra' ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-gray-200'}`}
          >
            <span className="block font-bold">Créditos para IA</span>
            <span className="text-xs text-gray-500 italic">Recarga para uso variável</span>
            <span className="block mt-2 font-semibold text-blue-600">R$ 10,00</span>
          </button>
        </div>

        <div className="content">
          <div className="row">
            <div className="col-md-12 col-lg-8">
              <div className="product-details p-4 bg-white rounded-lg border">
                <h5 className="text-lg font-bold text-gray-800">{orderData.title}</h5>
                <div className="product-info mt-3">
                  <p className="text-gray-600">
                    <b>Preço Unitário: </b> <span className="text-green-600 font-bold">R$ {orderData.price},00</span>
                  </p>
                  
                  <label className="mt-4 block font-bold text-gray-700">
                    {orderData.type === 'mensalidade' ? 'Quantidade de meses:' : 'Quantidade de pacotes:'}
                  </label>
                  <input
                    onChange={updateQuantity}
                    type="number"
                    value={orderData.quantity}
                    min="1"
                    max="12"
                    className="form-control pro-input w-24 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="col-md-12 col-lg-4">
              <div className="summary p-6 bg-gray-100 rounded-lg shadow-md border border-gray-200">
                <div className="summary-item flex justify-between items-center mb-6">
                  <span className="text-xl font-medium text-gray-700">Total</span>
                  <span className="text-2xl font-black text-blue-700">R$ {orderData.amount},00</span>
                </div>
                <button 
                  className="pro-btn-blue w-full py-4 text-white font-bold rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg" 
                  onClick={onClick}
                >
                  Confirmar e Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}