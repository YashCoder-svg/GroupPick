import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const SatisfactionRing = ({
  score = 85,
  size = 56,
  strokeWidth = 6,
  label = '',
  avatar = '',
  children,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Use exact accent and success specs
  const strokeColor = score >= 90 ? '#1F6F54' : '#F2542D';

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Subtle warm background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-line dark:text-line-dark"
            fill="transparent"
          />
          {/* Animated score ring with rounded caps and thick stroke */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={shouldReduceMotion ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-ink dark:text-ink-dark">
          {children ? children : `${Math.round(score)}%`}
        </div>
      </div>
      {label && (
        <span className="text-xs text-ink-muted dark:text-ink-mutedDark mt-1 font-medium text-center truncate max-w-[70px]">
          {label}
        </span>
      )}
    </div>
  );
};

export default SatisfactionRing;
