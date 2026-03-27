import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = "You are the TruScan Systems AI Assistant. Help users understand our bespoke workflow automation in South Africa. hello@truscan.co.za.";

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', content: "Hi! How can I help you automate today?" }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // SECURE WAY: This pulls the key from Vercel's settings, not the code!
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("API Key missing from Environment Variables");
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash", 
        contents: [{ 
          role: 'user', 
          parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nUser: ${userMessage}` }] 
        }]
      });

      const botResponse = response.text || "I'm sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    } catch (error: any) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, { role: 'bot', content: `Connection Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Rest of your UI code (WhatsApp icon, motion.div, etc.) remains the same
  return (
    // ... (Your existing UI code from previous steps)
    <div className="fixed bottom-8 right-8 z-[100] flex items-center gap-4">
       <motion.button onClick={() => setIsOpen(true)} className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center"><Sparkles className="w-8 h-8" /></motion.button>
    </div>
  );
}
