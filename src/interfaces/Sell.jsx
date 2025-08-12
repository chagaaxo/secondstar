import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Constants for dropdown options
const CATEGORIES = [
  { value: "Fashion", label: "Fashion" },
  { value: "Electronics", label: "Electronics" },
  { value: "Home & Living", label: "Home & Living" },
  { value: "Beauty", label: "Beauty" },
  { value: "Sports", label: "Sports" },
];

const CONDITIONS = [
  { value: "Baru", label: "Baru" },
  { value: "Seperti Baru", label: "Seperti Baru" },
  { value: "Bekas", label: "Bekas" },
  { value: "Bermasalah", label: "Bermasalah" },
];

const STYLES = [
  { value: "Casual", label: "Casual" },
  { value: "Formal", label: "Formal" },
  { value: "Sporty", label: "Sporty" },
  { value: "Vintage", label: "Vintage" },
  { value: "Streetwear", label: "Streetwear" },
];

const COLORS = [
  { value: "Hitam", label: "Hitam" },
  { value: "Putih", label: "Putih" },
  { value: "Merah", label: "Merah" },
  { value: "Biru", label: "Biru" },
  { value: "Hijau", label: "Hijau" },
  { value: "Kuning", label: "Kuning" },
  { value: "Pink", label: "Pink" },
  { value: "Abu-abu", label: "Abu-abu" },
  { value: "Coklat", label: "Coklat" },
  { value: "Warna-warni", label: "Warna-warni" },
];

const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const IMGBB_API_KEY = "5c0156550435c0408de9ab844fd15e8e"; // Replace with your actual ImgBB API key

