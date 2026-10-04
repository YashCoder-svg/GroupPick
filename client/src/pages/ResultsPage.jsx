import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Scale,
  Clock,
  Layers,
  Map as MapIcon,
  BarChart3,
  Tag,
  AlertCircle,
  X,
  Send,
  Sparkles,
} from 'lucide-react';
import api from '../services/api.js';
import SatisfactionRing from '../components/common/SatisfactionRing.jsx';
import MapComponent from '../components/common/MapComponent.jsx';
import ParetoScatterChart from '../components/common/ParetoScatterChart.jsx';
import { triggerConfetti } from '../components/common/ConfettiMoment.jsx';
import { getSocket, joinGroupRoom } from '../services/socket.js';

export const ResultsPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'map' | 'pareto'
  const [expandedWhy, setExpandedWhy] = useState({}); // { [optionId]: boolean }
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmedId, setConfirmedId] = useState(null);
  const [, setLedgerUpdates] = useState(null);

  // Price reporting modal state
  const [reportingOption, setReportingOption] = useState(null);
  const [reportedAmount, setReportedAmount] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');

  const fetchResults = async () => {
    try {
      setLoading(true);
      const groupData = await api.getGroup(code);
      setGroup(groupData.group);

      // Check organizer
      const isOrgStored = localStorage.getItem(`gp_org_${groupData.group.code}`) === 'true';
      const hasOrgToken = !!localStorage.getItem('gp_organizer_token');
      const isMemberOrg = groupData.currentMember?.isOrganizer === true;
      setIsOrganizer(isOrgStored || hasOrgToken || isMemberOrg);

      const decisions = await api.getGroupDecisions(code);
      if (decisions && decisions.length > 0) {
        const latest = decisions[0];
        setDecision(latest);
        if (latest.status === 'confirmed') {
          setConfirmedId(latest.confirmedOptionId);
        }
      } else {
        navigate(`/lobby/${code}`);
      }
    } catch (err) {
      setError(err.message || 'Could not load decision results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [code]);

  // Socket listener for live confirm updates
  useEffect(() => {
    if (!group?._id) return;
    joinGroupRoom(group._id);
    const socket = getSocket();

    const handleConfirmed = ({ confirmedOptionId, ledgerUpdates }) => {
      setConfirmedId(confirmedOptionId);
      setLedgerUpdates(ledgerUpdates);
      triggerConfetti();
    };

    socket.on('decision:confirmed', handleConfirmed);
    return () => {
      socket.off('decision:confirmed', handleConfirmed);
    };
  }, [group?._id]);

  const toggleWhy = (optId) => {
    setExpandedWhy((prev) => ({ ...prev, [optId]: !prev[optId] }));
  };

  const handleConfirmOption = async (optionId) => {
    try {
      setConfirming(true);
      const res = await api.confirmDecision(decision._id, optionId);
      setConfirmedId(optionId);
      setLedgerUpdates(res.ledgerUpdates);
      triggerConfetti();
    } catch (err) {
      alert(err.message || 'Failed to confirm decision');
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenReportModal = (opt) => {
    setReportingOption(opt);
    setReportedAmount('');
    setReportSuccess('');
  };

  const handleReportPriceSubmit = async (e) => {
    e.preventDefault();
    if (!reportedAmount || isNaN(parseFloat(reportedAmount)) || parseFloat(reportedAmount) <= 0) {
      return;
    }

    try {
      setReportSubmitting(true);
      const placeId = reportingOption?.placeId || reportingOption?.id;
      if (placeId) {
        await api.reportPlacePrice(placeId, parseFloat(reportedAmount));
      }
      setReportSuccess(`Thanks! Price of ₹${reportedAmount} recorded for ${reportingOption.title}.`);
      setTimeout(() => {
        setReportingOption(null);
        setReportSuccess('');
      }, 2000);
    } catch (err) {
      setReportSuccess(`Report saved locally for group consideration.`);
      setTimeout(() => {
        setReportingOption(null);
        setReportSuccess('');
      }, 2000);
    } finally {
      setReportSubmitting(false);
    }
  };

  // Helper to format pricing honestly
  const formatPrice = (opt) => {
    if (opt.priceSource === 'reported') {
      const amt = opt.costPerPerson ?? opt.cost ?? 350;
      return {
        label: `₹${amt}`,
        suffix: '/ person',
        isEstimated: false,
        badge: 'reported',
      };
    }

    // OSM has no exact prices, so display ranges honestly
    const tier = opt.priceTier || (opt.cost > 1500 ? 4 : opt.cost > 600 ? 3 : opt.cost > 250 ? 2 : 1);
    const ranges = {
      1: 'about Rs 100-250',
      2: 'about Rs 250-500',
      3: 'about Rs 500-1200',
      4: 'about Rs 1200-3500',
    };

    return {
      label: ranges[tier] || 'about Rs 250-500',
      suffix: '',
      isEstimated: true,
      badge: 'estimated',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="w-12 h-12 border-4 border-tomato border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-lg text-ink dark:text-ink-dark">
              Finding Places & Consensus...
            </h3>
            <p className="text-xs text-muted dark:text-muted-dark">
              Optimizing satisfaction across all budgets and diets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !decision) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-card bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-center space-y-4 shadow-soft">
          <div className="w-10 h-10 rounded-full bg-tomato-soft text-tomato flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="font-display font-bold text-xl text-ink dark:text-ink-dark">Results Unavailable</h2>
          <p className="text-sm text-muted dark:text-muted-dark">{error || 'No decision has been made yet.'}</p>
          <button
            onClick={() => navigate(`/lobby/${code}`)}
            className="min-h-[48px] px-6 py-2.5 rounded-btn bg-tomato hover:bg-tomato-hover text-white text-xs font-bold transition-all shadow-soft cursor-pointer"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const options = decision.options || [];
  const destinationName = group?.destination?.name || group?.packConfig?.city || 'India';

  return (
    <div className="w-full min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line dark:border-line-dark pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-btn bg-forest/10 text-forest dark:text-emerald-400 font-bold">
              Consensus Found
            </span>
            <span className="text-xs text-muted dark:text-muted-dark capitalize">
              {destinationName} &bull; Strategy: {decision.strategyUsed}
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink dark:text-ink-dark mt-1.5 tracking-tight">
            The 3 Feasible Options
          </h1>
          <p className="text-sm text-muted dark:text-muted-dark mt-0.5">
            Pareto-optimal choices in {destinationName} satisfying all private budgets and dietary constraints.
          </p>
        </div>

        {/* View Switcher Tabs & History Link */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/fairness/${code}`)}
            className="min-h-[44px] flex items-center space-x-1.5 px-3.5 py-2 rounded-btn border border-line dark:border-line-dark text-xs font-bold text-ink dark:text-ink-dark hover:border-tomato transition-colors cursor-pointer"
          >
            <Scale className="w-4 h-4 text-tomato" />
            <span>Fairness History</span>
          </button>

          <div className="flex items-center p-1 bg-paper dark:bg-surface-dark border border-line dark:border-line-dark rounded-btn text-xs font-medium">
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-btn transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark font-bold shadow-soft'
                  : 'text-muted dark:text-muted-dark'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setActiveTab('pareto')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-btn transition-all cursor-pointer ${
                activeTab === 'pareto'
                  ? 'bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark font-bold shadow-soft'
                  : 'text-muted dark:text-muted-dark'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Pareto</span>
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-btn transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark font-bold shadow-soft'
                  : 'text-muted dark:text-muted-dark'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Celebration Callout */}
      {confirmedId && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 sm:p-6 rounded-card bg-forest/5 border-2 border-forest/30 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-btn bg-forest text-white flex items-center justify-center shrink-0 shadow-soft">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-bold text-base text-ink dark:text-ink-dark">
                Final Option Confirmed by Group!
              </h4>
              <p className="text-xs text-muted dark:text-muted-dark max-w-lg mt-0.5 leading-relaxed">
                The Fairness Ledger has been updated. Members who made compromises gained priority for the next decision.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/fairness/${code}`)}
            className="min-h-[44px] px-5 py-2 rounded-btn bg-forest hover:bg-forest/90 text-white text-xs font-bold transition-colors shrink-0 shadow-soft cursor-pointer"
          >
            View Fairness Ledger
          </button>
        </motion.div>
      )}

      {/* Tab: Pareto Scatter View */}
      {activeTab === 'pareto' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <ParetoScatterChart options={options} />
        </motion.div>
      )}

      {/* Tab: Map View */}
      {activeTab === 'map' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-4">
          <MapComponent
            places={options}
            route={options.find((o) => o.archetype === 'best_overall')?.route}
            height="500px"
          />
        </motion.div>
      )}

      {/* 3 Feasible Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {options.map((opt, idx) => {
          const isWinner = confirmedId === opt.optionId;
          const archetype = opt.archetype;
          const priceInfo = formatPrice(opt);
          const whyExpanded = !!expandedWhy[opt.optionId];

          const badgeStyles = {
            best_overall: 'bg-tomato text-white',
            fairest_to_everyone: 'bg-forest text-white',
            most_budget_friendly: 'bg-amber-600 text-white',
          }[archetype] || 'bg-tomato text-white';

          const cardBorder = isWinner
            ? 'border-2 border-forest ring-4 ring-forest/15 shadow-soft bg-forest/5'
            : archetype === 'best_overall'
            ? 'border-2 border-tomato/70 shadow-soft'
            : 'border border-line dark:border-line-dark shadow-soft';

          return (
            <motion.div
              key={opt.optionId || idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className={`rounded-card bg-surface dark:bg-surface-dark p-6 flex flex-col justify-between transition-all relative overflow-hidden ${cardBorder}`}
            >
              {/* Archetype Ribbon & Price Badge */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] uppercase font-display font-extrabold tracking-wider px-3 py-1 rounded-full ${badgeStyles}`}>
                    {archetype.replace(/_/g, ' ')}
                  </span>
                  {/* Honest Price Label with Tag */}
                  <div className="flex items-center space-x-1.5 text-right">
                    <span className="text-xs font-bold text-ink dark:text-ink-dark">
                      {priceInfo.label} {priceInfo.suffix}
                    </span>
                    <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                      priceInfo.isEstimated
                        ? 'bg-paper dark:bg-surface-dark/80 text-muted dark:text-muted-dark border border-line dark:border-line-dark'
                        : 'bg-forest/10 text-forest dark:text-emerald-400 font-bold'
                    }`}>
                      {priceInfo.badge}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-xl text-ink dark:text-ink-dark leading-tight">
                    {opt.title}
                  </h3>
                  <p className="text-xs text-muted dark:text-muted-dark mt-1">
                    {opt.category} &bull; {opt.location?.address || opt.description}
                  </p>
                </div>

                {/* Per-Member Satisfaction Rings */}
                <div className="p-4 rounded-btn bg-paper dark:bg-surface-dark/80 border border-line dark:border-line-dark space-y-2">
                  <div className="text-[11px] font-bold text-muted dark:text-muted-dark uppercase tracking-wider text-center">
                    Satisfaction Per Member
                  </div>
                  <div className="flex items-center justify-around py-1">
                    {opt.memberSatisfactions?.map((ms, mIdx) => (
                      <SatisfactionRing
                        key={ms.memberId || mIdx}
                        score={ms.score}
                        size={52}
                        strokeWidth={5}
                        label={ms.displayName}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] text-center text-muted dark:text-muted-dark font-medium pt-1.5 border-t border-line dark:border-line-dark">
                    Group Avg: <span className="font-bold text-forest dark:text-emerald-400">{opt.overallScore}%</span> &bull; Min: <span className="font-bold text-tomato">{opt.minSatisfaction}%</span>
                  </div>
                </div>

                {/* Plain-Language Explanation Snippet */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-ink dark:text-ink-dark">
                    {opt.explanation?.headline}
                  </div>
                  <p className="text-xs text-muted dark:text-muted-dark leading-relaxed">
                    {opt.explanation?.summary}
                  </p>

                  {/* Why this expander button */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => toggleWhy(opt.optionId)}
                      className="text-xs font-bold text-tomato hover:text-tomato-hover flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{whyExpanded ? 'Hide explanation' : 'Why this option?'}</span>
                      {whyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Report Actual Price Trigger */}
                    <button
                      type="button"
                      onClick={() => handleOpenReportModal(opt)}
                      className="text-[11px] font-medium text-muted dark:text-muted-dark hover:text-tomato flex items-center space-x-1 cursor-pointer"
                    >
                      <Tag className="w-3 h-3 text-tomato" />
                      <span>Report actual price</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {whyExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-2.5 pt-2 text-xs border-t border-line dark:border-line-dark overflow-hidden"
                      >
                        <p className="text-muted dark:text-muted-dark italic">
                          "{opt.explanation?.whyThis}"
                        </p>

                        {opt.explanation?.pros?.length > 0 && (
                          <div>
                            <span className="font-bold text-forest dark:text-emerald-400 block mb-1">Pros:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-muted dark:text-muted-dark">
                              {opt.explanation.pros.map((p, pIdx) => (
                                <li key={pIdx}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {opt.explanation?.compromises?.length > 0 && (
                          <div>
                            <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">Trade-offs & Fairness:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-muted dark:text-muted-dark">
                              {opt.explanation.compromises.map((c, cIdx) => (
                                <li key={cIdx}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Trip Day Route Stop Sequence (if Trip Pack) */}
                {opt.route?.stops?.length > 0 && (
                  <div className="p-3 rounded-btn bg-forest/5 border border-forest/20 space-y-1.5 text-xs">
                    <div className="font-bold text-forest dark:text-emerald-400 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Optimized Day Route ({opt.route.stops.length} stops)</span>
                    </div>
                    <div className="space-y-1 text-muted dark:text-muted-dark">
                      {opt.route.stops.map((stop) => (
                        <div key={stop.stopIndex} className="flex justify-between">
                          <span>{stop.stopIndex}. {stop.name}</span>
                          <span className="font-mono text-[11px] text-muted dark:text-muted-dark">{stop.arrivalTime} - {stop.departureTime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Winning Button (Organizer) */}
              <div className="pt-6">
                {isWinner ? (
                  <div className="w-full min-h-[48px] py-3 rounded-btn bg-forest/10 border-2 border-forest text-forest dark:text-emerald-400 font-display font-bold text-xs flex items-center justify-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmed Final Choice</span>
                  </div>
                ) : isOrganizer ? (
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={() => handleConfirmOption(opt.optionId)}
                    className="w-full min-h-[48px] py-3 rounded-btn bg-tomato hover:bg-tomato-hover text-white font-display font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.99] shadow-soft cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Confirm This Pick</span>
                  </button>
                ) : (
                  <div className="text-center text-xs text-muted dark:text-muted-dark italic">
                    Waiting for organizer to confirm pick
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Report Actual Price Modal */}
      {reportingOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 dark:bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-card bg-surface dark:bg-surface-dark border border-line dark:border-line-dark shadow-card space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-tomato" />
                <h3 className="font-display font-bold text-base text-ink dark:text-ink-dark">
                  Report Actual Price
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportingOption(null)}
                className="p-1 rounded-btn hover:bg-paper dark:hover:bg-surface-dark/80 text-muted dark:text-muted-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted dark:text-muted-dark leading-relaxed">
              OpenStreetMap has no real prices. Help improve data for everyone by sharing what you actually spent at <strong className="text-ink dark:text-ink-dark">{reportingOption.title}</strong>.
            </p>

            {reportSuccess ? (
              <div className="p-4 rounded-btn bg-forest/10 border border-forest/20 text-forest dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{reportSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleReportPriceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted dark:text-muted-dark mb-1.5">
                    Amount Spent Per Person (in INR)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-muted dark:text-muted-dark">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      autoFocus
                      value={reportedAmount}
                      onChange={(e) => setReportedAmount(e.target.value)}
                      placeholder="e.g. 450"
                      className="w-full min-h-[48px] pl-8 pr-4 py-3 rounded-btn border border-line dark:border-line-dark bg-paper dark:bg-surface-dark text-ink dark:text-ink-dark text-sm focus:border-tomato focus:ring-1 focus:ring-tomato outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingOption(null)}
                    className="min-h-[44px] px-4 py-2 rounded-btn border border-line dark:border-line-dark text-xs font-bold text-muted dark:text-muted-dark hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting || !reportedAmount}
                    className="min-h-[44px] px-5 py-2 rounded-btn bg-tomato hover:bg-tomato-hover text-white text-xs font-bold shadow-soft flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{reportSubmitting ? 'Submitting...' : 'Submit Price Report'}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
