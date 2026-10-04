import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export const triggerConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio, opts) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#6366F1', '#10B981', '#F59E0B'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#EC4899', '#06B6D4', '#8B5CF6'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};

export const ConfettiMoment = ({ trigger = false }) => {
  useEffect(() => {
    if (trigger) {
      triggerConfetti();
    }
  }, [trigger]);

  return null;
};

export default ConfettiMoment;
