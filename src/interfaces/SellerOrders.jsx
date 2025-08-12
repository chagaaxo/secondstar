import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const translateStatus = (status) => {
    switch (status) {
        case 'pending':
        return 'Menunggu Pembayaran';
        case 'processing':
        return 'Diproses';
        case 'shipped':
        return 'Dikirim';
        case 'completed':
        return 'Selesai';
        case 'cancelled':
        return 'Dibatalkan';
        default:
        return status;
    }
    };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await axios.get('/api/seller/orders');
        setOrders(data);
      } catch (error) {
        toast.error('Gagal memuat pesanan');
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

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`/api/seller/orders/${orderId}`, { status: newStatus });
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      toast.success('Status pesanan berhasil diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui status pesanan');
      console.error('Error updating order status:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  return (
    <>
      <Helmet>
        <title>Pesanan Penjual | Toko Kami</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Kelola Pesanan</h1>
        
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
            <h3 className="mt-2 text-lg font-medium text-gray-900">Belum ada pesanan</h3>
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
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)} border-none focus:ring-2 focus:ring-black`}
                      >
                        <option value="pending">Menunggu Pembayaran</option>
                        <option value="processing">Diproses</option>
                        <option value="shipped">Dikirim</option>
                        <option value="completed">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                      </select>
                      <span className="text-sm font-medium text-gray-900">
                        Total: {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  {/* Order items and details */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default SellerOrders;