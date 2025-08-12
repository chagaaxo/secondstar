# 👕 Second STAR — Thrift Clothing Store Website

Second STAR is a modern, responsive web application for a thrift clothing store.  
Built with **Vite + React**, powered by **Firebase** for authentication & database storage,  
and enhanced with **Google Maps JavaScript API** for location-based features.

---

## ✨ Features

- 🛍 **Product Listings** — Browse a curated selection of thrift clothing items.
- 🔍 **Search & Filter** — Easily find products by name, category, or size.
- 📦 **Product Details Page** — View item descriptions, prices, and seller info.
- 💬 **Messaging System** — Contact sellers directly via in-app chat (Firestore).
- 📍 **Store Locator** — Interactive Google Map to find store locations & drop-off points.
- 🔐 **Secure Authentication** — User sign-up, login, and profile management with Firebase Auth.
- 🗄 **Realtime Database** — Firestore for storing products, messages, and user profiles.
- 📱 **Responsive Design** — Works seamlessly on desktop, tablet, and mobile.

---

## 🛠 Tech Stack

- **Frontend:** [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- **Backend/Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Authentication:** [Firebase Auth](https://firebase.google.com/docs/auth)
- **Maps & Location:** [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- **Styling:** Tailwind CSS

---

## ⚙️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/chagaaxo/secondstar.git
   cd secondstar

2. **Install dependencies**
   ```bash
   npm install

3. **Setup firebase inside firebase.js**
   ```bash
   apiKey: "your_firebase_api_key",
   authDomain: "your_firebase_auth_domain",
   projectId: "your_firebase_project_id",
   storageBucket: "your_firebase_storage_bucket",
   messagingSenderId: "your_firebase_messaging_sender_id",
   appId: "your_firebase_app_id",

4. **Run the development serverv**
   ```bash
   npm run dev

5. **Build for production**
   ```bash
   npm run build

---

## 🔑 Firebase Setup

1. Go to Firebase Console.
2. Create a new project (e.g., secondstar).
3. Enable:
     - Authentication (Email/Password, Google, etc.)
     - Firestore Database
     - Firebase Hosting (optional)
Copy your Firebase config and paste into firebase.js

---

## 🗺 Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create an API key for Google Maps JavaScript API.
3. Enable billing (required by Google Maps).
4. Restrict your key to your domain for security.
5. Add it to your .env as VITE_GOOGLE_MAPS_API_KEY.

---

## 📜 License
This project is licensed under the MIT License — you are free to use, modify, and distribute.

---

## 💌 Acknowledgements
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [Firebase](https://firebase.google.com/)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Tailwind CSS](https://tailwindcss.com/)
