import {  useState } from "react";
import './checkout.css';


export default function Checkout({ onClick, orderData, setOrderData }) {

  const [isVisible, setIsVisible] = useState(true);  
  const [disabled, setDisabled] = useState(false);
  const shoppingCartClass = `shopping-cart dark ${!isVisible ? 'shopping-cart--hidden' : ''}`;


  const updatePrice = (event) => {
    const quantity = event.target.value;
    const amount = parseInt(orderData.price) * parseInt(quantity);
    setOrderData({ ...orderData, quantity, amount });
  }


  return (
    <section className={shoppingCartClass}>
      <div className="" id="container">
        <div className="block-heading">
          <h2 className="sm:text-2xl">Seu carrinho</h2>
          <p></p>
        </div>

        <div className="content">
          <div className="row">
            <div className="col-md-12 col-lg-8">
              <div className="items">
                <div className="product">
                  <div className="info">
                    <div className="product-details">
                      <div className="row justify-content-md-center">
                        <div className="col-md-3">
                          {/* <img
                            className="img-fluid mx-auto d-block image w-36 h-36 fill-current"
                            alt="Atividades por Página"
                            src={logo}
                          /> */}
                        </div>
                        <div className="col-md-4 product-detail">
                          <h5>Produto</h5>
                          <div className="product-info">
                            <b>Descrição: </b>
                            <span id="product-description">Facilicar a conversão e impressão de imagens para PDF.</span>
                            <br />
                            <b>Author: </b>Pró
                            <br />
                            <b>Doação:</b> R$ <span id="unit-price">3,00</span>
                            <br />
                          </div>
                        </div>
                        <div className="col-md-3 product-detail">
                          <label htmlFor="quantity" className="mr-2" >
                            <b>Meses</b>
                          </label>
                          <input
                            onChange={updatePrice}
                            type="number"
                            id="quantity"
                            value={orderData.quantity}
                            min="1"
                            max="12"
                            className="form-control pro-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-12 col-lg-4">
              <div className="summary">
                {/* <h3>Cart</h3> */}
                <div className="summary-item">
                  <span className="text">Subtotal</span>
                  <span className="price" id="cart-total">R$ {orderData.amount},00</span>
                </div>
                <button
                  className="pro-btn-blue"
                  onClick={onClick}
                  id="checkout-btn"
                  disabled={disabled}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

}