
import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Calendar, Heart, Camera, Settings, Star } from 'lucide-react';

const Navigation: React.FC = () => {
  const navItems = [
    { icon: <Heart size={24} />, label: 'Home', path: '/' },
    { icon: <MessageSquare size={24} />, label: 'Chat', path: '/chat' },
    { icon: <Calendar size={24} />, label: 'Calendar', path: '/calendar' },
    { icon: <Camera size={24} />, label: 'Wall', path: '/memories' },
    { icon: <Star size={24} />, label: 'Rewards', path: '/rewards' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-pink-100 flex justify-around items-center px-4 py-3 pb-6 z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => 
            `flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-pink-400 scale-110' : 'text-gray-400 hover:text-pink-200'}`
          }
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default Navigation;
