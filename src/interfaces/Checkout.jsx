import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { Helmet } from 'react-helmet';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    paymentMethod: 'qris',
    bankCode: ''
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlaceOrder = async () => {
    if (!formData.name || !formData.email || !formData.address || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      // Create order in your database
      const orderData = {
        customer: {
          name: formData.name,
          email: formData.email,
          address: formData.address,
          phone: formData.phone
        },
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        total: cartTotal > 100000 ? cartTotal : cartTotal + 10000,
        paymentMethod: formData.paymentMethod,
        bankCode: formData.bankCode || null,
        status: 'pending'
      };

      // First save to your database
      const orderResponse = await axios.post('/api/orders', orderData);
      const orderId = orderResponse.data.orderId;

      // Process payment based on selected method
      let paymentResponse;
      
      if (formData.paymentMethod === 'qris') {
        paymentResponse = await axios.post('/api/payments/qris', {
          orderId,
          amount: cartTotal,
          customerEmail: formData.email
        });
      } else if (formData.paymentMethod === 'bank_transfer') {
        paymentResponse = await axios.post('/api/payments/bank-transfer', {
          orderId,
          amount: cartTotal,
          bankCode: formData.bankCode
        });
      } else if (formData.paymentMethod === 'credit_card') {
        paymentResponse = await axios.post('/api/payments/credit-card', {
          orderId,
          amount: cartTotal,
          cardDetails: {} // In a real app, you'd use a payment processor SDK for this
        });
      }

      // Handle payment response
      if (paymentResponse.data.success) {
        if (formData.paymentMethod === 'qris' || formData.paymentMethod === 'bank_transfer') {
          // Redirect to payment instructions page with payment data
          navigate('/payment-instructions', {
            state: {
              paymentData: paymentResponse.data.data,
              orderId
            }
          });
        } else {
          // For credit cards, if payment is successful immediately
          toast.success('Payment successful! Order placed.');
          clearCart();
          navigate('/order-confirmation', { state: { orderId } });
        }
      } else {
        throw new Error(paymentResponse.data.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Failed to process order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const banks = [
    { code: 'bca', name: 'BCA' },
    { code: 'mandiri', name: 'Mandiri' },
    { code: 'bni', name: 'BNI' },
    { code: 'bri', name: 'BRI' },
    { code: 'permata', name: 'Permata' },
    { code: 'cimb', name: 'CIMB Niaga' },
    { code: 'danamon', name: 'Danamon' }
  ];

  return (
    <>
      <Helmet>
        <title>Checkout | Our Store</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-lg font-medium text-gray-900">Your cart is empty</h2>
            <button
              onClick={() => navigate('/products')}
              className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="bg-white rounded-lg shadow overflow-hidden p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black"
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Shipping Address *
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black"
                    ></textarea>
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black"
                    />
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden p-6">
                <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <input
                      id="qris"
                      name="paymentMethod"
                      type="radio"
                      value="qris"
                      checked={formData.paymentMethod === 'qris'}
                      onChange={handleInputChange}
                      className="focus:ring-black h-4 w-4 text-black border-gray-300 mt-1"
                    />
                    <label htmlFor="qris" className="ml-3 block text-sm font-medium text-gray-700">
                      <div>QRIS</div>
                      <p className="text-xs text-gray-500 mt-1">
                        Pay with any mobile banking app that supports QRIS
                      </p>
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      id="bank_transfer"
                      name="paymentMethod"
                      type="radio"
                      value="bank_transfer"
                      checked={formData.paymentMethod === 'bank_transfer'}
                      onChange={handleInputChange}
                      className="focus:ring-black h-4 w-4 text-black border-gray-300 mt-1"
                    />
                    <label htmlFor="bank_transfer" className="ml-3 block text-sm font-medium text-gray-700">
                      <div>Bank Transfer</div>
                      {formData.paymentMethod === 'bank_transfer' && (
                        <div className="mt-2">
                          <select
                            name="bankCode"
                            value={formData.bankCode}
                            onChange={handleInputChange}
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black text-sm"
                            required
                          >
                            <option value="">Select Bank</option>
                            {banks.map(bank => (
                              <option key={bank.code} value={bank.code}>{bank.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      id="credit_card"
                      name="paymentMethod"
                      type="radio"
                      value="credit_card"
                      checked={formData.paymentMethod === 'credit_card'}
                      onChange={handleInputChange}
                      className="focus:ring-black h-4 w-4 text-black border-gray-300 mt-1"
                    />
                    <label htmlFor="credit_card" className="ml-3 block text-sm font-medium text-gray-700">
                      <div>Credit/Debit Card (VISA, Mastercard)</div>
                      <p className="text-xs text-gray-500 mt-1">
                        Secure payment processed by our payment gateway
                      </p>
                    </label>
                  </div>
                  
                  {formData.paymentMethod === 'credit_card' && (
                    <div className="ml-7 mt-2 p-4 border border-gray-200 rounded-md bg-gray-50">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <input
                      id="cod"
                      name="paymentMethod"
                      type="radio"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleInputChange}
                      className="focus:ring-black h-4 w-4 text-black border-gray-300 mt-1"
                    />
                    <label htmlFor="cod" className="ml-3 block text-sm font-medium text-gray-700">
                      <div>Cash on Delivery (COD)</div>
                      <p className="text-xs text-gray-500 mt-1">
                        Available in selected areas only. Additional fee may apply.
                      </p>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Order Summary
                  </h3>
                </div>
                <div className="p-6">
                  <ul className="divide-y divide-gray-200 mb-6">
                    {cart.map((item) => (
                      <li key={item.id} className="py-4 flex">
                        <div className="flex-shrink-0">
                          <img
                            src={item.image || '/placeholder-product.jpg'}
                            alt={item.title}
                            className="w-16 h-16 rounded-md object-cover"
                          />
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between text-base font-medium text-gray-900">
                            <h3>{item.title}</h3>
                            <p>{formatPrice(item.price * item.quantity)}</p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-base font-medium text-gray-900 mb-2">
                      <p>Subtotal</p>
                      <p>{formatPrice(cartTotal)}</p>
                    </div>
                    <div className="flex justify-between text-base font-medium text-gray-900 mb-2">
                      <p>Shipping</p>
                      <p>{cartTotal > 100000 ? 'FREE' : formatPrice(10000)}</p>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 mt-4 pt-4 border-t border-gray-200">
                      <p>Total</p>
                      <p>{formatPrice(cartTotal > 100000 ? cartTotal : cartTotal + 10000)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className={`w-full mt-6 bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </button>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    By placing your order, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Checkout;