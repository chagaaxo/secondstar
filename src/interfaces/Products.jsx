import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaFilter, FaTimes, FaStar, FaRegStar, FaShoppingCart } from 'react-icons/fa';

const Products = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchTerm = searchParams.get('search')?.toLowerCase() || '';
  const sellerId = searchParams.get('seller');
  const category = searchParams.get('category');
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [selectedCategories, setSelectedCategories] = useState(category ? [category] : []);
  const [selectedRatings, setSelectedRatings] = useState([]);
  const [sortOption, setSortOption] = useState('newest');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const loadingRef = React.useRef(false);

  const db = getFirestore();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRef = collection(db, 'categories');
        const categoriesSnapshot = await getDocs(categoriesRef);
        const categories = categoriesSnapshot.docs.map(doc => doc.data().name);
        setAvailableCategories(categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, [db]);

  const fetchProducts = useCallback(async (loadMore = false) => {
  if (loadingRef.current) return; // prevent spam requests
  loadingRef.current = true;

  if (!loadMore) {
    setLoading(true);
    setHasMore(true);
    setProducts([]);
    setLastVisible(null);
  }
  
  try {
    const productsRef = collection(db, 'products');
    let baseQuery = query(productsRef, where('status', '==', 'active'));

    if (sellerId) {
      baseQuery = query(baseQuery, where('sellerId', '==', sellerId));
    }
    if (selectedCategories.length > 0) {
      baseQuery = query(baseQuery, where('category', 'in', selectedCategories));
    }
    if (selectedRatings.length > 0) {
      baseQuery = query(baseQuery, where('averageRating', 'in', selectedRatings));
    }
    if (priceRange[0] > 0 || priceRange[1] < 1000000) {
      baseQuery = query(
        baseQuery,
        where('price', '>=', priceRange[0]),
        where('price', '<=', priceRange[1])
      );
    }

    let orderField = 'createdAt';
    let orderDirection = 'desc';
    switch (sortOption) {
      case 'oldest': orderDirection = 'asc'; break;
      case 'price-low': orderField = 'price'; orderDirection = 'asc'; break;
      case 'price-high': orderField = 'price'; orderDirection = 'desc'; break;
      case 'rating': orderField = 'averageRating'; orderDirection = 'desc'; break;
      case 'popular': orderField = 'viewCount'; orderDirection = 'desc'; break;
      default: break;
    }

    let productsQuery = query(
      baseQuery,
      orderBy(orderField, orderDirection),
      limit(loadMore ? 10 : 20)
    );

    if (loadMore && lastVisible) {
      productsQuery = query(productsQuery, startAfter(lastVisible));
    }

    const querySnapshot = await getDocs(productsQuery);

    if (querySnapshot.docs.length > 0) {
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    } else {
      setHasMore(false);
    }

    const newProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    setProducts(prev => loadMore ? [...prev, ...newProducts] : newProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    toast.error('Failed to load products');
  } finally {
    setLoading(false);
    loadingRef.current = false;
  }
}, [db, searchTerm, sellerId, selectedCategories, selectedRatings, priceRange, sortOption]);

// Run only when filters/search change (NOT when lastVisible changes)
useEffect(() => {
  fetchProducts();
}, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const loadMoreProducts = async () => {
    if (!hasMore) return;
    await fetchProducts(true);
  };

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const handleRatingToggle = (rating) => {
    setSelectedRatings(prev => 
      prev.includes(rating) 
        ? prev.filter(r => r !== rating) 
        : [...prev, rating]
    );
  };

  const handlePriceChange = (min, max) => {
    setPriceRange([min, max]);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedRatings([]);
    setPriceRange([0, 1000000]);
    setSortOption('newest');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400 inline" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStar key={i} className="text-yellow-400 inline" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-yellow-400 inline" />);
      }
    }
    return stars;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Helmet>
        <title>
          {sellerId ? 'Seller Products' : 
           selectedCategories.length > 0 ? `${selectedCategories.join(', ')} Products` : 
           searchTerm ? `Search: ${searchTerm}` : 'All Products'}
        </title>
      </Helmet>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Desktop Filters */}
        <div className={`hidden md:block w-64 flex-shrink-0 ${showFilters ? '' : 'hidden'}`}>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 sticky top-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Filters</h3>
              <button 
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            {/*<div className="mb-6">
              <h4 className="font-medium mb-2">Categories</h4>
              <div className="space-y-2">
                {availableCategories.map(cat => (
                  <div key={cat} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`cat-${cat}`}
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleCategoryToggle(cat)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`cat-${cat}`} className="ml-2 text-sm text-gray-700">
                      {cat}
                    </label>
                  </div>
                ))}
              </div>
            </div>*/}
            
            <div className="mb-6">
              <h4 className="font-medium mb-2">Rating</h4>
              <div className="space-y-2">
                {[4, 3, 2, 1].map(rating => (
                  <div key={rating} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`rating-${rating}`}
                      checked={selectedRatings.includes(rating)}
                      onChange={() => handleRatingToggle(rating)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`rating-${rating}`} className="ml-2 text-sm text-gray-700 flex items-center">
                      {renderRatingStars(rating)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="font-medium mb-2">Price Range</h4>
              <div className="px-2">
                <input
                  type="range"
                  min="0"
                  max="1000000"
                  step="10000"
                  value={priceRange[0]}
                  onChange={(e) => handlePriceChange(parseInt(e.target.value), priceRange[1])}
                  className="w-full mb-2"
                />
                <input
                  type="range"
                  min="0"
                  max="1000000"
                  step="10000"
                  value={priceRange[1]}
                  onChange={(e) => handlePriceChange(priceRange[0], parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-sm">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={resetFilters}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Mobile Filters */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto md:hidden">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsMobileFilterOpen(false)}></div>
              </div>
              
              <div className="inline-block align-bottom bg-white rounded-t-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Product Filters</h3>
                  <button onClick={() => setIsMobileFilterOpen(false)}>
                    <FaTimes className="text-gray-500" />
                  </button>
                </div>
                
                {/*<div className="mb-6">
                  <h4 className="font-medium mb-2">Categories</h4>
                  <div className="space-y-2">
                    {availableCategories.map(cat => (
                      <div key={cat} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`mob-cat-${cat}`}
                          checked={selectedCategories.includes(cat)}
                          onChange={() => handleCategoryToggle(cat)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`mob-cat-${cat}`} className="ml-2 text-sm text-gray-700">
                          {cat}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>*/}
                
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Rating</h4>
                  <div className="space-y-2">
                    {[4, 3, 2, 1].map(rating => (
                      <div key={rating} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`mob-rating-${rating}`}
                          checked={selectedRatings.includes(rating)}
                          onChange={() => handleRatingToggle(rating)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`mob-rating-${rating}`} className="ml-2 text-sm text-gray-700 flex items-center">
                          {renderRatingStars(rating)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Price Range</h4>
                  <div className="px-2">
                    <input
                      type="range"
                      min="0"
                      max="1000000"
                      step="10000"
                      value={priceRange[0]}
                      onChange={(e) => handlePriceChange(parseInt(e.target.value), priceRange[1])}
                      className="w-full mb-2"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000000"
                      step="10000"
                      value={priceRange[1]}
                      onChange={(e) => handlePriceChange(priceRange[0], parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-2 text-sm">
                      <span>{formatPrice(priceRange[0])}</span>
                      <span>{formatPrice(priceRange[1])}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                    onClick={() => setIsMobileFilterOpen(false)}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">
              {sellerId ? 'Seller Products' : 
               selectedCategories.length > 0 ? `Category: ${selectedCategories.join(', ')}` : 
               searchTerm ? `Search Results: "${searchTerm}"` : 'All Products'}
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="md:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
              >
                <FaFilter /> Filters
              </button>
              
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rating</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>

          {/* Active filters */}
          {(selectedCategories.length > 0 || selectedRatings.length > 0 || priceRange[0] > 0 || priceRange[1] < 1000000) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCategories.map(category => (
                <div key={category} className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm">
                  <span>Category: {category}</span>
                  <button 
                    onClick={() => handleCategoryToggle(category)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
              
              {selectedRatings.map(rating => (
                <div key={rating} className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm">
                  <span>Rating: {rating}+</span>
                  <button 
                    onClick={() => handleRatingToggle(rating)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
              
              {(priceRange[0] > 0 || priceRange[1] < 1000000) && (
                <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm">
                  <span>Price: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}</span>
                  <button 
                    onClick={() => setPriceRange([0, 1000000])}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              )}
              
              <button 
                onClick={resetFilters}
                className="text-blue-500 text-sm hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="border rounded-lg p-3 bg-white">
                  <div className="w-full aspect-square bg-gray-200 animate-pulse rounded-md mb-2"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2 mt-2"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
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
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No products found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try different keywords or adjust filters' : 'Please check back later'}
              </p>
              <div className="mt-6">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.map((product) => (
                  <motion.div 
                    key={product.id} 
                    className="border rounded-lg p-3 hover:shadow-md transition-all bg-white cursor-pointer flex flex-col"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/product/${product.id}`)}
                    layout
                  >
                    <div className="relative w-full aspect-square mb-2 overflow-hidden rounded-md">
                      <img
                        src={product.photos?.[0] || '/placeholder-product.jpg'}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder-product.jpg';
                        }}
                      />
                      
                      {product.discount && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {product.discount}%
                        </div>
                      )}

                      {product.averageRating > 0 && (
                        <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded-full flex items-center text-xs">
                          {renderRatingStars(product.averageRating)}
                          <span className="ml-1 text-gray-700">{product.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    
                    <h2 className="text-sm font-semibold line-clamp-2 mb-1 flex-grow">
                      {product.title}
                    </h2>
                    
                    {product.sellerId && sellers[product.sellerId] && (
                      <div 
                        className="flex items-center mt-1 mb-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/products?seller=${product.sellerId}`);
                        }}
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-200 mr-1 overflow-hidden">
                          {sellers[product.sellerId].photoURL ? (
                            <img 
                              src={sellers[product.sellerId].photoURL} 
                              alt={sellers[product.sellerId].name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                              {sellers[product.sellerId].name?.charAt(0) || 'S'}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 truncate">
                          {sellers[product.sellerId].name || 'Seller'}
                        </span>
                      </div>
                    )}
                    
                    <div className="mt-auto">
                      <p className="text-[#bd2c30] text-sm font-bold">
                        {formatPrice(product.price)}
                      </p>
                      {product.originalPrice && (
                        <p className="text-xs text-gray-500 line-through">
                          {formatPrice(product.originalPrice)}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={loadMoreProducts}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;