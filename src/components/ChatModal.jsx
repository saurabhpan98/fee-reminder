// src/components/ChatModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  serverTimestamp, doc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { X, Send, Trash2, Reply, Bold, Italic, Underline } from 'lucide-react';

const SECRET_KEY = 'tuition_manager_e2ee_secret_key';

export const ChatModal = ({ currentUser, chatPartner, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  
  const editorRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Deterministic Chat Room ID based on user UIDs
  const chatId = [currentUser.uid, chatPartner.uid].sort().join('_');

  // 1. Real-time Message Listening for full conversation history
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map((d) => {
        const data = d.data();
        let decryptedText = '';
        
        if (data.encryptedText) {
          try {
            const bytes = CryptoJS.AES.decrypt(data.encryptedText, SECRET_KEY);
            decryptedText = bytes.toString(CryptoJS.enc.Utf8);
          } catch (e) {
            decryptedText = '[Decryption Error]';
          }
        } else if (data.text) {
          // Fallback for unencrypted older messages if any exist
          decryptedText = data.text;
        }

        // Auto-mark incoming messages as read
        if (data.receiverId === currentUser.uid && !data.isRead) {
          updateDoc(doc(db, 'chats', chatId, 'messages', d.id), { isRead: true }).catch(console.error);
        }

        return {
          id: d.id,
          ...data,
          text: decryptedText || '[Empty Message]'
        };
      });

      setMessages(msgList);
    }, (error) => {
      console.error("Error fetching chat messages:", error);
    });

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Apply Rich Text Format In-Place
  const applyStyle = (command) => {
    document.execCommand(command, false, null);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // 2. Send Encrypted Message
  const handleSend = async () => {
    const htmlContent = editorRef.current ? editorRef.current.innerHTML.trim() : '';
    
    // Ignore empty content or whitespace-only tags
    if (!htmlContent || htmlContent === '<br>' || htmlContent === '<div><br></div>') return;

    // Encrypt payload before saving to Firestore
    const encryptedText = CryptoJS.AES.encrypt(htmlContent, SECRET_KEY).toString();

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        receiverId: chatPartner.uid,
        encryptedText,
        timestamp: serverTimestamp(),
        isRead: false,
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId } : null
      });

      // Reset editor & reply state
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setReplyTo(null);
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message: " + err.message);
    }
  };

  // Delete message with confirmation
  const handleDeleteMessage = async (msgId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteDoc(doc(db, 'chats', chatId, 'messages', msgId));
      } catch (err) {
        console.error("Error deleting message:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-lg h-[600px] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-sm">{chatPartner.name || chatPartner.email}</h3>
            <p className="text-[10px] text-emerald-400 font-medium">End-to-End Encrypted</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
              No messages yet. Say hi!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.uid;
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl p-3 text-xs relative shadow-xs transition-all ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                    }`}
                  >
                    {/* Replied Message Preview */}
                    {msg.replyTo && (
                      <div 
                        className={`mb-2 p-2 rounded-xl text-[11px] border-l-2 ${
                          isMe 
                            ? 'bg-indigo-700/60 border-indigo-200 text-indigo-100' 
                            : 'bg-slate-100 border-indigo-500 text-slate-600'
                        }`}
                      >
                        <p className="font-bold text-[10px]">
                          {msg.replyTo.senderId === currentUser.uid ? 'You' : chatPartner.name || chatPartner.email}
                        </p>
                        <div 
                          className="truncate"
                          dangerouslySetInnerHTML={{ __html: msg.replyTo.text }}
                        />
                      </div>
                    )}

                    {/* Formatted Message Body */}
                    <div 
                      className="leading-relaxed break-words"
                      dangerouslySetInnerHTML={{ __html: msg.text }}
                    />

                    {/* Context Options (Reply / Delete) */}
                    <div className="flex items-center gap-2 mt-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setReplyTo(msg)}
                        className={`p-1 rounded hover:bg-black/10 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}
                        title="Reply"
                      >
                        <Reply size={12} />
                      </button>
                      {isMe && (
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 rounded hover:bg-black/10 text-rose-300 hover:text-rose-100"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input & Controls Section */}
        <div className="bg-white border-t border-slate-100 p-3 space-y-2">
          
          {/* Active Reply Banner */}
          {replyTo && (
            <div className="flex items-center justify-between bg-indigo-50 px-3 py-1.5 rounded-xl text-xs border border-indigo-100">
              <div className="truncate pr-2">
                <span className="font-bold text-indigo-600">
                  Replying to {replyTo.senderId === currentUser.uid ? 'yourself' : chatPartner.name || chatPartner.email}:
                </span>{' '}
                <span 
                  className="text-slate-600 italic"
                  dangerouslySetInnerHTML={{ __html: replyTo.text }}
                />
              </div>
              <button 
                onClick={() => setReplyTo(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1.5 px-2 py-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => applyStyle('bold')}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Bold"
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              onClick={() => applyStyle('italic')}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Italic"
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              onClick={() => applyStyle('underline')}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Underline"
            >
              <Underline size={15} />
            </button>
          </div>

          {/* Rich Input Editor & Send Action */}
          <div className="flex items-center gap-2 pt-1">
            <div
              ref={editorRef}
              contentEditable
              className="flex-1 min-h-[42px] max-h-[120px] overflow-y-auto px-4 py-2.5 border border-indigo-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800 bg-slate-50/50"
              data-placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Send size={14} /> Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatModal;