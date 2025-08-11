import React, { useState, useEffect, useRef } from "react";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Loader } from "@googlemaps/js-api-loader";
import { useNavigate } from "react-router-dom"; // Added for navigation

const SetAddress = () => {
  const [formData, setFormData] = useState({
    namaPenerima: "",
    nomorTelepon: "",
    alamatLengkap: "",
    detailLainnya: "",
  });
  const [coords, setCoords] = useState(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("");
  
  const searchInputRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const navigate = useNavigate(); // Initialize navigate function

  const db = getFirestore();
  const auth = getAuth();

  // Load user data from Firestore
  useEffect(() => {
    const fetchUser = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            namaPenerima: data.namaPenerima || "",
            nomorTelepon: data.nomorTelepon || "",
            alamatLengkap: data.alamat || "",
            detailLainnya: data.detailLainnya || "",
          });
          if (data.coords) {
            setCoords(data.coords);
            setCurrentAddress(data.alamat || "");
          } else {
            // Default to Jakarta if no coords
            setCoords({ lat: -6.2, lng: 106.816666 });
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUser();
  }, [auth.currentUser, db]);

  // Initialize Google Maps
  useEffect(() => {
    if (!coords) return;

    const initMap = async () => {
      setIsMapLoading(true);
      
      try {
        const loader = new Loader({
          apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
          version: "weekly",
          libraries: ["places"],
        });

        await loader.load();

        // Initialize map
        const map = new window.google.maps.Map(document.getElementById("map"), {
          center: coords,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        // Initialize marker
        const marker = new window.google.maps.Marker({
          position: coords,
          map: map,
          draggable: true,
          title: "Lokasi Pickup",
        });

        // Initialize autocomplete
        const autocomplete = new window.google.maps.places.Autocomplete(
          searchInputRef.current,
          {
            types: ["geocode"],
            componentRestrictions: { country: "id" },
            fields: ["formatted_address", "geometry"],
          }
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setCoords({ lat, lng });
            setFormData(prev => ({
              ...prev,
              alamatLengkap: place.formatted_address,
            }));
            setCurrentAddress(place.formatted_address);
            map.setCenter({ lat, lng });
            marker.setPosition({ lat, lng });
            
            // Reverse geocode to get precise address
            reverseGeocode({ lat, lng });
          }
        });

        marker.addListener("dragend", async (event) => {
          const newLat = event.latLng.lat();
          const newLng = event.latLng.lng();
          setCoords({ lat: newLat, lng: newLng });
          
          // Reverse geocode when marker is dragged
          reverseGeocode({ lat: newLat, lng: newLng });
        });

        mapRef.current = map;
        markerRef.current = marker;
        autocompleteRef.current = autocomplete;

        // Reverse geocode initial coords
        if (currentAddress === "") {
          reverseGeocode(coords);
        }

      } catch (error) {
        console.error("Error initializing Google Maps:", error);
      } finally {
        setIsMapLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current = null;
      }
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [coords?.lat, coords?.lng]);

  const reverseGeocode = async (location) => {
    if (!window.google) return;
    
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location }, (results, status) => {
        if (status === "OK" && results[0]) {
          setCurrentAddress(results[0].formatted_address);
          setFormData(prev => ({
            ...prev,
            alamatLengkap: results[0].formatted_address,
          }));
        }
      });
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(newCoords);
          reverseGeocode(newCoords);
        },
        (error) => {
          console.error("Error getting current location:", error);
          alert("Gagal mendapatkan lokasi saat ini. Pastikan izin lokasi diberikan.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Browser tidak mendukung geolokasi.");
    }
  };

  const handleSave = async () => {
  if (!auth.currentUser || !coords) return;
  
  setIsSaving(true);
  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      namaPenerima: formData.namaPenerima,
      nomorTelepon: formData.nomorTelepon,
      alamat: formData.alamatLengkap,
      detailLainnya: formData.detailLainnya,
      coords,
    });

    setSaveSuccess(true);
    
    // Navigate after showing success message
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 2000);
    
  } catch (error) {
    console.error("Error saving address:", error);
    alert("Gagal menyimpan alamat. Silakan coba lagi.");
  } finally {
    setIsSaving(false);
  }
};

  const isFormValid = () => {
    return (
      formData.namaPenerima.trim() &&
      formData.nomorTelepon.trim() &&
      formData.alamatLengkap.trim() &&
      coords
    );
  };

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Tentukan Alamat Pickup
        </h1>
        <p className="text-gray-600">
          Isi alamat penjemputan untuk memudahkan pengambilan barang
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="namaPenerima" className="block text-sm font-medium text-gray-700 mb-1">
            Nama Penerima
          </label>
          <input
            id="namaPenerima"
            name="namaPenerima"
            type="text"
            placeholder="Nama lengkap penerima"
            value={formData.namaPenerima}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="nomorTelepon" className="block text-sm font-medium text-gray-700 mb-1">
            Nomor Telepon
          </label>
          <input
            id="nomorTelepon"
            name="nomorTelepon"
            type="tel"
            placeholder="Contoh: 081234567890"
            value={formData.nomorTelepon}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="alamat" className="block text-sm font-medium text-gray-700 mb-1">
            Cari Alamat
          </label>
          <div className="relative">
            <input
              id="alamat"
              name="alamat"
              type="text"
              placeholder="Cari alamat (nama jalan/gedung/perumahan)"
              ref={searchInputRef}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent pr-12"
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-black"
              title="Gunakan lokasi saat ini"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Ketik alamat atau klik ikon lokasi untuk menggunakan posisi saat ini
          </p>
        </div>

        <div className="relative rounded-lg overflow-hidden border border-gray-300">
          {isMapLoading ? (
            <div className="h-64 bg-gray-100 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="text-gray-500">Memuat peta...</span>
              </div>
            </div>
          ) : (
            <>
              <div id="map" className="h-64 w-full"></div>
              <div className="absolute bottom-2 left-2 bg-white p-1 rounded shadow-sm">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="p-1 text-gray-700 hover:text-black"
                  title="Gunakan lokasi saat ini"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        <div>
          <label htmlFor="alamatLengkap" className="block text-sm font-medium text-gray-700 mb-1">
            Alamat Lengkap
          </label>
          <textarea
            id="alamatLengkap"
            name="alamatLengkap"
            placeholder="Contoh: Jl. Merdeka No. 123, Perumahan Taman Indah, RT 05/RW 02"
            value={formData.alamatLengkap}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
            rows="3"
          ></textarea>
          <p className="mt-1 text-xs text-gray-500">
            Pastikan alamat lengkap dan jelas termasuk nama gedung/perumahan, nomor rumah, RT/RW jika ada
          </p>
        </div>

        <div>
          <label htmlFor="detailLainnya" className="block text-sm font-medium text-gray-700 mb-1">
            Detail Tambahan (Opsional)
          </label>
          <input
            id="detailLainnya"
            name="detailLainnya"
            type="text"
            placeholder="Contoh: Warna rumah, patokan, kode akses, dll."
            value={formData.detailLainnya}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={!isFormValid() || isSaving}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isFormValid()
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            } ${isSaving ? "opacity-70" : ""}`}
          >
            {isSaving ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </span>
            ) : (
              "Simpan Alamat"
            )}
          </button>
          
          {saveSuccess && (
            <div className="mt-3 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
              Alamat pickup berhasil disimpan! Mengarahkan ke beranda...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetAddress;