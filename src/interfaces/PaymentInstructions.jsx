import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PaymentInstructions = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState(null);
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  useEffect(() => {
    if (state?.paymentData && state?.orderId) {
      setPaymentData(state.paymentData);
      setOrderId(state.orderId);
      setLoading(false);
    } else {
      navigate('/checkout');
    }
  }, [state, navigate]);

  const checkPaymentStatus = async () => {
    try {
      const { data } = await axios.get(`/api/payments/status/${orderId}`);
      setPaymentStatus(data.status);
      
      if (data.status === 'completed') {
        navigate('/order-confirmation', { state: { orderId } });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast.error('Gagal memeriksa status pembayaran');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <Helmet>
        <title>Instruksi Pembayaran | Toko Kami</title>
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Instruksi Pembayaran</h1>
        
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium mb-4">Transfer Bank</h2>
            
            {paymentData.va_numbers ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Bank Tujuan</p>
                  <p className="font-medium">{paymentData.va_numbers[0].bank.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nomor Virtual Account</p>
                  <p className="font-medium">{paymentData.va_numbers[0].va_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jumlah Transfer</p>
                  <p className="font-medium">{formatPrice(paymentData.gross_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Batas Waktu Pembayaran</p>
                  <p className="font-medium">
                    {new Date(paymentData.expiry_time).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Nomor Rekening</p>
                  <p className="font-medium">{paymentData.account_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Atas Nama</p>
                  <p className="font-medium">{paymentData.account_holder}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jumlah Transfer</p>
                  <p className="font-medium">{formatPrice(paymentData.gross_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Batas Waktu Pembayaran</p>
                  <p className="font-medium">
                    {new Date(paymentData.expiry_time).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Petunjuk Pembayaran:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Buka aplikasi mobile banking atau internet banking Anda</li>
                <li>Pilih menu transfer</li>
                <li>Masukkan nomor virtual account/rekening tujuan</li>
                <li>Masukkan jumlah yang harus dibayarkan</li>
                <li>Ikuti instruksi selanjutnya untuk menyelesaikan pembayaran</li>
                <li>Pembayaran akan diverifikasi secara otomatis</li>
              </ol>
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button
                onClick={() => navigate('/checkout')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Kembali ke Checkout
              </button>
              <button
                onClick={checkPaymentStatus}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800"
              >
                Saya Sudah Bayar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentInstructions;