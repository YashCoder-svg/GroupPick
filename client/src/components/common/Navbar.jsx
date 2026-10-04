import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, User, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegisterMode) {
        await register(authName, authEmail, authPassword);
      } else {
        await login(authEmail, authPassword);
      }
      setShowAuthModal(false);
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    }
  };

  const handleScrollTo = (id) => (e) => {
    if (location.pathname === '/') {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full h-[72px] bg-paper dark:bg-paper-dark border-b border-line dark:border-line-dark transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between min-w-0">
          {/* Left: Logo = small rounded-square accent icon + "GroupPick" wordmark */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-[8px] bg-tomato flex items-center justify-center text-white shrink-0 shadow-sm">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <span className="font-display font-bold text-lg sm:text-xl text-ink dark:text-ink-dark tracking-[-0.01em]">
              GroupPick
            </span>
          </Link>

          {/* Navigation Links & Actions */}
          <div className="flex items-center space-x-2.5 sm:space-x-6 min-w-0">
            {/* Center-right links: "How it works", "Packs", "API Docs", all identical 15px/500 */}
            <div className="hidden md:flex items-center space-x-6">
              <a
                href="/#how-it-works"
                onClick={handleScrollTo('how-it-works')}
                className="text-[15px] font-medium text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark transition-colors"
              >
                How it works
              </a>
              <a
                href="/#packs"
                onClick={handleScrollTo('packs')}
                className="text-[15px] font-medium text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark transition-colors"
              >
                Packs
              </a>
              <a
                href="/api/docs"
                target="_blank"
                rel="noreferrer"
                className="text-[15px] font-medium text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark transition-colors"
              >
                API Docs
              </a>
            </div>

            {/* Right Group: Theme toggle, Sign in, and Start a group button */}
            <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
              {/* Theme Toggle (icon only) */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle color theme"
                className="p-1.5 sm:p-2 rounded-[8px] text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark border border-line dark:border-line-dark bg-surface dark:bg-surface-dark transition-colors shrink-0"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {/* Sign in as text link at the SAME 15px/500 size */}
              {isAuthenticated ? (
                <div className="hidden sm:flex items-center space-x-2 text-[15px] font-medium text-ink dark:text-ink-dark">
                  <span>{user?.name}</span>
                  <button
                    onClick={logout}
                    title="Sign out"
                    className="p-1 text-muted hover:text-tomato transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAuthError('');
                    setShowAuthModal(true);
                  }}
                  className="hidden sm:inline-block text-[15px] font-medium text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark transition-colors cursor-pointer"
                >
                  Sign in
                </button>
              )}

              {/* ONE "Start a group" button (44px tall, 10px radius) */}
              <button
                onClick={() => navigate('/create')}
                className="h-[40px] sm:h-[44px] px-3 sm:px-5 rounded-[10px] bg-tomato hover:bg-tomato-hover text-white font-medium text-xs sm:text-[15px] transition-all active:scale-[0.98] inline-flex items-center justify-center shrink-0 cursor-pointer shadow-sm whitespace-nowrap"
              >
                Start a group
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Organizer Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60">
          <div className="w-full max-w-md bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-card shadow-soft p-6 sm:p-8">
            <h3 className="text-2xl font-display font-extrabold text-ink dark:text-ink-dark mb-1">
              {isRegisterMode ? 'Create Organizer Account' : 'Organizer Sign In'}
            </h3>
            <p className="text-sm text-ink-muted dark:text-ink-mutedDark mb-6">
              Organizers can sign in to view past groups and fairness histories.
            </p>

            {authError && (
              <div className="p-3 mb-4 rounded-btn bg-tomato-tint text-tomato text-xs font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isRegisterMode && (
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-ink-dark mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full px-4 py-3 rounded-btn border border-line dark:border-line-dark bg-transparent text-sm text-ink dark:text-ink-dark focus:border-tomato outline-none transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink-dark mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full px-4 py-3 rounded-btn border border-line dark:border-line-dark bg-transparent text-sm text-ink dark:text-ink-dark focus:border-tomato outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink dark:text-ink-dark mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-btn border border-line dark:border-line-dark bg-transparent text-sm text-ink dark:text-ink-dark focus:border-tomato outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-btn bg-tomato hover:bg-tomato-hover text-white font-semibold text-sm transition-all shadow-sm active:scale-95"
              >
                {isRegisterMode ? 'Create Account' : 'Sign In'}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-tomato font-semibold hover:underline"
                >
                  {isRegisterMode ? 'Already have an account? Sign in' : 'New organizer? Create account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="text-ink-muted hover:text-ink dark:hover:text-ink-dark"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
