import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getFirestore,
  collection,
  query,
  where,
  addDoc,
  orderBy,
  serverTimestamp,
  onSnapshot,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-toastify';
import { HiOutlineMail, HiOutlineUser, HiOutlinePaperClip, HiOutlineEmojiHappy } from 'react-icons/hi';
import { FiSearch, FiMenu, FiX } from 'react-icons/fi';
import { BsCheck2All, BsCheck2, BsThreeDotsVertical } from 'react-icons/bs';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import EmojiPicker from 'emoji-picker-react';
import { useMediaQuery } from 'react-responsive';

const Messages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const sellerId = searchParams.get('sellerId');
  const productId = searchParams.get('productId');
  const auth = getAuth();
  const db = getFirestore();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userCache, setUserCache] = useState({});
  const [productCache, setProductCache] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const currentUser = auth.currentUser;

  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-hide sidebar on mobile when conversation is selected
  useEffect(() => {
    if (isMobile && sellerId) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
  }, [isMobile, sellerId]);

  // Fetch user data with caching
  const getUserData = useCallback(async (userId) => {
    if (!userId) return { id: 'unknown', name: 'Unknown User' };
    if (userCache[userId]) return userCache[userId];
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() };
        setUserCache(prev => ({ ...prev, [userId]: userData }));
        return userData;
      }
      return { id: userId, name: 'Unknown User' };
    } catch (error) {
      console.error('Error fetching user:', error);
      return { id: userId, name: 'Error loading user' };
    }
  }, [db, userCache]);

  // Fetch product data with caching
  const getProductData = useCallback(async (productId) => {
    if (!productId) return { id: 'unknown', title: 'Unknown Product' };
    if (productCache[productId]) return productCache[productId];
    
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        const productData = { id: productDoc.id, ...productDoc.data() };
        setProductCache(prev => ({ ...prev, [productId]: productData }));
        return productData;
      }
      return { id: productId, title: 'Unknown Product' };
    } catch (error) {
      console.error('Error fetching product:', error);
      return { id: productId, title: 'Error loading product' };
    }
  }, [db, productCache]);

  // Auto-scroll to bottom with debounce
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // Calculate unread messages count
  const calculateUnreadCounts = useCallback((conversations) => {
    const counts = {};
    conversations.forEach(conv => {
      if (!conv.seen && conv.senderId !== currentUser?.uid) {
        counts[conv.otherUser] = (counts[conv.otherUser] || 0) + 1;
      }
    });
    setUnreadCounts(counts);
  }, [currentUser]);

  // Fetch conversation list in real-time with user data
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const convMap = {};
      const promises = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const otherUser = data.senderId === currentUser.uid ? data.receiverId : data.senderId;

        if (!convMap[otherUser] || data.createdAt?.toMillis() > convMap[otherUser].lastTime) {
          convMap[otherUser] = {
            id: doc.id,
            otherUser,
            lastMessage: data.text || 'Pesan kosong',
            lastTime: data.createdAt?.toMillis() || 0,
            productId: data.productId,
            seen: data.seen || false,
            senderId: data.senderId
          };
        }
      });

      // Fetch user data for all conversations
      for (const userId in convMap) {
        promises.push(getUserData(userId));
      }

      await Promise.all(promises);

      const convList = Object.values(convMap).sort((a, b) => b.lastTime - a.lastTime);
      setConversations(convList);
      calculateUnreadCounts(convList);
    });

    return () => unsub();
  }, [currentUser, db, getUserData, calculateUnreadCounts]);

  // Fetch messages in real-time for selected conversation
  useEffect(() => {
    if (!sellerId || !productId || !currentUser) {
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    const q = query(
      collection(db, 'messages'),
      where('productId', '==', productId),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const filtered = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (msg) =>
            (msg.senderId === currentUser.uid && msg.receiverId === sellerId) ||
            (msg.senderId === sellerId && msg.receiverId === currentUser.uid)
        );

      // Mark messages as seen
      const lastMessage = filtered[filtered.length - 1];
      if (lastMessage && lastMessage.senderId !== currentUser.uid && !lastMessage.seen) {
        try {
          await updateDoc(doc(db, 'messages', lastMessage.id), {
            seen: true,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error marking message as seen:', error);
        }
      }

      setMessages(filtered);
      setLoadingMessages(false);
    });

    return () => unsub();
  }, [sellerId, productId, currentUser, db]);

  // Simulate typing indicator
  useEffect(() => {
    if (!sellerId) return;
    
    const timer = setTimeout(() => {
      setIsTyping(Math.random() > 0.7);
    }, 3000);

    return () => clearTimeout(timer);
  }, [sellerId, messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        receiverId: sellerId,
        participants: [currentUser.uid, sellerId],
        productId,
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        seen: false
      });

      setNewMessage('');
      setShowEmojiPicker(false);
      inputRef.current.focus();
    } catch (error) {
      toast.error('Gagal mengirim pesan');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    inputRef.current.focus();
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const user = userCache[conv.otherUser] || {};
    return (
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const toggleDropdown = (conversationId) => {
    setActiveDropdown(activeDropdown === conversationId ? null : conversationId);
  };

  const handleBackToConversations = () => {
    setSearchParams({});
    if (isMobile) {
      setShowSidebar(true);
    }
  };

  const handleConversationSelect = (otherUser, productId) => {
    navigate(`/messages?sellerId=${otherUser}&productId=${productId}`);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 relative">
      {/* Mobile header */}
      {isMobile && !showSidebar && (
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-10 p-3 border-b border-gray-200 flex items-center">
          <button 
            onClick={() => setShowSidebar(true)}
            className="p-2 mr-2 text-gray-600 rounded-full hover:bg-gray-100"
          >
            <FiMenu className="text-xl" />
          </button>
          <div className="flex items-center">
            {userCache[sellerId]?.photoURL ? (
              <img 
                src={userCache[sellerId].photoURL} 
                alt={userCache[sellerId].name}
                className="w-8 h-8 rounded-full object-cover mr-2"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                <HiOutlineUser className="text-gray-400" />
              </div>
            )}
            <h3 className="font-medium text-sm">
              {userCache[sellerId]?.name || sellerId}
            </h3>
          </div>
        </div>
      )}

      {/* Left Sidebar */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 flex-col bg-white h-full absolute md:relative z-20 md:z-0`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Pesan</h2>
          {isMobile && (
            <button 
              onClick={() => setShowSidebar(false)}
              className="p-1 text-gray-600 rounded-full hover:bg-gray-100"
            >
              <FiX className="text-xl" />
            </button>
          )}
        </div>
        
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Cari percakapan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#bd2c30] text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <HiOutlineMail className="text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500">Belum ada percakapan</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors relative ${
                    conv.otherUser === sellerId ? 'bg-blue-50' : ''
                  } ${!conv.seen && conv.senderId !== currentUser?.uid ? 'font-semibold' : ''}`}
                  onClick={() => handleConversationSelect(conv.otherUser, conv.productId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 relative">
                      {userCache[conv.otherUser]?.photoURL ? (
                        <img 
                          src={userCache[conv.otherUser].photoURL} 
                          alt={userCache[conv.otherUser].name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <HiOutlineUser className="text-gray-400" />
                        </div>
                      )}
                      {unreadCounts[conv.otherUser] > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCounts[conv.otherUser]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-sm truncate">
                          {userCache[conv.otherUser]?.name || conv.otherUser}
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {conv.lastTime ? formatDistanceToNow(new Date(conv.lastTime), {
                            addSuffix: true,
                            locale: id
                          }) : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {conv.senderId === currentUser?.uid ? 'Anda: ' : ''}
                          {conv.lastMessage}
                        </p>
                        {conv.senderId === currentUser?.uid && (
                          <span className="text-xs ml-2">
                            {conv.seen ? (
                              <BsCheck2All className="text-[#bd2c30]" />
                            ) : (
                              <BsCheck2 className="text-gray-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(conv.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      <BsThreeDotsVertical />
                    </button>
                  </div>
                  {activeDropdown === conv.id && (
                    <div className="absolute right-2 top-12 bg-white shadow-lg rounded-md py-1 z-10 border border-gray-200">
                      <button 
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add delete conversation functionality here
                          setActiveDropdown(null);
                        }}
                      >
                        Hapus Percakapan
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content */}
      <div className={`${!showSidebar || !isMobile ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-gray-50 h-full`}>
        {!sellerId ? (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center p-6 max-w-md">
              <HiOutlineMail className="mx-auto text-5xl text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Selamat datang di Pesan</h2>
              <p className="text-gray-500 mb-6">
                Pilih percakapan untuk mulai mengobrol atau mulai percakapan baru dengan penjual
              </p>
              {isMobile && (
                <button 
                  onClick={() => setShowSidebar(true)}
                  className="px-4 py-2 bg-[#bd2c30] text-white rounded-lg hover:bg-[#722022] transition-colors"
                >
                  Lihat Percakapan
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="border-b border-gray-200 p-3 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center">
                {isMobile && (
                  <button 
                    onClick={handleBackToConversations}
                    className="p-2 mr-1 text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <FiX className="text-xl" />
                  </button>
                )}
                {userCache[sellerId]?.photoURL ? (
                  <img 
                    src={userCache[sellerId].photoURL} 
                    alt={userCache[sellerId].name}
                    className="w-10 h-10 rounded-full object-cover mr-3"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    <HiOutlineUser className="text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium">
                    {userCache[sellerId]?.name || sellerId}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isTyping ? 'Sedang mengetik...' : 'Online'}
                  </p>
                </div>
              </div>
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                <BsThreeDotsVertical />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50" style={{ paddingTop: isMobile ? '60px' : '0' }}>
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-pulse text-gray-500">Memuat pesan...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <HiOutlineMail className="text-4xl text-gray-300 mb-3" />
                  <p className="text-gray-500">Belum ada pesan</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Mulai percakapan dengan mengirim pesan pertama
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-3 flex ${
                      msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${
                        msg.senderId === currentUser?.uid
                          ? 'bg-[#929292] text-white rounded-tr-none'
                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                      }`}
                    >
                      <p className="break-words">{msg.text || <i className="text-gray-400">Pesan kosong</i>}</p>
                      <div className="flex justify-end items-center mt-1">
                        <small className={`text-xs opacity-75 mr-1 ${
                          msg.senderId === currentUser?.uid ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {msg.createdAt?.toDate
                            ? formatDistanceToNow(msg.createdAt.toDate(), {
                                addSuffix: true,
                                locale: id
                              })
                            : ''}
                        </small>
                        {msg.senderId === currentUser?.uid && (
                          <span className="text-xs">
                            {msg.seen ? (
                              <BsCheck2All className="text-white opacity-80" />
                            ) : (
                              <BsCheck2 className="text-white opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isTyping && sellerId && (
                <div className="mb-3 flex justify-start">
                  <div className="bg-white text-gray-800 px-4 py-2 rounded-lg rounded-tl-none border border-gray-200 shadow">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-gray-200 bg-white sticky bottom-0"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <HiOutlineEmojiHappy className="text-xl" />
                </button>
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute bottom-16 left-4 z-50">
                    <EmojiPicker 
                      onEmojiClick={handleEmojiClick}
                      width={300}
                      height={350}
                      searchDisabled
                      skinTonesDisabled
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                >
                  <HiOutlinePaperClip className="text-xl" />
                </button>
                <input
                  type="text"
                  ref={inputRef}
                  placeholder="Tulis pesan..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ebebeb] focus:border-transparent text-sm"
                  disabled={sending}
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#bd2c30] text-white rounded-full hover:bg-[#722022] transition-colors disabled:opacity-50 text-sm"
                  disabled={sending || !newMessage.trim()}
                >
                  {sending ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Messages;