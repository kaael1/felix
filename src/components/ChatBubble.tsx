import React from 'react';
import Image from 'next/image';
import { Message } from '../types';
import { Bot, User, ExternalLink } from 'lucide-react';

interface Snowflake {
  id: number;
  left: string;
  animationDuration: string;
  animationDelay: string;
  opacity: number;
  size: string;
}

const pseudoRandom = (seed: number) => {
  const value = Math.sin(seed * 9999) * 10000;
  return value - Math.floor(value);
};

const SNOWFLAKES: Snowflake[] = Array.from({ length: 16 }).map((_, index) => {
  const base = pseudoRandom(index + 1);
  const left = `${Math.floor(base * 100)}%`;
  const animationDuration = `${Math.floor((base * 5) + 3)}s`;
  const animationDelay = `${(base * 5).toFixed(2)}s`;
  const opacity = Number((0.3 + base * 0.5).toFixed(2));
  const size = `${(base * 4 + 3).toFixed(2)}px`;

  return {
    id: index,
    left,
    animationDuration,
    animationDelay,
    opacity,
    size,
  };
});

interface ChatBubbleProps {
  message: Message;
}

// Internal component for the subtle snow effect
const SnowOverlay = () => {
  const snowflakes = React.useMemo(() => SNOWFLAKES, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <style>
        {`
          @keyframes snowfall {
            0% {
              transform: translateY(-10px) translateX(-5px);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            100% {
              transform: translateY(180px) translateX(10px);
              opacity: 0;
            }
          }
          .snowflake {
            position: absolute;
            top: -10px;
            background-color: white;
            border-radius: 50%;
            animation-name: snowfall;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
        `}
      </style>
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            left: flake.left,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animationDuration: flake.animationDuration,
            animationDelay: flake.animationDelay,
          }}
        />
      ))}
    </div>
  );
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isAgent = message.role === 'agent';
  const [useFallbackImage, setUseFallbackImage] = React.useState(false);

  React.useEffect(() => {
    setUseFallbackImage(false);
  }, [message.id, message.promo?.imageUrl]);

  const promoImageSrc = useFallbackImage
    ? 'https://placehold.co/600x400/e2e8f0/64748b?text=Promo+Image'
    : message.promo?.imageUrl ?? '';

  return (
    <div className={`flex w-full mb-6 ${isAgent ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isAgent ? 'items-start' : 'items-end'}`}>
        
        <div className={`flex w-full ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
            isAgent ? 'bg-blue-600 mr-3' : 'bg-slate-700 ml-3'
          }`}>
            {isAgent ? <Bot size={16} className="text-white" /> : <User size={16} className="text-white" />}
          </div>

          {/* Bubble */}
          <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isAgent 
              ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100' 
              : 'bg-blue-600 text-white rounded-tr-none'
          }`}>
            {message.content}
          </div>
        </div>

        {/* Promo Card (Only for Agent messages that contain promo data) */}
        {isAgent && message.promo && (
          <div className="ml-11 mt-3 w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Promo Image with Snow Effect */}
            <div className="relative h-40 w-full bg-slate-100 group">
               {/* Snow Overlay */}
               <SnowOverlay />
               
               <Image
                 src={promoImageSrc}
                 alt="Promo"
                 fill
                 sizes="(min-width: 768px) 384px, 100vw"
                 className="object-cover transition-transform duration-700 group-hover:scale-105"
                 onError={() => setUseFallbackImage(true)}
                 priority={false}
               />
               {/* Subtle gradient overlay to make white text pop if needed, though card has text below */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>
            
            {/* Promo Content */}
            <div className="p-4 relative">
              <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">
                {message.promo.title}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {message.promo.description}
              </p>
              
              <a 
                href={message.promo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors group/btn"
              >
                {message.promo.buttonText}
                <ExternalLink size={14} className="ml-2 opacity-80 group-hover/btn:translate-x-0.5 transition-transform" />
              </a>
              
              <p className="text-[10px] text-slate-400 mt-3 text-center leading-tight">
                {message.promo.footer}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatBubble;

