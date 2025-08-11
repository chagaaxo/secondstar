import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ShopContextProvider from './context/ShopContext.jsx'
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <ShopContextProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </ShopContextProvider>
    </AuthProvider>
  </BrowserRouter>,
)
