import React from 'react'
import { Route, Routes } from 'react-router-dom'

// Context
import { AuthProvider } from './context/AuthContext';

// Interfaces
import Home from './interfaces/Home'
import Collection from './interfaces/Collection'
import About from './interfaces/About'
import Contact from './interfaces/Contact'
import Product from './interfaces/Product'
import Cart from './interfaces/Cart'
import Login from './interfaces/Login'
import Register from './interfaces/Register'
import PlaceOrder from './interfaces/PlaceOrder'
import Orders from './interfaces/Orders'
import SellerDashboard from './interfaces/SellerDashboard'
import SetAddress from './interfaces/SetAddress';
import Sell from './interfaces/Sell';
import Checkout from './interfaces/Checkout';
import Products from './interfaces/Products';
import Messages from './interfaces/Messages';
import Profile from './interfaces/Profile';
import Settings from './interfaces/Settings';
import OrderConfirmation from './interfaces/OrderConfirmation';
import PaymentQRIS from './interfaces/PaymentQRIS';
import PaymentInstructions from './interfaces/PaymentInstructions';
import SellerOrders from './interfaces/SellerOrders';

// Components
import Navbar from './components/Navbar'

const App = () => {
  return (
     <AuthProvider>
      <div className='px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]'>
        <Navbar />
        <Routes>
          <Route path='/' element={<Home/>} />
          <Route path='/collection' element={<Collection/>} />
          <Route path='/about' element={<About/>} />
          <Route path='/contact' element={<Contact/>} />
          <Route path='/product/:productId' element={<Product/>} />
          <Route path='/products' element={<Products/>} />
          <Route path='/cart' element={<Cart/>} />
          <Route path='/login' element={<Login/>} />
          <Route path='/register' element={<Register/>} />
          <Route path='/place-order' element={<PlaceOrder/>} />
          <Route path="/orders" element={<Orders />} />
          <Route path='/seller-dashboard' element={<SellerDashboard/>} />
          <Route path='/setaddress' element={<SetAddress/>} />
          <Route path='/sell' element={<Sell/>} />
          <Route path='/checkout' element={<Checkout/>} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile/:userId?" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/payment-qris" element={<PaymentQRIS />} />
          <Route path="/payment-instructions" element={<PaymentInstructions />} />
          <Route path="/seller-orders" element={<SellerOrders />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App