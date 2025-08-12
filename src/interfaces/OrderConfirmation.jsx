import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const OrderConfirmation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState({
    active: false,
    count: 0,
    maxAttempts: 30, // 5 minutes with 10s interval
    interval: 10000 // 10 seconds
  });
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // Status display configuration
  const STATUS_CONFIG = {
    pending: {
      title: 'Menunggu Pembayaran',
      icon: (
        <svg className="mx-auto h-16 w-16 text-yellow-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      message: 'Silakan selesaikan pembayaran Anda. Kami akan memproses pesanan setelah pembayaran dikonfirmasi.',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50'
    },
    completed: {
      title: 'Pembayaran Berhasil',
      icon: (
        <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      message: 'Terima kasih telah berbelanja di toko kami. Pesanan Anda telah kami terima.',
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    failed: {
      title: 'Pembayaran Gagal',
      icon: (
        <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      message: 'Maaf, pembayaran Anda tidak berhasil. Silakan coba lagi atau gunakan metode pembayaran lain.',
      color: 'text-red-600',
      bg: 'bg-red-50'
    },
    processing: {
      title: 'Pembayaran Diproses',
      icon: (
        <svg className="mx-auto h-16 w-16 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      message: 'Pembayaran Anda sedang diproses. Harap tunggu beberapa saat.',
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    }
  };

  useEffect(() => {
    if (paymentStatus === 'active' && order) {
      const markProductsAsSold = async () => {
        try {
          await axios.post('/api/orders/mark-sold', {
            orderId: order.id,
            items: order.items
          });
        } catch (error) {
          console.error('Error marking products as sold:', error);
        }
      };
      
      markProductsAsSold();
    }
  }, [paymentStatus, order]);

  useEffect(() => {
    if (!state?.orderId) {
      navigate('/');
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/orders/${state.orderId}`);
        
        setOrder(data);
        setPaymentStatus(data.status || 'pending');
        
        // Start polling if payment is still pending
        if (data.status === 'pending') {
          startPolling(data.id);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Gagal memuat detail pesanan');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    const startPolling = (orderId) => {
      setPolling(prev => ({ ...prev, active: true }));
      
      const pollPaymentStatus = async () => {
        try {
          const { data } = await axios.get(`/api/payments/status/${orderId}`, {
            params: { forceCheck: polling.count % 3 === 0 } // Force check every 3rd poll
          });
          
          if (data.status !== paymentStatus) {
            setPaymentStatus(data.status);
            setOrder(data.order);
            
            if (data.status === 'completed') {
              toast.success('Pembayaran berhasil dikonfirmasi!');
              setPolling(prev => ({ ...prev, active: false }));
              return;
            }
          }

          setPolling(prev => ({
            ...prev,
            count: prev.count + 1
          }));
          
          if (polling.count >= polling.maxAttempts) {
            setPolling(prev => ({ ...prev, active: false }));
            toast.info('Pembayaran masih diproses. Anda dapat memeriksa status nanti di halaman pesanan.');
          }
        } catch (error) {
          console.error('Polling error:', error);
          setPolling(prev => ({
            ...prev,
            count: prev.count + 1
          }));
        }
      };

      // Initial poll
      pollPaymentStatus();
      
      // Set up interval
      const intervalId = setInterval(pollPaymentStatus, polling.interval);
      
      return () => clearInterval(intervalId);
    };

    fetchOrder();
  }, [state, navigate]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const options = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const currentStatusConfig = STATUS_CONFIG[paymentStatus] || STATUS_CONFIG.pending;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-4">Pesanan tidak ditemukan</h2>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Konfirmasi Pesanan | Toko Kami</title>
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          {currentStatusConfig.icon}
          <h1 className="text-2xl font-bold mt-4">{currentStatusConfig.title}</h1>
          <p className="mt-2 text-gray-600">{currentStatusConfig.message}</p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white shadow overflow-hidden rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Pesanan #{order.orderNumber || order.orderId?.slice(-6).toUpperCase()}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Dibuat pada {formatDateTime(order.createdAt)}
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            {/* Payment Status */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-500">Status Pembayaran</h4>
              <div className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatusConfig.bg} ${currentStatusConfig.color}`}>
                {currentStatusConfig.title}
              </div>
              
              {paymentStatus === 'pending' && order.payment?.data?.redirect_url && (
                <div className="mt-3">
                  <a
                    href={order.payment.data.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Selesaikan Pembayaran
                    <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </a>
                  <p className="mt-2 text-xs text-gray-500">
                    Jika Anda sudah melakukan pembayaran, status akan diperbarui otomatis dalam beberapa menit.
                  </p>
                </div>
              )}
            </div>

            {/* Payment Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Total Pembayaran</h4>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatPrice(order.payment?.amount || order.totalAmount)}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Metode Pembayaran</h4>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {order.payment?.method === 'bank_transfer' ? 'Transfer Bank' : 
                   order.payment?.method === 'qris' ? 'QRIS' : 
                   order.payment?.method === 'credit_card' ? 'Kartu Kredit' : 
                   order.payment?.method === 'gopay' ? 'GoPay' : 
                   order.payment?.method || 'Tidak diketahui'}
                </p>
              </div>
              
              {paymentStatus === 'completed' && order.payment?.paidAt && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Waktu Pembayaran</h4>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatDateTime(order.payment.paidAt)}
                  </p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Email</h4>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {order.customer?.email || '-'}
                </p>
              </div>
            </div>
            
            {/* Order Items Preview */}
            {order.items?.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Produk</h4>
                <ul className="divide-y divide-gray-200">
                  {order.items.slice(0, 3).map((item, index) => (
                    <li key={index} className="py-3 flex">
                      <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-100">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <h3 className="line-clamp-1">{item.name}</h3>
                          <p>{formatPrice(item.price * item.quantity)}</p>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                    </li>
                  ))}
                  {order.items.length > 3 && (
                    <li className="py-2 text-center text-sm text-gray-500">
                      + {order.items.length - 3} produk lainnya
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          {paymentStatus === 'pending' && (
            <a
              href={order.payment?.data?.redirect_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Selesaikan Pembayaran
            </a>
          )}
          
          <Link
            to="/orders"
            className="inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800"
          >
            Lihat Riwayat Pesanan
          </Link>
          
          <Link
            to="/products"
            className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Lanjut Belanja
          </Link>
        </div>

        {/* Polling Status */}
        {polling.active && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Memeriksa status pembayaran... ({polling.count}/{polling.maxAttempts})</p>
          </div>
        )}
      </div>
    </>
  );
};

export default OrderConfirmation;