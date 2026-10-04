import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Copy,
  Check,
  Lock,
  Cpu,
  ArrowRight,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import api from '../services/api.js';
import { getSocket, joinGroupRoom, leaveGroupRoom } from '../services/socket.js';
import ThinkingEngineModal from '../components/common/ThinkingEngineModal.jsx';

export const GroupLobbyPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [status, setStatus] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial group state
  const loadGroupData = async () => {
    try {
      const data = await api.getGroup(code);
      setGroup(data.group);
      setMembers(data.members || []);
      setCurrentMember(data.currentMember);

      // Check organizer privileges
      const isOrgStored = localStorage.getItem(`gp_org_${data.group.code}`) === 'true';
      const hasOrgToken = !!localStorage.getItem('gp_organizer_token');
      const isMemberOrg = data.currentMember?.isOrganizer === true;
      setIsOrganizer(isOrgStored || hasOrgToken || isMemberOrg);

      const statusData = await api.getGroupStatus(code);
      setStatus(statusData);
    } catch (err) {
      setError(err.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupData();
  }, [code]);

  // Connect Socket.io for live updates
  useEffect(() => {
    if (!group?._id) return;

    joinGroupRoom(group._id);
    const socket = getSocket();

    const handleMemberJoined = ({ member }) => {
      setMembers((prev) => {
        if (prev.some((m) => m._id === member._id)) return prev;
        return [...prev, member];
      });
      api.getGroupStatus(code).then(setStatus).catch(console.error);
    };

    const handleMemberResponded = ({ memberId }) => {
      setMembers((prev) =>
        prev.map((m) => (m._id === memberId ? { ...m, hasResponded: true } : m))
      );
      api.getGroupStatus(code).then(setStatus).catch(console.error);
    };

    const handleDecisionReady = () => {
      navigate(`/results/${code}`);
    };

    socket.on('member:joined', handleMemberJoined);
    socket.on('member:responded', handleMemberResponded);
    socket.on('decision:ready', handleDecisionReady);

    return () => {
      socket.off('member:joined', handleMemberJoined);
      socket.off('member:responded', handleMemberResponded);
      socket.off('decision:ready', handleDecisionReady);
      leaveGroupRoom(group._id);
    };
  }, [group?._id, code, navigate]);

  const shareUrl = `${window.location.origin}/join/${code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `Hey! Join our GroupPick decision for "${group?.title}". Tap here to enter your preferences in 30 seconds (budgets are private): ${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleTriggerDecision = () => {
    setIsEngineThinking(true);
  };

  const handleEngineComplete = async () => {
    try {
      await api.runDecision(code);
      navigate(`/results/${code}`);
    } catch (err) {
      setError(err.message || 'Failed to compute decision');
      setIsEngineThinking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-tomato border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted dark:text-muted-dark">Entering Group Lobby...</p>
        </div>
      </div>
    );
  }

  const respondedCount = members.filter((m) => m.hasResponded).length;
  const totalCount = members.length;
  const progressPercent = totalCount > 0 ? Math.round((respondedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Header with Title & Code */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line dark:border-line-dark pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-btn bg-tomato-soft text-tomato font-bold">
              {group?.code}
            </span>
            <span className="text-xs text-muted dark:text-muted-dark capitalize">
              {group?.packId} Pack &bull; {group?.packConfig?.city || 'Custom'}
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink dark:text-ink-dark mt-1.5 tracking-tight">
            {group?.title}
          </h1>
        </div>

        {/* Share buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleCopyLink}
            className="min-h-[44px] flex items-center space-x-1.5 px-4 py-2 rounded-btn border border-line dark:border-line-dark hover:border-ink text-xs font-bold text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-forest dark:text-emerald-400 stroke-[3]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="min-h-[44px] flex items-center space-x-1.5 px-4 py-2 rounded-btn bg-forest hover:bg-forest/90 text-white text-xs font-bold shadow-soft transition-all active:scale-[0.99]"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-btn bg-tomato-soft/60 border border-tomato/30 text-ink text-sm font-medium">
          {error}
        </div>
      )}

      {/* Aggregate Feasible Budget Ceiling Banner (Zero private leakage) */}
      <div className="p-6 rounded-card bg-forest/5 border border-forest/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-btn bg-forest/10 text-forest dark:text-emerald-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-base text-ink dark:text-ink-dark">
              Private Budget Aggregation
            </h4>
            <p className="text-xs text-muted dark:text-muted-dark max-w-md mt-0.5 leading-relaxed">
              Individual budgets are kept strictly secret. The engine only surfaces a feasible price ceiling that fits everyone.
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          {status?.feasibleBudgetRange ? (
            <div>
              <span className="text-xs text-muted dark:text-muted-dark block">Feasible Group Ceiling</span>
              <span className="font-display font-extrabold text-3xl text-forest dark:text-emerald-400">
                ${status.feasibleBudgetRange.groupCeiling}
              </span>
              <span className="text-xs text-muted dark:text-muted-dark block font-semibold">100% group fit</span>
            </div>
          ) : (
            <span className="text-xs text-muted dark:text-muted-dark italic">Awaiting first responses...</span>
          )}
        </div>
      </div>

      {/* Member Lobby Grid with Clean Flat Cards */}
      <div className="bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-card p-6 sm:p-8 space-y-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-tomato" />
            <h3 className="font-display font-bold text-base text-ink dark:text-ink-dark">
              Group Members ({respondedCount}/{totalCount} Responded)
            </h3>
          </div>
          <span className="text-xs font-bold text-tomato">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-paper dark:bg-line-dark h-2 rounded-full overflow-hidden border border-line dark:border-line-dark">
          <motion.div
            className="h-full bg-forest"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Live Avatars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {members.map((member) => {
            const hasResponded = member.hasResponded;
            return (
              <motion.div
                key={member._id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-card border text-center space-y-2 transition-all ${
                  hasResponded
                    ? 'border-forest/30 bg-forest/5 shadow-soft'
                    : 'border-line dark:border-line-dark bg-paper dark:bg-surface-dark/50 opacity-80'
                }`}
              >
                {/* Avatar Bubble */}
                <div className="relative mx-auto w-14 h-14">
                  <div
                    style={{ backgroundColor: member.avatarColor || '#FF5B3A' }}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-display font-bold text-lg shadow-soft"
                  >
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>

                  {hasResponded && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-forest text-white flex items-center justify-center border-2 border-surface dark:border-surface-dark shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="font-display font-bold text-sm text-ink dark:text-ink-dark truncate">
                  {member.displayName}
                  {member.isOrganizer && (
                    <span className="ml-1 text-[10px] text-tomato font-semibold block">
                      (Host)
                    </span>
                  )}
                </div>

                <div className="text-[11px]">
                  {hasResponded ? (
                    <span className="text-forest dark:text-emerald-400 font-bold">Preferences Set</span>
                  ) : (
                    <span className="text-muted dark:text-muted-dark">Answering...</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Prompt to fill own preferences if not responded */}
        {currentMember && !currentMember.hasResponded && (
          <div className="p-4 rounded-btn bg-tomato-soft border border-tomato/30 flex items-center justify-between text-xs">
            <span className="text-ink font-semibold">
              You haven't submitted your 30-second preferences yet!
            </span>
            <button
              onClick={() => navigate(`/join/${code}`)}
              className="px-3.5 py-1.5 rounded-btn bg-tomato hover:bg-tomato-hover text-white font-bold transition-colors cursor-pointer"
            >
              Answer Now
            </button>
          </div>
        )}
      </div>

      {/* Action Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-7 rounded-card bg-surface dark:bg-surface-dark border border-line dark:border-line-dark shadow-soft">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-display font-bold text-base text-ink dark:text-ink-dark">
            Ready to find consensus?
          </h4>
          <p className="text-xs text-muted dark:text-muted-dark">
            {isOrganizer
              ? 'As organizer, you can run the decision engine once friends have joined.'
              : 'Waiting for the group organizer to trigger the decision engine...'}
          </p>
        </div>

        {isOrganizer ? (
          <button
            onClick={handleTriggerDecision}
            disabled={respondedCount === 0 || isEngineThinking}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-btn bg-tomato hover:bg-tomato-hover text-white font-display font-bold text-sm shadow-soft flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Run Decision Engine</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center space-x-2 text-xs font-bold text-tomato animate-pulse">
            <Cpu className="w-4 h-4" />
            <span>Standing by for organizer...</span>
          </div>
        )}
      </div>

      {/* Thinking Engine Modal */}
      <ThinkingEngineModal
        isOpen={isEngineThinking}
        onComplete={handleEngineComplete}
      />
    </div>
  );
};

export default GroupLobbyPage;
