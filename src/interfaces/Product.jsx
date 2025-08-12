import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { Helmet } from 'react-helmet';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CartContext } from '../context/CartContext';
import { getAuth } from "firebase/auth";

const Product = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [zoomImage, setZoomImage] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewImages, setReviewImages] = useState([]);
  const auth = getAuth();

  const { addToCart } = useContext(CartContext);

  const IMGBB_API_KEY = '5c0156550435c0408de9ab844fd15e8e'; 

  useEffect(() => {
    const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const db = getFirestore();
      
      // Fetch product
      const productRef = doc(db, 'products', productId);
      const productSnapshot = await getDoc(productRef);
      
      if (productSnapshot.exists()) {
        const productData = productSnapshot.data();
        
        if (!productData.title || !productData.price) {
          throw new Error('Product data is incomplete');
        }
        
        // Fetch seller information
        let sellerData = {};
        if (productData.sellerId) {
          const sellerRef = doc(db, 'users', productData.sellerId);
          const sellerSnapshot = await getDoc(sellerRef);
          if (sellerSnapshot.exists()) {
            sellerData = sellerSnapshot.data();
          }
        }
        
        setProduct({
          id: productSnapshot.id,
          photos: productData.photos?.length ? productData.photos : ['/placeholder-product.jpg'],
          ...productData,
          seller: sellerData // Add seller data to product
        });

        // Fetch reviews
          const reviewsQuery = query(
            collection(db, 'reviews'),
            where('productId', '==', productId)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          const reviewsData = reviewsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setReviews(reviewsData);

          // Fetch related products
          if (productData.category) {
            const relatedQuery = query(
              collection(db, 'products'),
              where('category', '==', productData.category),
              where('__name__', '!=', productId),
              limit(4)
            );
            const relatedSnapshot = await getDocs(relatedQuery);
            const relatedData = relatedSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setRelatedProducts(relatedData);
          }
        } else {
          setError('Product not found');
          toast.error('Product not found');
          navigate('/products', { replace: true });
        }
      } catch (err) {
        console.error('Error fetching product data:', err);
        setError(err.message || 'Failed to load product. Please try again later.');
        toast.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId, navigate]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleQuantityChange = (value) => {
    const newQuantity = quantity + value;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 10)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.photos[0],
        quantity: quantity
      });
      toast.success(`${quantity} ${product.title} added to cart`);
    } catch (err) {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.photos[0],
      quantity: quantity
    });
    navigate('/cart');
  };

  const handleImageZoom = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setZoomPosition({ x, y });
  };

  const uploadImageToImgbb = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error('Image upload failed');
    }

    return data.data.url;
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      toast.error('Please write your review');
      return;
    }

    try {
      setIsSubmittingReview(true);
      const db = getFirestore();
      const user = auth.currentUser;

      if (!user) {
        toast.error('You must be logged in to submit a review');
        setIsSubmittingReview(false);
        return;
      }

      // Upload images to imgbb and get URLs
      const uploadedImageUrls = [];
      for (const file of reviewImages) {
        const url = await uploadImageToImgbb(file);
        uploadedImageUrls.push(url);
      }

      const reviewData = {
        productId,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userEmail: user.email,
        rating,
        text: reviewText,
        images: uploadedImageUrls,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'reviews'), reviewData);

      // Refresh reviews
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('productId', '==', productId)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewsData);

      toast.success('Review submitted successfully!');
      setReviewText('');
      setReviewImages([]);
      setShowReviewForm(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setReviewImages(prev => [...prev, ...files]);
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-200 aspect-square rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-12 bg-gray-200 rounded w-1/3 mt-8"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Error Loading Product</h2>
        <p className="text-red-500 mb-4">{error || 'Product not found'}</p>
        <button 
          onClick={() => navigate('/products')}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
        >
          Browse Products
        </button>
      </div>
    );
  }

  const averageRating = calculateAverageRating();

  return (
    <>
      <Helmet>
        <title>{product.title} | Our Store</title>
        <meta name="description" content={product.description || product.title} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description || product.title} />
        <meta property="og:image" content={product.photos[0]} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div 
              className="relative aspect-square overflow-hidden rounded-lg mb-4 cursor-zoom-in"
              onMouseEnter={() => setZoomImage(true)}
              onMouseLeave={() => setZoomImage(false)}
              onMouseMove={handleImageZoom}
            >
              <img
                src={product.photos[selectedImage]}
                alt={product.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = '/placeholder-product.jpg';
                }}
              />
              {zoomImage && (
                <div 
                  className="hidden md:block absolute inset-0 bg-no-repeat bg-cover"
                  style={{
                    backgroundImage: `url(${product.photos[selectedImage]})`,
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    transform: 'scale(2)',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                />
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.photos.map((photo, index) => (
                <button 
                  key={index}
                  aria-label={`View image ${index + 1}`}
                  className={`aspect-square overflow-hidden rounded-lg cursor-pointer border-2 transition-colors ${
                    selectedImage === index ? 'border-black' : 'border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img
                    src={photo}
                    alt={`${product.title} thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div>
            <div className="mb-6">
              <span className="text-sm text-gray-500">{product.category || 'Uncategorized'}</span>
              <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
              <div className="flex items-center mb-4">
                <div className="flex items-center mr-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < 4 ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="ml-1 text-sm text-gray-600">(10)</span>
                </div>
              </div>
            </div>

            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-gray-900 mb-2">
                {formatPrice(product.price)}
                {product.originalPrice && (
                  <span className="ml-2 text-lg text-gray-500 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </p>
              {product.discount && (
                <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
                  {product.discount}% OFF
                </span>
              )}
            </div>

            {/* Seller Information */}
            <div className="mb-6 p-4 border rounded-lg">
              <h3 className="text-lg font-medium mb-3">Informasi Seller</h3>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gray-200 mr-3 overflow-hidden flex-shrink-0">
                  {product.seller?.photoURL ? (
                    <img 
                      src={product.seller.photoURL} 
                      alt={product.seller.displayName || 'Seller'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{product.seller?.name || 'Seller'}</p>
                  <p className="text-sm text-gray-500 mb-1">
                    @{product.seller?.username || 'No username'}
                  </p>
                  {product.sellerId && (
                    <button 
                      onClick={() => navigate(`/products?seller=${product.sellerId}`)}
                      className="text-sm text-[#bd2c30] hover:underline"
                    >
                      Lihat semua produk dari penjual ini
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Product Specifications */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Spesifikasi Produk</h2>
              <div className="space-y-3">
                <div className="flex">
                  <span className="w-32 font-medium text-gray-600">Kode Produk</span>
                  <span className="text-gray-800">{product.id}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-medium text-gray-600">Kategori</span>
                  <span className="text-gray-800">{product.category || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-medium text-gray-600">Ukuran</span>
                  <span className="text-gray-800">{product.size || '10.11cm'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-medium text-gray-600">Kondisi</span>
                  <span className="text-gray-800">{product.condition || 'Baru'}</span>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-2">Jumlah</h3>
              <div className="flex items-center">
                <button 
                  className="w-10 h-10 border rounded-l flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <div className="w-16 h-10 border-t border-b flex items-center justify-center text-gray-800">
                  {quantity}
                </div>
                <button 
                  className="w-10 h-10 border rounded-r flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= (product.stock || 10)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                className={`px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors flex-1 flex items-center justify-center ${
                  addingToCart ? 'opacity-70' : ''
                }`}
                onClick={handleAddToCart}
                disabled={product.stock <= 0 || addingToCart}
              >
                {addingToCart ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menambahkan...
                  </>
                ) : (
                  'Tambah ke Keranjang'
                )}
              </button>

              <button
                className="px-6 py-3 border border-black rounded hover:bg-gray-100 transition-colors flex-1"
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
              >
                Beli Sekarang
              </button>

              {/* Message Seller button - only shown when logged in */}
              {auth.currentUser && (
                <button
                  className="px-6 py-3 bg-[#bd2c30] text-white rounded hover:bg-[#641b1d] transition-colors flex-1"
                  onClick={() => navigate(`/messages?sellerId=${product.sellerId || ''}&productId=${product.id}`)}
                >
                  Hubungi Penjual
                </button>
              )}
            </div>

            {/* Product Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Deskripsi Produk</h2>
              <div className="text-gray-700 prose max-w-none">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br />') }} />
                ) : (
                  <p>Tidak ada deskripsi tersedia.</p>
                )}
              </div>
            </div>

            {/* Shipping Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Pengiriman</h3>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-gray-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <div>
                  <p className="text-sm text-gray-600">Gratis ongkir untuk pembelian di atas Rp100.000</p>
                  <p className="text-sm text-gray-600">Estimasi tiba dalam 2-5 hari kerja</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Ulasan Pelanggan</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center mb-6">
              <div className="flex items-center mb-4 md:mb-0 md:mr-8">
                <div className="text-4xl font-bold mr-4">{averageRating}</div>
                <div>
                  <div className="flex items-center mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">Berdasarkan {reviews.length} ulasan</p>
                </div>
              </div>
              <button 
                className="px-4 py-2 border border-black rounded hover:bg-gray-100 transition-colors"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? 'Batal' : 'Tulis Ulasan'}
              </button>
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium mb-4">Tulis Ulasan Anda</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                      >
                        <svg
                          className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 mb-2">
                    Ulasan Anda
                  </label>
                  <textarea
                    id="review-text"
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Bagaimana pengalaman Anda dengan produk ini?"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    required
                  ></textarea>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Foto (Opsional)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-gray-50 file:text-gray-700
                      hover:file:bg-gray-100"
                  />
                  {reviewImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {reviewImages.map((file, index) => (
                        <div key={index} className="relative w-16 h-16">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index}`}
                            className="w-full h-full object-cover rounded border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => setReviewImages(reviewImages.filter((_, i) => i !== index))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                </button>
              </form>
            )}

            {/* Review List */}
            <div className="space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-start mb-3">
                      <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex-shrink-0 flex items-center justify-center text-gray-600">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center mb-1">
                          <h4 className="font-medium mr-2">{review.userName}</h4>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {review.createdAt?.toDate?.().toLocaleDateString('id-ID') || 'Baru saja'}
                        </p>
                        <p className="text-gray-700 mb-2">{review.text}</p>
                        {review.images?.length > 0 && (
                          <div className="flex space-x-2 mt-2">
                            {review.images.map((image, index) => (
                              <img
                                key={index}
                                src={image}
                                alt="Review photo"
                                className="w-16 h-16 object-cover rounded border border-gray-200"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Belum ada ulasan untuk produk ini.</p>
              )}
            </div>

            {reviews.length > 2 && (
              <button className="mt-6 px-4 py-2 border border-black rounded hover:bg-gray-100 transition-colors w-full">
                Lihat Semua Ulasan
              </button>
            )}
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Produk Serupa</h2>
          {relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((relatedProduct) => (
                <div 
                  key={relatedProduct.id} 
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/product/${relatedProduct.id}`)}
                >
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={relatedProduct.photos?.[0] || '/placeholder-product.jpg'}
                      alt={relatedProduct.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{relatedProduct.title}</h3>
                    <p className="text-gray-900 font-semibold">{formatPrice(relatedProduct.price)}</p>
                    {relatedProduct.originalPrice && (
                      <p className="text-sm text-gray-500 line-through">
                        {formatPrice(relatedProduct.originalPrice)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Tidak ada produk serupa ditemukan.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Product;