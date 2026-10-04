import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-card bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-center space-y-4 shadow-soft">
        <div className="w-14 h-14 rounded-btn bg-tomato-soft text-tomato mx-auto flex items-center justify-center">
          <Compass className="w-7 h-7" />
        </div>
        <h1 className="font-display font-extrabold text-5xl text-ink dark:text-ink-dark tracking-tight">404</h1>
        <h2 className="font-display font-bold text-lg text-ink dark:text-ink-dark">Page Not Found</h2>
        <p className="text-sm text-muted dark:text-muted-dark leading-relaxed">
          The decision group or page you are looking for does not exist or may have expired.
        </p>
        <button
          onClick={() => navigate('/')}
          className="min-h-[48px] px-6 py-3 rounded-btn bg-tomato hover:bg-tomato-hover text-white font-display font-bold text-xs flex items-center justify-center space-x-2 mx-auto transition-all shadow-soft cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Back to Homepage</span>
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
