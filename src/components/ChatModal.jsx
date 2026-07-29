// src/components/ChatModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  serverTimestamp, doc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { X, Send, Trash2, Reply, Bold, Italic, Underline, ShieldAlert, AlertTriangle } from 'lucide-react';

const SECRET_KEY = 'tuition_manager_e2ee_secret_key';

export const ChatModal = ({ currentUser, chatPartner, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState(null); // Custom Delete Modal State
  const editorRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check if either participant's account is deleted
  const isChatDisabled = chatPartner?.status === 'deleted' || currentUser?.status === 'deleted';

  // Deterministic Chat Room ID based on user UIDs
  const chatId = [currentUser.uid, chatPartner.uid].sort().join('_');

  // Real-time Message Listening
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
          decryptedText = data.text;
        }

        // Auto-mark incoming messages as read if active
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const applyStyle = (command) => {
    if (isChatDisabled) return;
    document.execCommand(command, false, null);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleSend = async () => {
    if (isChatDisabled) return;

    const htmlContent = editorRef.current ? editorRef.current.innerHTML.trim() : '';
    if (!htmlContent || htmlContent === '<br>' || htmlContent === '<div><br></div>') return;

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

      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setReplyTo(null);
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message: " + err.message);
    }
  };

  const handleConfirmDeleteMessage = async () => {
    if (isChatDisabled || !deleteConfirmMsg) return;
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', deleteConfirmMsg.id));
      setDeleteConfirmMsg(null);
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("Failed to delete message: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-lg h-[600px] flex flex-col shadow-2xl overflow-hidden border border-slate-100 relative">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm">{chatPartner.name || chatPartner.email}</h3>
              {chatPartner?.status === 'deleted' && (
                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[10px] font-bold uppercase">
                  Deleted Account
                </span>
              )}
            </div>
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
              No message history available.
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
                    <div 
                      className="leading-relaxed break-words"
                      dangerouslySetInnerHTML={{ __html: msg.text }}
                    />
                    {!isChatDisabled && (
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
                            onClick={() => setDeleteConfirmMsg(msg)}
                            className="p-1 rounded hover:bg-black/10 text-rose-300 hover:text-rose-100"
                            title="Delete Message"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Disabled Banner OR Editor Input */}
        {isChatDisabled ? (
          <div className="bg-rose-50 border-t border-rose-100 p-4 flex items-center justify-center gap-2 text-rose-700 text-xs font-bold shadow-inner">
            <ShieldAlert size={16} className="shrink-0" />
            <span>This account has been deleted. Chat history is read-only and new messages cannot be sent.</span>
          </div>
        ) : (
          <div className="bg-white border-t border-slate-100 p-3 space-y-2">
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

            {/* Input & Send Button */}
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
        )}

        {/* Custom Confirmation Popup Modal */}
        {deleteConfirmMsg && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-100 animate-in zoom-in-95 duration-200 text-slate-800">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-100 rounded-2xl shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <h4 className="font-extrabold text-sm tracking-tight">Delete Message?</h4>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Selected Message:</p>
                <div 
                  className="line-clamp-2 italic text-slate-800"
                  dangerouslySetInnerHTML={{ __html: deleteConfirmMsg.text }}
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete this message? This action will remove it permanently for both participants.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setDeleteConfirmMsg(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteMessage}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatModal;