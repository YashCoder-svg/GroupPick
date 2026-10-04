import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
  DollarSign,
  Heart,
  Ban,
  User,
  Sparkles,
} from 'lucide-react';
import api from '../services/api.js';

export const JoinStepperPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [pack, setPack] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(true);

  // Stepper state (0 = Name, 1 = Private Budget, 2 = Hard Limits, 3 = Soft Wishes)
  const [step, setStep] = useState(0);

  // Form values
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState('#FF5B3A');
  const [budget, setBudget] = useState(500);
  const [hardLimits, setHardLimits] = useState([]);
  const [softWishes, setSoftWishes] = useState([]);
  const [customNotes, setCustomNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const avatarColors = ['#FF5B3A', '#12403A', '#D97706', '#2563EB', '#DB2777', '#4B5563'];

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setLoadingGroup(true);
        const data = await api.getGroup(code);
        setGroup(data.group);

        const packData = await api.getPackById(data.group.packId);
        setPack(packData);

        // If member already has saved preference
        if (data.myPreference) {
          setBudget(data.myPreference.budget ?? 30);
          setHardLimits(data.myPreference.hardLimits || []);
          setSoftWishes(data.myPreference.softWishes || []);
          setCustomNotes(data.myPreference.customNotes || '');
        }
        if (data.currentMember) {
          setDisplayName(data.currentMember.displayName);
          setAvatarColor(data.currentMember.avatarColor || '#FF5B3A');
          // If already joined, start at Step 1 (budget)
          setStep(1);
        }
      } catch (err) {
        setError(err.message || 'Could not load group details');
      } finally {
        setLoadingGroup(false);
      }
    };

    if (code) {
      fetchGroupData();
    }
  }, [code]);

  const toggleHardLimit = (id) => {
    if (hardLimits.includes(id)) {
      setHardLimits(hardLimits.filter((h) => h !== id));
    } else {
      setHardLimits([...hardLimits, id]);
    }
  };

  const toggleSoftWish = (id) => {
    if (softWishes.includes(id)) {
      setSoftWishes(softWishes.filter((w) => w !== id));
    } else {
      setSoftWishes([...softWishes, id]);
    }
  };

  const handleFinalSubmit = async () => {
    setError('');
    try {
      setSubmitting(true);

      // 1. Join group if not already joined with a valid token
      let memberToken = localStorage.getItem('gp_member_token');
      if (!memberToken || !group) {
        const joinRes = await api.joinGroup(code, {
          displayName: displayName.trim() || 'Guest',
          avatarColor,
        });
        memberToken = joinRes.guestToken;
        localStorage.setItem('gp_member_token', memberToken);
      }

      // 2. Submit private preferences
      await api.submitPreferences(code, {
        budget: Number(budget),
        hardLimits,
        softWishes,
        rankedPicks: [],
        customNotes,
      });

      // 3. Move to Lobby
      navigate(`/lobby/${code}`);
    } catch (err) {
      setError(err.message || 'Failed to submit preferences');
      setSubmitting(false);
    }
  };

  if (loadingGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-tomato border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted dark:text-muted-dark">Loading group invite...</p>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-card bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-center space-y-4 shadow-soft">
          <div className="w-12 h-12 rounded-btn bg-tomato-soft text-tomato mx-auto flex items-center justify-center">
            <Ban className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-xl text-ink dark:text-ink-dark">Group Not Found</h2>
          <p className="text-sm text-muted dark:text-muted-dark">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="min-h-[48px] px-6 py-2.5 rounded-btn bg-tomato hover:bg-tomato-hover text-white text-xs font-bold transition-all shadow-soft"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 max-w-xl mx-auto flex flex-col justify-center">
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="text-center space-y-1.5">
          <span className="text-xs uppercase tracking-widest font-extrabold text-tomato">
            Group Invite &bull; {group?.code}
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink dark:text-ink-dark tracking-tight">
            {group?.title}
          </h1>
          <p className="text-sm text-muted dark:text-muted-dark">
            Takes under 30 seconds. Your budget stays strictly private.
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex items-center justify-between gap-2 max-w-xs mx-auto">
          {[0, 1, 2, 3].map((stepIdx) => (
            <div
              key={stepIdx}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                stepIdx <= step
                  ? 'bg-tomato'
                  : 'bg-line dark:bg-line-dark'
              }`}
            />
          ))}
        </div>

        {/* Step Container */}
        <div className="bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-card p-6 sm:p-8 shadow-soft relative overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 0: Name & Avatar */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-btn bg-tomato-soft text-tomato flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-ink dark:text-ink-dark">
                      What should we call you?
                    </h3>
                    <p className="text-xs text-muted dark:text-muted-dark">No account or password needed</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted dark:text-muted-dark mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Maya"
                    className="w-full min-h-[48px] px-4 py-3 rounded-btn border border-line dark:border-line-dark bg-paper dark:bg-surface-dark text-ink dark:text-ink-dark text-base focus:border-tomato focus:ring-1 focus:ring-tomato outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted dark:text-muted-dark mb-2">
                    Pick an Avatar Color
                  </label>
                  <div className="flex items-center space-x-3">
                    {avatarColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAvatarColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform ${
                          avatarColor === color ? 'scale-110 ring-4 ring-tomato/30' : 'hover:scale-105'
                        }`}
                      >
                        {avatarColor === color && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!displayName.trim()}
                  onClick={() => setStep(1)}
                  className="w-full min-h-[48px] py-3.5 rounded-btn bg-tomato hover:bg-tomato-hover text-white font-display font-bold text-sm shadow-soft flex items-center justify-center space-x-2 disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span>Next: Set Private Budget</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 1: Private Budget */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-btn bg-forest/10 text-forest dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-ink dark:text-ink-dark">
                      Your Maximum Budget
                    </h3>
                    <p className="text-xs text-muted dark:text-muted-dark">Per person for this event</p>
                  </div>
                </div>

                {/* Privacy Guarantee Banner */}
                <div className="p-4 rounded-btn bg-forest/5 border border-forest/20 flex items-start space-x-3 text-xs text-forest dark:text-emerald-300">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Strictly Private:</span> Neither the organizer nor other members can see your budget number. The engine only finds an option everyone can afford.
                  </div>
                </div>

                <div className="text-center py-4 space-y-4">
                  <div className="font-display font-extrabold text-5xl sm:text-6xl text-ink dark:text-ink-dark tracking-tight">
                    ₹{budget}
                  </div>

                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={budget}
                    onChange={(e) => setBudget(parseInt(e.target.value, 10))}
                    className="w-full accent-tomato cursor-pointer"
                  />

                  <div className="flex justify-between text-xs text-muted dark:text-muted-dark font-medium">
                    <span>₹100 (Street/Dhaba)</span>
                    <span>₹600 (Casual Dining)</span>
                    <span>₹5000+ (Luxury)</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="min-h-[48px] py-3.5 px-5 rounded-btn border border-line dark:border-line-dark text-ink dark:text-ink-dark hover:border-ink transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 min-h-[48px] py-3.5 rounded-btn bg-tomato hover:bg-tomato-hover text-white font-display font-bold text-sm shadow-soft flex items-center justify-center space-x-2 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>Next: Must-Haves (Hard Limits)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Hard Limits */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-btn bg-tomato-soft text-tomato flex items-center justify-center">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-ink dark:text-ink-dark">
                      Hard Limits (Non-Negotiable)
                    </h3>
                    <p className="text-xs text-muted dark:text-muted-dark">
                      Options lacking any of these will be strictly eliminated
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {(pack?.defaultHardLimits || [
                    { id: 'vegan', label: 'Strictly Vegan' },
                    { id: 'vegetarian', label: 'Vegetarian Friendly' },
                    { id: 'halal', label: 'Halal Certified' },
                    { id: 'kosher', label: 'Kosher' },
                    { id: 'gluten-free', label: 'Gluten-Free' },
                    { id: 'wheelchair', label: 'Wheelchair Accessible' },
                  ]).map((limit) => {
                    const isSelected = hardLimits.includes(limit.id);
                    return (
                      <div
                        key={limit.id}
                        onClick={() => toggleHardLimit(limit.id)}
                        className={`cursor-pointer p-3.5 rounded-btn border text-xs font-semibold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-2 border-tomato bg-tomato-soft/30 text-ink dark:text-ink-dark'
                            : 'border-line dark:border-line-dark text-muted dark:text-muted-dark hover:border-ink/50'
                        }`}
                      >
                        <span>{limit.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-tomato stroke-[3]" />}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="min-h-[48px] py-3.5 px-5 rounded-btn border border-line dark:border-line-dark text-ink dark:text-ink-dark hover:border-ink transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 min-h-[48px] py-3.5 rounded-btn bg-tomato hover:bg-tomato-hover text-white font-display font-bold text-sm shadow-soft flex items-center justify-center space-x-2 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>Next: Soft Wishes</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Soft Wishes & Done */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-btn bg-tomato-soft text-tomato flex items-center justify-center">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-ink dark:text-ink-dark">
                      Soft Wishes (Preferences)
                    </h3>
                    <p className="text-xs text-muted dark:text-muted-dark">
                      Boosts satisfaction scores without eliminating places
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {(pack?.defaultSoftWishes || [
                    { id: 'outdoor-seating', label: 'Outdoor / Patio' },
                    { id: 'craft-beer', label: 'Craft Beer' },
                    { id: 'wine', label: 'Wine Pairings' },
                    { id: 'quiet', label: 'Quiet & Intimate' },
                    { id: 'lively', label: 'Lively & Energetic' },
                    { id: 'quick-bite', label: 'Quick Bite' },
                  ]).map((wish) => {
                    const isSelected = softWishes.includes(wish.id);
                    return (
                      <div
                        key={wish.id}
                        onClick={() => toggleSoftWish(wish.id)}
                        className={`cursor-pointer p-3 rounded-btn border text-xs font-semibold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-2 border-forest bg-forest/5 text-forest dark:border-emerald-400 dark:text-emerald-300'
                            : 'border-line dark:border-line-dark text-muted dark:text-muted-dark hover:border-ink/50'
                        }`}
                      >
                        <span className="truncate">{wish.label}</span>
                        {isSelected && <Check className="w-4 h-4 shrink-0 ml-1 stroke-[3]" />}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="min-h-[48px] py-3.5 px-5 rounded-btn border border-line dark:border-line-dark text-ink dark:text-ink-dark hover:border-ink transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinalSubmit}
                    className="flex-1 min-h-[48px] py-3.5 rounded-btn bg-tomato hover:bg-tomato-hover text-white font-display font-bold text-sm shadow-soft flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{submitting ? 'Submitting...' : 'Join Lobby & Submit'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default JoinStepperPage;
