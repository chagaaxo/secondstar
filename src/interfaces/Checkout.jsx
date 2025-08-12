import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { Helmet } from 'react-helmet';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [paymentError, setPaymentError] = useState(null);

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
      toast.error('Harap isi semua field yang wajib diisi');
      return;
    }

    // Validate phone number
    if (!/^[0-9]{10,13}$/.test(formData.phone)) {
      toast.error('Nomor telepon harus 10-13 digit angka');
      return;
    }

    setLoading(true);
    setPaymentError(null);

    try {
      // Prepare items
      const items = cart.map(item => ({
        id: item.id,
        price: parseInt(item.price),
        quantity: item.quantity,
        name: item.title.slice(0, 50)
      }));

      // Calculate amounts
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingFee = subtotal > 100000 ? 0 : 10000;
      const totalAmount = subtotal + shippingFee;

      // Customer details
      const customer_details = {
        first_name: formData.name.split(' ')[0] || 'Customer',
        last_name: formData.name.split(' ').slice(1).join(' ') || '.',
        email: formData.email,
        phone: formData.phone,
        billing_address: {
          address: formData.address,
          city: 'Unknown',
          postal_code: '00000',
          country_code: 'IDN'
        },
        shipping_address: {
          address: formData.address,
          city: 'Unknown',
          postal_code: '00000',
          country_code: 'IDN'
        }
      };

      // Create order data
      const orderData = {
        customer_details,
        item_details: [
          ...items,
          ...(shippingFee > 0 ? [{
            id: 'SHIPPING',
            price: shippingFee,
            quantity: 1,
            name: 'Biaya Pengiriman'
          }] : [])
        ],
        transaction_details: {
          order_id: `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          gross_amount: totalAmount
        },
        callbacks: {
          finish: `${window.location.origin}/order-confirmation`,
          error: `${window.location.origin}/checkout?error=payment_failed`,
          pending: `${window.location.origin}/order-pending`
        },
        notifications: {
          enabled: true,
          callback_url: `http://localhost:5173/api/payments/midtrans-notification`
        }
      };

      // Add payment method specific data
      switch (formData.paymentMethod) {
        case 'bank_transfer':
          orderData.payment_type = 'bank_transfer';
          orderData.bank_transfer = { bank: formData.bankCode };
          break;
        case 'credit_card':
          orderData.payment_type = 'credit_card';
          orderData.credit_card = { 
            secure: true,
            save_card: false
          };
          break;
        case 'gopay':
          orderData.payment_type = 'gopay';
          break;
        default: // qris
          orderData.payment_type = 'qris';
      }

      // Process payment
      const { data } = await axios.post('/api/payments/midtrans-transaction', orderData);

      // Handle different payment methods
      if (data.redirect_url) {
        // For credit card, GoPay, etc.
        window.location.href = data.redirect_url;
      } else if (data.payment_type === 'bank_transfer') {
        // For bank transfers
        navigate('/payment-instructions', { 
          state: { 
            paymentData: data, 
            orderId: orderData.transaction_details.order_id 
          } 
        });
      } else if (data.payment_type === 'qris') {
        // For QRIS
        navigate('/payment-qris', { 
          state: { 
            qrCodeUrl: data.actions[0].url, 
            orderId: orderData.transaction_details.order_id 
          } 
        });
      } else {
        // For other cases
        clearCart();
        navigate('/order-confirmation', { 
          state: { orderId: orderData.transaction_details.order_id } 
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      let errorMsg = 'Pembayaran gagal, silahkan coba lagi';
      
      if (error.response) {
        if (error.response.data.error_messages) {
          errorMsg = error.response.data.error_messages.join(', ');
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        }
      }
      
      setPaymentError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const banks = [
    { code: 'bca', name: 'BCA' },
    { code: 'bni', name: 'BNI' },
    { code: 'bri', name: 'BRI' },
    { code: 'mandiri', name: 'Mandiri' },
    { code: 'permata', name: 'Permata' }
  ];

  return (
    <>
      <Helmet>
        <title>Checkout | Toko Kami</title>
      </Helmet>

      {paymentError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{paymentError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>
        
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-lg font-medium text-gray-900">Keranjang Anda kosong</h2>
            <button
              onClick={() => navigate('/products')}
              className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Lanjut Belanja
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Customer Information */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow overflow-hidden p-6">
                <h2 className="text-xl font-semibold mb-4">Informasi Pengiriman</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alamat Pengiriman *
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nomor Telepon *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow overflow-hidden p-6">
                <h2 className="text-xl font-semibold mb-4">Metode Pembayaran</h2>
                <div className="space-y-4">
                  {[
                    { id: 'qris', label: 'QRIS', desc: 'Bayar dengan aplikasi mobile banking yang mendukung QRIS' },
                    { id: 'bank_transfer', label: 'Transfer Bank', desc: '' },
                    { id: 'credit_card', label: 'Kartu Kredit/Debit', desc: 'Pembayaran aman melalui Midtrans' },
                    { id: 'gopay', label: 'GoPay', desc: 'Bayar menggunakan akun GoPay Anda' }
                  ].map((method) => (
                    <div key={method.id} className="flex items-start">
                      <input
                        id={method.id}
                        name="paymentMethod"
                        type="radio"
                        value={method.id}
                        checked={formData.paymentMethod === method.id}
                        onChange={handleInputChange}
                        className="focus:ring-black h-4 w-4 text-black border-gray-300 mt-1"
                      />
                      <label htmlFor={method.id} className="ml-3 block text-sm font-medium text-gray-700">
                        <div>{method.label}</div>
                        {method.desc && <p className="text-xs text-gray-500 mt-1">{method.desc}</p>}
                      </label>
                    </div>
                  ))}

                  {formData.paymentMethod === 'bank_transfer' && (
                    <div className="ml-7 mt-2">
                      <select
                        name="bankCode"
                        value={formData.bankCode}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      >
                        <option value="">Pilih Bank</option>
                        {banks.map(bank => (
                          <option key={bank.code} value={bank.code}>{bank.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-lg shadow overflow-hidden sticky top-4">
                <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium">Ringkasan Pesanan</h3>
                </div>
                <div className="p-6">
                  <ul className="divide-y divide-gray-200 mb-6">
                    {cart.map((item) => (
                      <li key={item.id} className="py-4 flex">
                        <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden">
                          <img
                            src={item.image || '/placeholder-product.jpg'}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex justify-between text-base font-medium text-gray-900">
                            <h3 className="line-clamp-1">{item.title}</h3>
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
                      <p>Ongkos Kirim</p>
                      <p>{cartTotal > 100000 ? 'GRATIS' : formatPrice(10000)}</p>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 mt-4 pt-4 border-t border-gray-200">
                      <p>Total</p>
                      <p>{formatPrice(cartTotal > 100000 ? cartTotal : cartTotal + 10000)}</p>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className={`w-full mt-6 bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${
                      loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? 'Memproses...' : 'Buat Pesanan'}
                  </button>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Dengan membuat pesanan, Anda menyetujui Syarat & Ketentuan kami.
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