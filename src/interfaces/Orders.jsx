import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Replace with your actual API endpoint
        const { data } = await axios.get('/api/orders');
        setOrders(data);
      } catch (error) {
        toast.error('Gagal memuat riwayat pesanan');
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const translateStatus = (status) => {
    const statusMap = {
      'pending': 'Menunggu Pembayaran',
      'processing': 'Diproses',
      'shipped': 'Dikirim',
      'completed': 'Selesai',
      'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status;
  };

  const handleReorder = async (orderId) => {
    try {
      // Replace with your actual reorder endpoint
      await axios.post(`/api/orders/${orderId}/reorder`);
      toast.success('Pesanan berhasil dibuat ulang');
    } catch (error) {
      toast.error('Gagal membuat pesanan ulang');
      console.error('Reorder error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Riwayat Pesanan | Toko Kami</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Riwayat Pesanan</h1>
        
        {/* Order Status Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'all' ? 'Semua' : translateStatus(tab)}
                {tab !== 'all' && (
                  <span className="ml-1 bg-gray-200 text-gray-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {orders.filter(o => o.status === tab).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Belum ada pesanan</h3>
            <p className="mt-1 text-sm text-gray-500">
              Pesanan yang Anda buat akan muncul di halaman ini.
            </p>
            <div className="mt-6">
              <Link
                to="/products"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                Mulai Belanja
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white shadow overflow-hidden rounded-lg">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-3 sm:mb-0">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">
                        Pesanan #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Dibuat pada {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {translateStatus(order.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Order Items */}
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Produk</h4>
                      <ul className="divide-y divide-gray-200">
                        {order.items.slice(0, 3).map((item) => (
                          <li key={item.id} className="py-3 flex">
                            <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden">
                              {/*<img
                                src={item.photos?.[0]}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />*/}
                            </div>
                            <div className="ml-4 flex-1">
                              <div className="flex justify-between text-base font-medium text-gray-900">
                                <h3>{item.name}</h3>
                                <p>{formatPrice(item.price)}</p>
                              </div>
                              <p className="mt-1 text-sm text-gray-500">
                                {item.quantity} × {formatPrice(item.price)}
                              </p>
                            </div>
                          </li>
                        ))}
                        {order.items.length > 3 && (
                          <li className="py-3 text-sm text-gray-500">
                            + {order.items.length - 3} produk lainnya
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Order Actions */}
                    <div>
                      <div className="space-y-3">
                        <Link
                          to={`/orders/${order.id}`}
                          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                          Lihat Detail
                        </Link>
                        {order.status === 'pending' && (
                          <button
                            onClick={() => navigate('/order-confirmation', { state: { orderId: order.id } })}
                            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Bayar Sekarang
                          </button>
                        )}

                        {order.status === 'completed' && (
                          <button
                            onClick={() => navigate(`/product/${order.items[0]?.productId || ''}`)}
                            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                          >
                            Beli Lagi
                          </button>
                        )}
                        
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => toast.info('Fitur pelacakan akan segera tersedia')}
                            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                          >
                            Lacak Pengiriman
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Orders;