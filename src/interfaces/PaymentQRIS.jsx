import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PaymentQRIS = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds

  useEffect(() => {
    if (state?.qrCodeUrl && state?.orderId) {
      setQrCodeUrl(state.qrCodeUrl);
      setOrderId(state.orderId);
      setLoading(false);
    } else {
      navigate('/checkout');
    }
  }, [state, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [orderId]);

  const checkPaymentStatus = async () => {
    try {
      const { data } = await axios.get(`/api/payments/status/${orderId}`);
      setPaymentStatus(data.status);
      
      if (data.status === 'completed') {
        clearInterval();
        navigate('/order-confirmation', { state: { orderId } });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast.error('Gagal memeriksa status pembayaran');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <Helmet>
        <title>Pembayaran QRIS | Toko Kami</title>
      </Helmet>

      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Pembayaran QRIS</h1>
        
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <div className="mx-auto w-64 h-64 bg-white p-4 border border-gray-200 rounded-lg">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code Pembayaran" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              <p className="mt-4 text-sm text-gray-500">
                Scan QR code di atas menggunakan aplikasi mobile banking atau e-wallet yang mendukung QRIS
              </p>
              
              <div className="mt-6">
                <div className="flex justify-center items-center space-x-2">
                  <span className="text-sm font-medium text-gray-500">Batas Waktu:</span>
                  <span className={`text-lg font-bold ${
                    timeLeft < 60 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Petunjuk Pembayaran:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Buka aplikasi mobile banking atau e-wallet Anda</li>
                <li>Pilih menu pembayaran QRIS</li>
                <li>Scan QR code di atas</li>
                <li>Periksa nominal pembayaran</li>
                <li>Konfirmasi pembayaran</li>
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

export default PaymentQRIS;