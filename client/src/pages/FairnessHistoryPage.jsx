import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Scale,
  ArrowLeft,
  Trophy,
  History,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import api from '../services/api.js';

export const FairnessHistoryPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [ledgers, setLedgers] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const groupData = await api.getGroup(code);
        setGroup(groupData.group);

        const ledgerData = await api.getFairnessHistory(code);
        setLedgers(ledgerData || []);

        const decisionData = await api.getGroupDecisions(code);
        setDecisions(decisionData || []);
      } catch (err) {
        setError(err.message || 'Failed to load fairness history');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchData();
    }
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-tomato border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted dark:text-muted-dark">Loading Fairness Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line dark:border-line-dark pb-6">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-btn border border-line dark:border-line-dark hover:border-tomato transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-ink dark:text-ink-dark" />
          </button>
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink dark:text-ink-dark tracking-tight">
              Fairness Ledger & History
            </h1>
            <p className="text-xs text-muted dark:text-muted-dark mt-0.5">
              Group: {group?.title} ({group?.code})
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-btn bg-tomato-soft/60 border border-tomato/30 text-ink text-sm font-medium">
          {error}
        </div>
      )}

      {/* Explainer Box: How the Ledger works */}
      <div className="p-6 rounded-card bg-forest/5 border border-forest/20 space-y-3">
        <div className="flex items-center space-x-2 text-forest dark:text-emerald-400 font-display font-bold text-base">
          <Scale className="w-5 h-5" />
          <span>How Dynamic Fairness Weighting Works</span>
        </div>
        <p className="text-sm text-muted dark:text-muted-dark leading-relaxed">
          In repeated group decisions, one friend often compromises repeatedly. GroupPick persists each member's win/compromise record in MongoDB. Members whose top choices lost recently receive an elevated weight (bounded between <strong>0.80x</strong> and <strong>1.30x</strong>, normalized so the group average remains 1.0x). Next time you decide, their preferences are amplified.
        </p>
      </div>

      {/* Member Ledger Cards */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-base text-ink dark:text-ink-dark flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-forest dark:text-emerald-400" />
          <span>Member Standings & Dynamic Weights</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ledgers.map((ledger) => {
            const weight = ledger.currentWeight ?? 1.0;
            const isBoosted = weight > 1.05;
            const isModerated = weight < 0.95;

            return (
              <div
                key={ledger._id}
                className="p-5 rounded-card bg-surface dark:bg-surface-dark border border-line dark:border-line-dark space-y-3 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-base text-ink dark:text-ink-dark">
                    {ledger.displayName || 'Member'}
                  </span>
                  <div
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-btn text-xs font-bold ${
                      isBoosted
                        ? 'bg-tomato-soft text-tomato border border-tomato/30'
                        : isModerated
                        ? 'bg-forest/10 text-forest dark:text-emerald-400 border border-forest/20'
                        : 'bg-paper dark:bg-surface-dark text-muted dark:text-muted-dark border border-line dark:border-line-dark'
                    }`}
                  >
                    {isBoosted ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : isModerated ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : null}
                    <span>{weight.toFixed(2)}x Weight</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-line dark:border-line-dark">
                  <div className="p-2.5 rounded-btn bg-paper dark:bg-surface-dark/80">
                    <span className="font-display font-bold text-xl text-forest dark:text-emerald-400 block leading-tight">
                      {ledger.timesTopChoiceWon ?? 0}
                    </span>
                    <span className="text-[10px] text-muted dark:text-muted-dark font-semibold uppercase">
                      Picks Won
                    </span>
                  </div>
                  <div className="p-2.5 rounded-btn bg-paper dark:bg-surface-dark/80">
                    <span className="font-display font-bold text-xl text-tomato block leading-tight">
                      {ledger.timesTopChoiceLost ?? 0}
                    </span>
                    <span className="text-[10px] text-muted dark:text-muted-dark font-semibold uppercase">
                      Compromises
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-muted dark:text-muted-dark text-center">
                  {isBoosted
                    ? 'Priority boost active for next decision'
                    : isModerated
                    ? 'Won recently; standard balanced weight'
                    : 'Balanced standard weight'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past Decisions Timeline */}
      <div className="space-y-4 pt-4">
        <h3 className="font-display font-bold text-base text-ink dark:text-ink-dark flex items-center space-x-2">
          <History className="w-4 h-4 text-tomato" />
          <span>Past Decisions ({decisions.length})</span>
        </h3>

        {decisions.length === 0 ? (
          <div className="p-8 rounded-card bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-center text-xs text-muted dark:text-muted-dark italic">
            No past decisions recorded for this group yet.
          </div>
        ) : (
          <div className="space-y-3">
            {decisions.map((dec, idx) => {
              const winningOpt = dec.options?.find((o) => o.optionId === dec.confirmedOptionId);
              return (
                <div
                  key={dec._id || idx}
                  className="p-5 rounded-card bg-surface dark:bg-surface-dark border border-line dark:border-line-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-soft"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-tomato uppercase">
                        Strategy: {dec.strategyUsed}
                      </span>
                      <span className="text-line dark:text-line-dark">&bull;</span>
                      <span className="text-xs text-muted dark:text-muted-dark">
                        {new Date(dec.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="font-display font-bold text-base text-ink dark:text-ink-dark">
                      {winningOpt ? `Confirmed Pick: ${winningOpt.title}` : 'Draft Decision Result'}
                    </div>
                    {winningOpt && (
                      <div className="text-xs text-muted dark:text-muted-dark">
                        {winningOpt.category} &bull; ${winningOpt.costPerPerson}/person &bull; Satisfaction: {winningOpt.overallScore}%
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/results/${code}`)}
                    className="min-h-[44px] px-4 py-2 rounded-btn bg-paper dark:bg-surface-dark hover:border-tomato border border-line dark:border-line-dark text-xs font-bold text-ink dark:text-ink-dark transition-colors shrink-0 cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FairnessHistoryPage;
