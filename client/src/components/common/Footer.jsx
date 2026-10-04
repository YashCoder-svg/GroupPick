import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-line dark:border-line-dark bg-paper dark:bg-paper-dark py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-3">
          <span className="font-display font-bold text-lg text-ink dark:text-ink-dark">
            GroupPick<span className="text-tomato">.</span>
          </span>
          <span className="text-xs text-ink-muted dark:text-ink-mutedDark">
            A friendly group-decision engine.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-ink-muted dark:text-ink-mutedDark">
          <Link to="/create" className="hover:text-ink dark:hover:text-ink-dark transition-colors">
            Start a group
          </Link>
          <a href="/#how-it-works" className="hover:text-ink dark:hover:text-ink-dark transition-colors">
            How it works
          </a>
          <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-ink dark:hover:text-ink-dark transition-colors">
            API Documentation
          </a>
        </div>

        <div className="text-xs text-ink-muted dark:text-ink-mutedDark">
          Private budgets &bull; Persistent fairness &bull; MERN
        </div>
      </div>
    </footer>
  );
};

export default Footer;
