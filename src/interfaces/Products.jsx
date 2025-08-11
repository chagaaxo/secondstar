import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Products = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchTerm = searchParams.get('search')?.toLowerCase() || '';
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const db = getFirestore();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);

        let items = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const combinedSearchText = `
            ${data.title} 
            ${data.brand} 
            ${data.category} 
            ${(data.styles || []).join(' ')}
            ${(data.colors || []).join(' ')}
          `.toLowerCase();

          if (!searchTerm || combinedSearchText.includes(searchTerm)) {
            items.push({ id: doc.id, ...data });
          }
        });

        setProducts(items);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Gagal memuat produk');
      }
      setLoading(false);
    };

    fetchProducts();
  }, [searchTerm]);

  return (
    <div className="p-4 md:p-8">
      <Helmet>
        <title>Produk {searchTerm ? `- ${searchTerm}` : ''}</title>
      </Helmet>

      <h1 className="text-xl font-bold mb-4">
        {searchTerm ? `Hasil Pencarian: "${searchTerm}"` : 'Semua Produk'}
      </h1>

      {loading ? (
        <p>Loading...</p>
      ) : products.length === 0 ? (
        <p>Tidak ada produk ditemukan.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => (
                <motion.div 
                key={product.id} 
                className="border rounded-lg p-3 hover:shadow-md transition-all bg-white cursor-pointer"
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate(`/product/${product.id}`)} // 👈 navigate on click
                >
                <img 
                    src={product.photos?.[0]} 
                    alt={product.title} 
                    className="w-full h-40 object-cover rounded-md mb-2"
                />
                <h2 className="text-sm font-semibold truncate">{product.title}</h2>
                <p className="text-xs text-gray-500">{product.brand}</p>
                <p className="text-[#bd2c30] text-sm font-bold">
                    Rp {Number(product.price).toLocaleString('id-ID')}
                </p>
                </motion.div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Products;
