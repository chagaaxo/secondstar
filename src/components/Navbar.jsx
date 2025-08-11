import React, { useContext, useState, useEffect } from 'react';
import { assets } from '../assets/assets';
import { NavLink } from 'react-router-dom';
import AuthModal from './AuthModal';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CartContext } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Navbar = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [search, setSearch] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isHoveringProfile, setIsHoveringProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { isLoggedIn, user, login, logout } = useAuth();
  const { cartCount, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      logout();
      clearCart();
      setShowMobileMenu(false);
      setIsHoveringProfile(false);
      
      toast.success('You have been logged out successfully', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !isLoggedIn) return;

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', currentUser.uid),
      where('seen', '==', false),
      where('senderId', '!=', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [currentUser, db, isLoggedIn]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const handleSearchButtonClick = () => {
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const mobileMenuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    }
  };

  const dropdownVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  const scaleUp = {
    hover: { scale: 1.05 },
    tap: { scale: 0.98 }
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <>
      <div className="flex flex-col sticky top-0 z-50 bg-white shadow-sm">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-3 px-4 md:px-6 lg:px-8">
          {/* Mobile Menu Button */}
          <motion.button 
            className="md:hidden mr-2 text-gray-700"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <i className={`fa-solid ${showMobileMenu ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
          </motion.button>

          {/* Logo */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <NavLink to="/" className="flex-shrink-0">
              <img src={assets.logo} alt="logo" className="h-8 md:h-10" />
            </NavLink>
          </motion.div>

          {/* Search Bar - Hidden on mobile when menu is open */}
          {!showMobileMenu && (
            <motion.div 
              className="hidden sm:flex flex-1 max-w-xl mx-4 md:mx-6 lg:mx-8"
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <div className="flex items-center bg-gray-100 rounded-lg px-3 w-full focus-within:ring-2 focus-within:ring-[#bd2c30] focus-within:bg-white transition-all duration-200">
                <i className="fa-solid fa-search text-gray-500"></i>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearch}
                  className="bg-transparent outline-none px-2 py-2 w-full text-sm md:text-base transition-all duration-200"
                />
                {search && (
                  <div className="flex items-center">
                    <motion.button 
                      onClick={() => setSearch('')}
                      className="text-gray-400 hover:text-gray-600 mr-1"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </motion.button>
                    <motion.button
                      onClick={handleSearchButtonClick}
                      className="text-[#bd2c30] hover:text-[#88181c]"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <i className="fa-solid fa-arrow-right"></i>
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Right side - changes based on login state */}
          <div className="flex items-center space-x-2 sm:space-x-4 ml-auto">
            {!isLoggedIn ? (
              <>
                <motion.button
                  onClick={() => {
                    setAuthView('login');
                    setShowAuth(true);
                  }}
                  className="hidden sm:block px-3 py-1.5 md:px-4 md:py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-200 text-sm md:text-base"
                  whileHover={{ y: -1, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                  whileTap={{ y: 1 }}
                >
                  Login
                </motion.button>
                <motion.button
                  onClick={() => {
                    setAuthView('register');
                    setShowAuth(true);
                  }}
                  className="hidden sm:block px-3 py-1.5 md:px-4 md:py-2 bg-[#bd2c30] text-white rounded-lg hover:bg-[#88181c] transition-all duration-200 text-sm md:text-base"
                  whileHover={{ y: -1, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                  whileTap={{ y: 1 }}
                >
                  Register
                </motion.button>
              </>
            ) : (
              <>
                <motion.div whileHover={{ y: -1 }}>
                  <NavLink 
                    to="/seller-dashboard" 
                    className="hidden md:block font-medium hover:underline text-sm lg:text-base"
                    activeClassName="text-[#bd2c30]"
                  >
                    Sell
                  </NavLink>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <NavLink to="/messages" className="p-1.5 md:p-2 text-gray-700 hover:text-[#bd2c30] relative">
                    <i className="fa-regular fa-envelope text-lg"></i>
                    {unreadCount > 0 && (
                      <motion.span 
                        className="absolute -top-1 -right-1 bg-[#bd2c30] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        key={unreadCount}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </NavLink>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <NavLink to="/cart" className="p-1.5 md:p-2 text-gray-700 hover:text-[#bd2c30] relative">
                    <i className="fa-solid fa-cart-shopping"></i>
                    {cartCount > 0 && (
                      <motion.span 
                        className="absolute -top-1 -right-1 bg-[#bd2c30] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        key={cartCount}
                      >
                        {cartCount > 9 ? '9+' : cartCount}
                      </motion.span>
                    )}
                  </NavLink>
                </motion.div>
                
                <div 
                  className="relative group"
                  onMouseEnter={() => setIsHoveringProfile(true)}
                  onMouseLeave={() => setIsHoveringProfile(false)}
                >
                  <motion.img
                    src={user?.photoURL || assets.userAvatar}
                    alt="Profile"
                    className="w-8 h-8 rounded-full cursor-pointer border border-gray-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  />
                  
                  <AnimatePresence>
                    {isHoveringProfile && (
                      <motion.div
                        className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg w-56 z-50 overflow-hidden"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={dropdownVariants}
                      >
                        <div className="flex items-center gap-3 px-4 py-3 border-b">
                          <motion.img
                            src={user?.photoURL || assets.userAvatar}
                            alt="Profile"
                            className="w-10 h-10 rounded-full"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring" }}
                          />
                          <div>
                            <div className="font-semibold text-sm">{user?.displayName || "User"}</div>
                            <NavLink 
                              to="/profile" 
                              className="text-xs text-gray-500 cursor-pointer hover:underline"
                              whileHover={{ x: 2 }}
                            >
                              View profile
                            </NavLink>
                          </div>
                        </div>
                        <NavLink to="/orders" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm transition-colors duration-150">
                          <i className="fa-solid fa-receipt w-5 text-gray-600"></i>
                          My Orders
                        </NavLink>
                        <NavLink to="/settings" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm transition-colors duration-150">
                          <i className="fa-solid fa-gear w-5 text-gray-600"></i>
                          Settings
                        </NavLink>
                        <motion.button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 text-sm transition-colors duration-150"
                          whileHover={{ x: 2 }}
                          whileTap={{ x: -2 }}
                          disabled={isLoggingOut}
                        >
                          <i className="fa-solid fa-arrow-right-from-bracket w-5 text-gray-600"></i>
                          {isLoggingOut ? 'Logging out...' : 'Log out'}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Search Bar - Only shown on small screens when menu is closed */}
        {!showMobileMenu && (
          <motion.div 
            className="sm:hidden flex items-center justify-center py-2 bg-white px-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center bg-gray-100 rounded-lg px-3 w-full focus-within:ring-2 focus-within:ring-[#bd2c30] focus-within:bg-white transition-all duration-200">
              <i className="fa-solid fa-search text-gray-500"></i>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearch}
                className="bg-transparent outline-none px-2 py-2 w-full text-sm"
              />
              {search && (
                <div className="flex items-center">
                  <motion.button 
                    onClick={() => setSearch('')}
                    className="text-gray-400 hover:text-gray-600 mr-1"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </motion.button>
                  <motion.button
                    onClick={handleSearchButtonClick}
                    className="text-[#bd2c30] hover:text-[#88181c]"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <i className="fa-solid fa-arrow-right"></i>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Mobile Menu - Only shown on small screens when toggled */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div 
              className="md:hidden bg-white py-2 px-4 shadow-inner overflow-hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={mobileMenuVariants}
            >
              <div className="flex flex-col space-y-3">
                {!isLoggedIn ? (
                  <div className="flex space-x-2">
                    <motion.button
                      onClick={() => {
                        setAuthView('login');
                        setShowAuth(true);
                        setShowMobileMenu(false);
                      }}
                      className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-200 text-sm"
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 1 }}
                    >
                      Login
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setAuthView('register');
                        setShowAuth(true);
                        setShowMobileMenu(false);
                      }}
                      className="flex-1 px-3 py-2 bg-[#bd2c30] text-white rounded-lg hover:bg-[#88181c] transition-all duration-200 text-sm"
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 1 }}
                    >
                      Register
                    </motion.button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <motion.div whileHover={{ x: 2 }}>
                      <NavLink 
                        to="/seller-dashboard" 
                        onClick={() => setShowMobileMenu(false)}
                        className="px-3 py-2 font-medium hover:bg-gray-100 rounded-lg text-sm"
                      >
                        Sell
                      </NavLink>
                    </motion.div>
                    <div className="flex space-x-2">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <NavLink 
                          to="/messages" 
                          onClick={() => setShowMobileMenu(false)}
                          className="flex-1 px-3 py-2 text-center bg-gray-100 rounded-lg hover:bg-gray-200 text-sm relative"
                        >
                          <i className="fa-regular fa-envelope mr-2"></i>
                          Messages
                          {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 bg-[#bd2c30] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </NavLink>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <NavLink 
                          to="/cart" 
                          onClick={() => setShowMobileMenu(false)}
                          className="flex-1 px-3 py-2 text-center bg-gray-100 rounded-lg hover:bg-gray-200 text-sm relative"
                        >
                          <i className="fa-solid fa-cart-shopping mr-2"></i>
                          Cart
                          {cartCount > 0 && (
                            <span className="absolute top-1 right-1 bg-[#bd2c30] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                              {cartCount > 9 ? '9+' : cartCount}
                            </span>
                          )}
                        </NavLink>
                      </motion.div>
                    </div>
                    <div className="border-t pt-2">
                      <motion.div whileHover={{ x: 2 }}>
                        <NavLink 
                          to="/orders" 
                          onClick={() => setShowMobileMenu(false)}
                          className="flex items-center px-3 py-2 hover:bg-gray-100 rounded-lg text-sm"
                        >
                          <i className="fa-solid fa-receipt w-5 text-gray-600 mr-2"></i>
                          My Orders
                        </NavLink>
                      </motion.div>
                      <motion.div whileHover={{ x: 2 }}>
                        <NavLink 
                          to="/settings" 
                          onClick={() => setShowMobileMenu(false)}
                          className="flex items-center px-3 py-2 hover:bg-gray-100 rounded-lg text-sm"
                        >
                          <i className="fa-solid fa-gear w-5 text-gray-600 mr-2"></i>
                          Settings
                        </NavLink>
                      </motion.div>
                      <motion.button
                        onClick={() => {
                          handleLogout();
                          setShowMobileMenu(false);
                        }}
                        className="flex items-center w-full px-3 py-2 hover:bg-gray-100 rounded-lg text-sm text-left"
                        whileHover={{ x: 2 }}
                        whileTap={{ x: -2 }}
                        disabled={isLoggingOut}
                      >
                        <i className="fa-solid fa-arrow-right-from-bracket w-5 text-gray-600 mr-2"></i>
                        {isLoggingOut ? 'Logging out...' : 'Log out'}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          initialView={authView}
          onClose={() => setShowAuth(false)}
          onLoginSuccess={(userData) => {
            login(userData);
            setShowAuth(false);
          }}
        />
      )}
    </>
  );
};

export default Navbar;