const Sell = () => {
  const [product, setProduct] = useState({
    title: "",
    description: "",
    category: "",
    brand: "",
    styles: [],
    condition: "",
    colors: [],
    price: 0,
    photos: [],
    size: "",
    shippingOptions: [],
    location: "",
    negotiable: false,
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  
  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!product.title.trim()) newErrors.title = "Judul produk diperlukan";
    if (!product.description.trim()) newErrors.description = "Deskripsi diperlukan";
    if (!product.category) newErrors.category = "Kategori diperlukan";
    if (!product.condition) newErrors.condition = "Kondisi diperlukan";
    if (product.price <= 0) newErrors.price = "Harga harus lebih dari 0";
    if (product.photos.length < 1) newErrors.photos = "Minimal 1 foto diperlukan";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle image upload to ImgBB
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`File ${file.name} melebihi ukuran maksimal 5MB`);
        return;
      }
      if (!file.type.match("image.*")) {
        alert(`File ${file.name} bukan gambar`);
        return;
      }
    }
    
    // Check if we have space for these files
    if (product.photos.length + files.length > MAX_IMAGES) {
      alert(`Anda hanya dapat mengunggah maksimal ${MAX_IMAGES} foto`);
      return;
    }
    
    setUploadingImages(true);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("image", file);
        
        // Upload to ImgBB
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: "POST",
          body: formData
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error("Gagal mengunggah gambar");
        }
        
        return result.data.url; // Return the image URL
      });
      
      const newPhotoUrls = await Promise.all(uploadPromises);
      
      setProduct(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotoUrls]
      }));
      
    } catch (error) {
      console.error("Error uploading images: ", error);
      alert("Gagal mengunggah gambar");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setProduct(prev => {
      const updatedPhotos = [...prev.photos];
      updatedPhotos.splice(index, 1);
      return {
        ...prev,
        photos: updatedPhotos
      };
    });
  };

  const handleSubmit = async (e, status = "active") => {
    e.preventDefault();
    
    if (status === "active" && !validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      const productData = {
        ...product,
        sellerId: user.uid,
        sellerName: user.displayName || "Anonymous",
        sellerEmail: user.email,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: status,
        views: 0,
        likes: 0,
        // Ensure these fields exist even if empty
        styles: product.styles || [],
        colors: product.colors || [],
        shippingOptions: product.shippingOptions || [],
        negotiable: product.negotiable || false
      };

      await addDoc(collection(db, status === "active" ? "products" : "drafts"), productData);
      
      navigate("/seller-dashboard", { 
        state: { 
          success: status === "active" 
            ? "Produk berhasil ditambahkan!" 
            : "Produk berhasil disimpan sebagai draft!" 
        } 
      });
    } catch (error) {
      console.error("Error adding product: ", error);
      alert(`Gagal ${status === "active" ? "menambahkan" : "menyimpan draft"} produk. Silakan coba lagi.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setProduct(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleMultiSelect = (e, field) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setProduct(prev => ({
      ...prev,
      [field]: options
    }));
  };

  // Set default location if available
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setProduct(prev => ({
            ...prev,
            location: `${position.coords.latitude},${position.coords.longitude}`
          }));
        },
        (error) => {
          console.log("Geolocation error:", error);
        }
      );
    }
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-6">Tambah Produk Baru</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Photo upload section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Foto Produk <span className="text-red-500">*</span></h2>
          {errors.photos && <p className="text-red-500 text-sm mb-2">{errors.photos}</p>}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* Existing photos */}
            {product.photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img 
                  src={photo} 
                  alt={`Produk ${index + 1}`} 
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                  aria-label="Hapus foto"
                >
                  ×
                </button>
              </div>
            ))}
            
            {/* Add more photos button */}
            {product.photos.length < MAX_IMAGES && (
              <div className="relative">
                <input 
                  type="file" 
                  onChange={handleImageUpload}
                  accept="image/*" 
                  className="hidden" 
                  id="image-upload"
                  multiple
                />
                <label 
                  htmlFor="image-upload"
                  className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#8d2629] transition-colors"
                >
                  {uploadingImages ? (
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-[#bd2c30] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span className="text-sm">Mengunggah...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-sm text-center">Tambah Foto<br />({MAX_IMAGES - product.photos.length} tersisa)</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            Unggah {MAX_IMAGES} foto (maksimal {MAX_IMAGE_SIZE / (1024 * 1024)}MB per foto). Foto pertama akan menjadi foto utama.
          </p>
        </div>

        {/* Basic Information */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Informasi Dasar</h2>
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Judul Produk <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="title"
              value={product.title}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg ${errors.title ? "border-red-500" : "border-gray-300"}`}
              placeholder="Contoh: Levi's 576 Baggy Jeans Hitam"
              maxLength="100"
              required
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            <p className="text-xs text-gray-500 mt-1">{product.title.length}/100 karakter</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi <span className="text-red-500">*</span></label>
            <textarea
              name="description"
              value={product.description}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg h-32 ${errors.description ? "border-red-500" : "border-gray-300"}`}
              placeholder="Tuliskan detail barangmu, termasuk kondisi, ukuran, warna, dan minus atau kelebihan."
              maxLength="1000"
              required
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            <p className="text-xs text-gray-500 mt-1">{product.description.length}/1000 karakter</p>
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Detail Produk</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">Kategori <span className="text-red-500">*</span></label>
              <select
                name="category"
                value={product.category}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.category ? "border-red-500" : "border-gray-300"}`}
                required
              >
                <option value="">Pilih Kategori</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium mb-1">Brand/Merek</label>
              <input
                type="text"
                name="brand"
                value={product.brand}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg border-gray-300"
                placeholder="Contoh: Levi's, Nike, Apple"
              />
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium mb-1">Kondisi <span className="text-red-500">*</span></label>
              <select
                name="condition"
                value={product.condition}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg ${errors.condition ? "border-red-500" : "border-gray-300"}`}
                required
              >
                <option value="">Pilih Kondisi</option>
                {CONDITIONS.map(cond => (
                  <option key={cond.value} value={cond.value}>{cond.label}</option>
                ))}
              </select>
              {errors.condition && <p className="text-red-500 text-sm mt-1">{errors.condition}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium mb-1">Harga (Rp) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-3">Rp</span>
                <input
                  type="number"
                  name="price"
                  value={product.price}
                  onChange={handleChange}
                  className={`w-full pl-10 p-3 border rounded-lg ${errors.price ? "border-red-500" : "border-gray-300"}`}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
              
              <div className="mt-2 flex items-center">
                <input
                  type="checkbox"
                  id="negotiable"
                  name="negotiable"
                  checked={product.negotiable}
                  onChange={handleChange}
                  className="mr-2"
                />
                <label htmlFor="negotiable" className="text-sm">Harga bisa nego</label>
              </div>
            </div>

            {/* Styles */}
            <div>
              <label className="block text-sm font-medium mb-1">Style</label>
              <select
                multiple
                onChange={(e) => handleMultiSelect(e, "styles")}
                className="w-full p-3 border rounded-lg border-gray-300"
                value={product.styles}
              >
                {STYLES.map(style => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Gunakan Ctrl/Cmd untuk memilih banyak</p>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-sm font-medium mb-1">Warna</label>
              <select
                multiple
                onChange={(e) => handleMultiSelect(e, "colors")}
                className="w-full p-3 border rounded-lg border-gray-300"
                value={product.colors}
              >
                {COLORS.map(color => (
                  <option key={color.value} value={color.value}>{color.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Gunakan Ctrl/Cmd untuk memilih banyak</p>
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium mb-1">Ukuran</label>
              <input
                type="text"
                name="size"
                value={product.size}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg border-gray-300"
                placeholder="Contoh: XL, 42, 10.5"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-1">Lokasi</label>
              <input
                type="text"
                name="location"
                value={product.location}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg border-gray-300"
                placeholder="Kota atau alamat"
              />
            </div>
          </div>
        </div>

        {/* Shipping Options */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Opsi Pengiriman</h2>
          <div className="space-y-3">
            {['JNE', 'J&T', 'SiCepat', 'GoSend', 'GrabExpress', 'Ambil Sendiri'].map(option => (
              <div key={option} className="flex items-center">
                <input
                  type="checkbox"
                  id={`shipping-${option}`}
                  name="shippingOptions"
                  value={option}
                  checked={product.shippingOptions.includes(option)}
                  onChange={(e) => {
                    const { value, checked } = e.target;
                    setProduct(prev => ({
                      ...prev,
                      shippingOptions: checked 
                        ? [...prev.shippingOptions, value] 
                        : prev.shippingOptions.filter(opt => opt !== value)
                    }));
                  }}
                  className="mr-2"
                />
                <label htmlFor={`shipping-${option}`} className="text-sm">{option}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-8 border-t">
          <button
            type="button"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => {
              if (window.confirm("Apakah Anda yakin ingin membatalkan? Perubahan tidak akan disimpan.")) {
                navigate(-1);
              }
            }}
          >
            Batal
          </button>
          <button
            type="button"
            className={`px-6 py-3 border rounded-lg ${isSubmitting || uploadingImages ? "bg-gray-100 border-gray-300 text-gray-400" : "bg-white border-[#bd2c30] text-[#bd2c30] hover:bg-[#fdf2f2]"} transition-colors`}
            onClick={(e) => handleSubmit(e, "draft")}
            disabled={isSubmitting || uploadingImages}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Draft"}
          </button>
          <button
            type="submit"
            className={`px-6 py-3 rounded-lg text-white ${isSubmitting || uploadingImages ? "bg-gray-400" : "bg-[#bd2c30] hover:bg-[#812023]"} transition-colors`}
            onClick={(e) => handleSubmit(e, "active")}
            disabled={isSubmitting || uploadingImages}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </span>
            ) : "Simpan Produk"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Sell;