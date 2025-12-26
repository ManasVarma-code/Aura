
import React, { useState } from 'react';
import { Heart, Mail, Lock, Chrome } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin(email);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-pink-100 rounded-[2rem] flex items-center justify-center text-pink-500 mx-auto shadow-xl shadow-pink-100 animate-bounce">
            <Heart size={40} fill="currentColor" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Aura</h1>
          <p className="text-gray-500 font-medium">Step into your private sanctuary 🌸</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-pink-200 border border-gray-100 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300" size={18} />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-pink-200 border border-gray-100 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-4 bg-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-100 hover:bg-pink-600 transition-all active:scale-95"
            >
              Sign In
            </button>
          </form>

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          <button 
            onClick={() => onLogin('google-user@gmail.com')}
            className="w-full py-4 bg-white border border-gray-100 text-gray-600 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-95"
          >
            <Chrome size={20} className="text-pink-400" />
            Continue with Google
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 font-medium">
          Secure, encrypted, and private. <br />
          Always just for the two of you. 💖
        </p>
      </div>
    </div>
  );
};

export default Login;
