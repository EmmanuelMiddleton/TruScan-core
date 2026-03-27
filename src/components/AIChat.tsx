import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Custom WhatsApp Icon Component
const WhatsAppIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface Message {
  role: 'user' | 'bot';
  content: string;
}

const SYSTEM_INSTRUCTION = `
You are the TruScan Systems AI Assistant. Your goal is to help users understand our services and how we can automate their workflows.

Key Information about TruScan Systems:
- We build bespoke workflow automation and API integrations for South African enterprises and individuals.
- We are "WhatsApp-first": Users can trigger automations, receive reports, and manage operations directly from WhatsApp.
- We are POPIA compliant and locally built in South Africa.
- Services include: Legacy Integration, Data Pipelines, Process Optimisation, WhatsApp Bots, and Invoice Automation.
- Who we serve: Logistics & Supply Chain, Real Estate & Property, Professional Services, and E-commerce.
- Partner Program: We have a partner portal where agents can earn commissions by referring clients.
- Contact: hello@truscan.co.za or via WhatsApp at +27 68 109 0885.

Be helpful, professional, and concise. Use a friendly tone. If you don't know something, suggest they contact us directly.
`;

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hi! I'm the TruScan AI. How can I help you automate your business today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // VITE FIX: Use import.meta.env and the VITE_ prefix
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      
      if (!apiKey) {
        throw new Error('Gemini API key is missing. Please check your Vercel Environment Variables.');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION 
      });

      const result = await model.generateContent(userMessage);
      const response = await result.response;
      const botResponse = response.text() || "I'm sorry, I couldn't process that. Please try again or contact us directly.";
      
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      const errorMessage = error.message?.includes('API key') 
        ? "The AI assistant is currently unavailable due to a configuration issue (missing API key). Please contact support."
        : "Sorry, I'm having trouble connecting right now. Please try again later.";
      setMessages(prev => [...prev, { role: 'bot', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Buttons */}
      <div className="fixed bottom-8 right-8 z-[100] flex items-center gap-4">
        {/* WhatsApp Button */}
        <motion.a
          href="https://wa.me/27681090885"
          target="_blank"
          rel="noreferrer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 bg-[#25D366] text-white rounded-full shadow-2xl flex items-center justify-center hover:opacity-90 transition-all group relative"
        >
          <WhatsAppIcon className="w-8 h-8" />
          <span className="absolute bottom-20 right-0 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
            Chat on WhatsApp
          </span>
        </motion.a>

        {/* AI Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:opacity-90 transition-all group relative"
        >
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#25D366] rounded-full border-2 border-white animate-pulse" />
          <Sparkles className="w-8 h-8" />
          <span className="absolute bottom-20 right-0 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
            Ask TruScan AI
          </span>
        </motion.button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-28 right-8 z-[101] w-[90vw] md:w-[400px] h-[600px] max-h-[calc(100vh-140px)] bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">TruScan AI</h3>
                  <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Online Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none">
                    <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[9px] text-center text-gray-400 mt-3 uppercase tracking-widest font-bold">
                Powered by TruScan Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
