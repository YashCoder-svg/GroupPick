import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, Cpu, Filter, Scale, Layers } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Reading anonymous group constraints & private budgets', icon: Filter },
  { id: 2, label: 'Filtering candidate options against hard limits', icon: Layers },
  { id: 3, label: 'Generating multi-criteria satisfaction matrix', icon: Cpu },
  { id: 4, label: 'Applying historical Fairness Ledger weighting', icon: Scale },
  { id: 5, label: 'Computing non-dominated Pareto frontier', icon: Sparkles },
  { id: 6, label: 'Synthesizing plain-language explanations for 3 archetypes', icon: CheckCircle2 },
];

export const ThinkingEngineModal = ({ isOpen = false, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        if (onComplete) {
          setTimeout(onComplete, 800);
        }
        return prev;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-lg bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-card shadow-soft p-6 sm:p-8 overflow-hidden relative"
        >
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-tomato-tint dark:bg-tomato-darkTint text-tomato rounded-btn">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-xl text-ink dark:text-ink-dark">
                Decision Engine Optimizing
              </h3>
              <p className="text-xs text-ink-muted dark:text-ink-mutedDark">
                Finding the 3 fairest options for your group...
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-subtle dark:bg-surface-subtleDark h-2 rounded-full mb-6 overflow-hidden">
            <motion.div
              className="h-full bg-tomato"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Steps List */}
          <div className="space-y-3.5">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-3 text-sm transition-all duration-300 ${
                    isPast
                      ? 'text-forest dark:text-forest-dark font-medium'
                      : isCurrent
                      ? 'text-tomato font-semibold'
                      : 'text-ink-muted dark:text-ink-mutedDark'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                      isPast
                        ? 'border-forest bg-forest-tint dark:bg-forest-darkTint text-forest dark:text-forest-dark'
                        : isCurrent
                        ? 'border-tomato bg-tomato-tint dark:bg-tomato-darkTint text-tomato'
                        : 'border-line dark:border-line-dark bg-transparent'
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-forest dark:text-forest-dark" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="truncate">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Privacy reassurance pill */}
          <div className="mt-8 pt-4 border-t border-line dark:border-line-dark flex items-center justify-center space-x-2 text-xs text-ink-muted dark:text-ink-mutedDark">
            <span className="inline-block w-2 h-2 rounded-full bg-forest dark:bg-forest-dark" />
            <span>Private budgets stay encrypted and never leave the engine</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ThinkingEngineModal;
