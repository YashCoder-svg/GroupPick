import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Lock,
  Scale,
  Clock,
  ArrowRight,
  UtensilsCrossed,
  Compass,
  Sparkles,
  ShieldCheck,
  Check,
  Ban,
} from 'lucide-react';
import SatisfactionRing from '../components/common/SatisfactionRing.jsx';

export const LandingPage = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [activeHeroOption, setActiveHeroOption] = useState(0);

  // Concrete example options for hero visual (All amounts in INR, Indian names)
  const heroOptions = [
    {
      archetype: 'Best overall',
      winner: 'Biryani House & Tandoor',
      price: '₹450 / person',
      badge: '92% avg satisfaction',
      why: "Why this: fits every budget, meets Aisha's veg need",
      friends: [
        { name: 'Aisha', initial: 'A', score: 94 },
        { name: 'Rahul', initial: 'R', score: 91 },
        { name: 'Maya', initial: 'M', score: 89 },
        { name: 'Kabir', initial: 'K', score: 95 },
      ],
    },
    {
      archetype: 'Fairest to everyone',
      winner: 'Street Falafel & Mezze',
      price: '₹380 / person',
      badge: 'Min score 88%',
      why: 'Why this: highest minimum happiness, nobody compromises too much',
      friends: [
        { name: 'Aisha', initial: 'A', score: 89 },
        { name: 'Rahul', initial: 'R', score: 92 },
        { name: 'Maya', initial: 'M', score: 88 },
        { name: 'Kabir', initial: 'K', score: 91 },
      ],
    },
    {
      archetype: 'Cheapest',
      winner: 'Dosa Plaza & Chai',
      price: '₹240 / person',
      badge: 'Best value',
      why: 'Why this: comfortably below group budget ceiling for everyone',
      friends: [
        { name: 'Aisha', initial: 'A', score: 84 },
        { name: 'Rahul', initial: 'R', score: 95 },
        { name: 'Maya', initial: 'M', score: 82 },
        { name: 'Kabir', initial: 'K', score: 87 },
      ],
    },
  ];

  const currentOption = heroOptions[activeHeroOption];

  return (
    <div className="w-full bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark transition-colors overflow-hidden">
      {/* HERO SECTION: Two Columns (55% / 45%), Gap 64px, Top Padding 80px, Align-items: start NOT center */}
      <section className="pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-10 lg:gap-16 items-start min-w-0">
          {/* Left Column (55%): Pill -> H1 -> Body -> Buttons -> 3 Trust Points */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="space-y-6 text-left min-w-0 w-full"
          >
            {/* 1. Small Pill */}
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-muted dark:text-muted-dark text-xs sm:text-sm font-medium tracking-normal">
              For trips, dinners and everything in between
            </div>

            {/* 2. H1: "Bricolage Grotesque" 700 (not 800), clamp(40px, 5.2vw, 72px), 1.08, -0.01em */}
            <h1 className="font-display font-bold text-ink dark:text-ink-dark tracking-[-0.01em] text-[clamp(34px,5.2vw,72px)] sm:text-[clamp(40px,5.2vw,72px)] leading-[1.08] text-left break-words">
              Stop arguing in the group chat. Get a plan everyone accepts.
            </h1>

            {/* 3. Body: "DM Sans" 18px / 1.6, max-width 520px */}
            <p className="font-sans text-[17px] sm:text-[18px] leading-[1.6] text-muted dark:text-muted-dark max-w-[520px] text-left">
              Share one link. Everyone adds their taste and budget privately. GroupPick returns 3 fair options with a reason for each.
            </p>

            {/* 4. Buttons: Primary "Start a group" & Text link "See how it works" with arrow */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
              <button
                onClick={() => navigate('/create')}
                className="h-[48px] px-7 rounded-[10px] bg-tomato hover:bg-tomato-hover text-white font-semibold text-[16px] transition-all shadow-sm active:scale-95 flex items-center justify-center cursor-pointer"
              >
                Start a group
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-[16px] font-semibold text-ink dark:text-ink-dark hover:text-tomato transition-colors group cursor-pointer"
              >
                <span>See how it works</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            {/* 5. Row of 3 short trust points in 15px text with simple monochrome icons */}
            <div className="pt-3 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-x-6 gap-y-2.5 text-[15px] font-medium text-muted dark:text-muted-dark">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-forest dark:text-forest shrink-0" strokeWidth={2.5} />
                <span>Answers in 30 seconds</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-forest dark:text-forest shrink-0" strokeWidth={2.5} />
                <span>Budgets stay private</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-forest dark:text-forest shrink-0" strokeWidth={2.5} />
                <span>Fair over time</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column (45%): ONE featured result card under 520px height */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="w-full max-w-lg lg:max-w-none min-w-0"
          >
            <div className="rounded-[20px] border border-line dark:border-line-dark bg-surface dark:bg-surface-dark shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 sm:p-6 transition-all min-w-0">
              {/* Card Top: Title "Dinner tonight • 4 friends" + Tabs indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-line dark:border-line-dark min-w-0">
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-forest shrink-0" />
                  <span className="text-sm font-semibold text-ink dark:text-ink-dark">
                    Dinner tonight • 4 friends
                  </span>
                </div>

                {/* Tab switcher indicator */}
                <div className="flex items-center p-0.5 rounded-[8px] bg-paper dark:bg-paper-dark border border-line dark:border-line-dark w-full sm:w-auto min-w-0">
                  {heroOptions.map((opt, idx) => (
                    <button
                      key={opt.archetype}
                      onClick={() => setActiveHeroOption(idx)}
                      className={`flex-1 sm:flex-none px-2 sm:px-2.5 py-1 rounded-[6px] text-xs transition-all font-medium cursor-pointer text-center whitespace-nowrap ${
                        activeHeroOption === idx
                          ? 'bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark shadow-sm font-semibold'
                          : 'text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark'
                      }`}
                    >
                      {idx === 1 ? (
                        <>
                          <span className="sm:hidden">Fairest</span>
                          <span className="hidden sm:inline">Fairest to everyone</span>
                        </>
                      ) : (
                        opt.archetype
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured Winner with Cross-Fade Animation */}
              <div className="py-4 min-h-[210px] min-w-0">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={activeHeroOption}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="space-y-4 min-w-0"
                  >
                    {/* Winner and Price */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 min-w-0">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-tomato uppercase tracking-wider block mb-0.5">
                          {currentOption.archetype}
                        </span>
                        <h3 className="font-display font-bold text-lg sm:text-2xl text-ink dark:text-ink-dark leading-tight break-words">
                          {currentOption.winner}
                        </h3>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-base sm:text-lg text-forest dark:text-forest">
                          {currentOption.price}
                        </span>
                      </div>
                    </div>

                    {/* 4 Avatar Circles with initials and satisfaction percentage */}
                    <div className="grid grid-cols-4 gap-2 py-1 justify-items-center">
                      {currentOption.friends.map((friend) => (
                        <div key={friend.name} className="flex flex-col items-center">
                          <SatisfactionRing
                            score={friend.score}
                            size={44}
                            strokeWidth={4.5}
                          >
                            <span className="font-bold text-xs text-ink dark:text-ink-dark">
                              {friend.initial}
                            </span>
                          </SatisfactionRing>
                          <span className="text-xs font-medium text-ink dark:text-ink-dark mt-1">
                            {friend.name}
                          </span>
                          <span className="text-[11px] font-semibold text-muted dark:text-muted-dark">
                            {friend.score}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Why this line */}
                    <p className="text-[13px] text-muted dark:text-muted-dark leading-snug bg-paper dark:bg-paper-dark border border-line dark:border-line-dark rounded-[10px] px-3.5 py-2.5">
                      {currentOption.why}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Two smaller collapsed rows for the other two options */}
              <div className="pt-3 border-t border-line dark:border-line-dark space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-muted-dark px-0.5">
                  Other explained options
                </div>
                {heroOptions.map((opt, idx) => {
                  if (idx === activeHeroOption) return null;
                  return (
                    <button
                      key={opt.archetype}
                      onClick={() => setActiveHeroOption(idx)}
                      className="w-full text-left p-2.5 rounded-[10px] bg-paper dark:bg-paper-dark hover:bg-surface-subtle dark:hover:bg-surface-subtleDark border border-line dark:border-line-dark transition-all flex items-center justify-between group cursor-pointer overflow-hidden"
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-muted dark:text-muted-dark shrink-0">
                          {idx === 1 ? (
                            <>
                              <span className="sm:hidden">Fairest</span>
                              <span className="hidden sm:inline">Fairest to everyone</span>
                            </>
                          ) : (
                            opt.archetype
                          )}
                        </span>
                        <span className="text-sm font-medium text-ink dark:text-ink-dark truncate group-hover:text-tomato transition-colors">
                          {opt.winner}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 text-xs">
                        <span className="hidden sm:inline font-medium text-muted dark:text-muted-dark">
                          {opt.price}
                        </span>
                        <span className="font-bold text-forest dark:text-forest">
                          {opt.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: "SOUND FAMILIAR?" (Chat Bubbles + Problem Statement) */}
      <section className="py-24 bg-surface dark:bg-surface-dark border-y border-line dark:border-line-dark transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-3 text-left sm:text-center">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink dark:text-ink-dark tracking-display">
              Sound familiar?
            </h2>
            <p className="text-[17px] text-muted dark:text-muted-dark max-w-xl mx-auto">
              Every group chat has lived through this conversation at 6:30 PM.
            </p>
          </div>

          {/* 3 Relatable Chat Bubbles */}
          <div className="space-y-4 max-w-xl mx-auto">
            {/* Bubble 1 */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#E8DFCF] dark:bg-[#343026] text-ink dark:text-ink-dark flex items-center justify-center font-bold text-xs shrink-0">
                P
              </div>
              <div className="bg-paper dark:bg-paper-dark border border-line dark:border-line-dark p-4 rounded-2xl rounded-tl-sm text-[16px] text-ink dark:text-ink-dark max-w-md shadow-sm">
                “Anyone have ideas for food tonight? Idk you pick 🤷‍♂️”
              </div>
            </div>

            {/* Bubble 2 */}
            <div className="flex items-start justify-end space-x-3">
              <div className="bg-tomato-tint dark:bg-tomato-darkTint border border-tomato/20 p-4 rounded-2xl rounded-tr-sm text-[16px] text-ink dark:text-ink-dark max-w-md shadow-sm">
                “That place looks great, but is it too expensive? I'm trying to be careful this month.”
              </div>
              <div className="w-8 h-8 rounded-full bg-tomato text-white flex items-center justify-center font-bold text-xs shrink-0">
                R
              </div>
            </div>

            {/* Bubble 3 */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center font-bold text-xs shrink-0">
                M
              </div>
              <div className="bg-paper dark:bg-paper-dark border border-line dark:border-line-dark p-4 rounded-2xl rounded-tl-sm text-[16px] text-ink dark:text-ink-dark max-w-md shadow-sm">
                “Wait, why do we always end up going where Rahul wants? Can we do vegetarian?”
              </div>
            </div>
          </div>

          {/* Clean Transition into Solution */}
          <div className="pt-6 text-center max-w-2xl mx-auto">
            <p className="text-lg text-muted dark:text-muted-dark leading-relaxedBody">
              Group decisions stall because people are polite, budgets vary, and someone always quietly compromises. GroupPick balances the group so you can stop debating and just enjoy dinner.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS (3 Numbered Steps) */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="space-y-3 text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-tomato">
            How It Works
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink dark:text-ink-dark tracking-display">
            From group link to consensus in three steps.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="p-8 rounded-card border border-line dark:border-line-dark bg-surface dark:bg-surface-dark space-y-4">
            <div className="w-10 h-10 rounded-btn bg-paper dark:bg-paper-dark border border-line dark:border-line-dark flex items-center justify-center font-display font-bold text-lg text-tomato">
              1
            </div>
            <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
              Share the link
            </h3>
            <p className="text-[17px] text-muted dark:text-muted-dark leading-relaxedBody">
              Pick a domain (Food, Trip, or Custom) and drop one shareable URL into WhatsApp. Friends join with just a name.
            </p>
            <div className="pt-2">
              <span className="text-xs font-mono px-3 py-1.5 rounded-btn bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-ink dark:text-ink-dark inline-block">
                grouppick.app/join/GP-PARIS
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-8 rounded-card border border-line dark:border-line-dark bg-surface dark:bg-surface-dark space-y-4">
            <div className="w-10 h-10 rounded-btn bg-paper dark:bg-paper-dark border border-line dark:border-line-dark flex items-center justify-center font-display font-bold text-lg text-tomato">
              2
            </div>
            <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
              30-second private input
            </h3>
            <p className="text-[17px] text-muted dark:text-muted-dark leading-relaxedBody">
              Each friend confidentially sets their maximum budget, dietary rules (vegetarian, halal), and soft wishes.
            </p>
            <div className="pt-2 flex items-center space-x-2 text-xs text-forest dark:text-forest font-semibold">
              <ShieldCheck className="w-4 h-4 text-forest dark:text-forest" />
              <span>Budgets stay 100% confidential</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-8 rounded-card border border-line dark:border-line-dark bg-surface dark:bg-surface-dark space-y-4">
            <div className="w-10 h-10 rounded-btn bg-paper dark:bg-paper-dark border border-line dark:border-line-dark flex items-center justify-center font-display font-bold text-lg text-tomato">
              3
            </div>
            <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
              Get 3 fair options
            </h3>
            <p className="text-[17px] text-muted dark:text-muted-dark leading-relaxedBody">
              GroupPick balances overall happiness, fairness, and budgets. You get 3 clear choices with plain-language explanations.
            </p>
            <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-tomato">
              <span>Best overall &bull; Fairest &bull; Cheapest</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: THE KEY DIFFERENCES (Large Spaced Cards with Concrete Examples) */}
      <section className="py-24 bg-surface dark:bg-surface-dark border-y border-line dark:border-line-dark transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="space-y-3 text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-tomato">
              The Key Differences
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink dark:text-ink-dark tracking-display">
              Four reasons this actually works with groups.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Differentiator 1: Private Budgets */}
            <div className="p-8 rounded-card border border-line dark:border-line-dark bg-paper dark:bg-paper-dark space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-btn bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-tomato">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
                  Strictly Private Budgets
                </h3>
              </div>
              <p className="text-[17px] text-muted dark:text-muted-dark leading-relaxedBody">
                Talking about money with friends can be awkward. Every member sliders their private ceiling confidentially. The app never exposes personal numbers to friends.
              </p>
              <div className="p-4 rounded-xl bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-sm space-y-1.5">
                <span className="font-bold text-xs uppercase text-muted tracking-wider block">
                  Concrete Example
                </span>
                <p className="text-ink dark:text-ink-dark">
                  Rahul has ₹500 max, Priya has ₹1,200. The group only sees that options must fit under a <strong>₹500 group ceiling</strong>. Nobody knows who set ₹500.
                </p>
              </div>
            </div>

            {/* Differentiator 2: Fairness Memory */}
            <div className="p-8 rounded-card border border-line dark:border-line-dark bg-paper dark:bg-paper-dark space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-btn bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-forest dark:text-forest">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
                  The Fairness Ledger
                </h3>
              </div>
              <p className="text-[17px] text-muted dark:text-muted-dark leading-relaxedBody">
                Persisted across hangouts. When someone compromises on a Friday night, the app remembers and gives them higher priority in the next decision.
              </p>
              <div className="p-4 rounded-xl bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-sm space-y-1.5">
                <span className="font-bold text-xs uppercase text-muted tracking-wider block">
                  Concrete Example
                </span>
                <p className="text-ink dark:text-ink-dark">
                  Maya compromised last week when the group picked pizza. Tonight, her weight is <strong>1.25x</strong>, ensuring her preferences lead the recommendation.
                </p>
              </div>
            </div>

            {/* Differentiator 3: Hard Limits vs Soft Wishes */}
            <div className="p-8 rounded-card border border-line dark:border-line-dark bg-paper dark:bg-paper-dark space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-btn bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-tomato">
                  <Ban className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
                  Hard Limits vs. Soft Wishes
                </h3>
              </div>
              <p className="text-[17px] text-muted dark:text-muted-dark leading-relaxedBody">
                Most voting apps treat dietary rules and vibe preferences identically. GroupPick enforces a strict filter so no one gets excluded.
              </p>
              <div className="p-4 rounded-xl bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-sm space-y-1.5">
                <span className="font-bold text-xs uppercase text-muted tracking-wider block">
                  Concrete Example
                </span>
                <p className="text-ink dark:text-ink-dark">
                  Aisha's vegetarian rule <strong>strictly eliminates</strong> non-veg options. Kabir's wish for outdoor seating <strong>only adds score</strong> without disqualifying.
                </p>
              </div>
            </div>

            {/* Differentiator 4: Three Explained Options */}
            <div className="p-8 rounded-card border border-line dark:border-line-dark bg-paper dark:bg-paper-dark space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-btn bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-forest dark:text-forest">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
                  Three Explained Options
                </h3>
              </div>
              <p className="text-[17px] text-muted dark:text-muted-dark leading-relaxedBody">
                A single recommendation feels like a black box. GroupPick returns top balanced picks with transparent, plain-language explanations.
              </p>
              <div className="p-4 rounded-xl bg-surface dark:bg-surface-dark border border-line dark:border-line-dark text-sm space-y-1.5">
                <span className="font-bold text-xs uppercase text-muted tracking-wider block">
                  Concrete Example
                </span>
                <p className="text-ink dark:text-ink-dark">
                  Choose between <strong>Best Overall</strong> (highest group happiness), <strong>Fairest</strong> (highest minimum score), or <strong>Cheapest</strong> (₹240/person).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: DECISION PACKS (Distinct Cards with Real Details) */}
      <section id="packs" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="space-y-3 text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-tomato">
            Plug-in Domains
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink dark:text-ink-dark tracking-display">
            Built for dinners, trips, and everything else.
          </h2>
          <p className="text-[17px] text-muted dark:text-muted-dark">
            The decision system is domain-independent. Pick a pack to start.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Food Pack */}
          <div
            onClick={() => navigate('/create?pack=food')}
            className="cursor-pointer p-8 rounded-card border border-line dark:border-line-dark bg-surface dark:bg-surface-dark hover:border-tomato transition-all group space-y-6 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-btn bg-tomato-tint dark:bg-tomato-darkTint text-tomato flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
                Food & Dining Pack
              </h3>
              <p className="text-[16px] text-muted dark:text-muted-dark leading-relaxedBody">
                Where should we eat tonight? Balances veg, halal, and budget tiers across verified restaurants in Mumbai, Delhi, or Bengaluru.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-muted font-medium">
                  Dietary filters
                </span>
                <span className="px-2.5 py-1 rounded-md bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-muted font-medium">
                  Price tiers (₹ to ₹₹₹₹)
                </span>
                <span className="px-2.5 py-1 rounded-md bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-muted font-medium">
                  OpenStreetMap places
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-line dark:border-line-dark flex items-center justify-between text-sm font-semibold text-tomato group-hover:translate-x-0.5 transition-transform">
              <span>Start Food Decision</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Trip Pack */}
          <div
            onClick={() => navigate('/create?pack=trip')}
            className="cursor-pointer p-8 rounded-card border border-line dark:border-line-dark bg-surface dark:bg-surface-dark hover:border-forest transition-all group space-y-6 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-btn bg-forest-tint dark:bg-forest-darkTint text-forest dark:text-forest flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
                Trip & Day Route Pack
              </h3>
              <p className="text-[16px] text-muted dark:text-muted-dark leading-relaxedBody">
                Plan attractions and sights with friends. GroupPick schedules stops into an optimized day route with travel times and opening hours.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-muted font-medium">
                  Interactive Leaflet map
                </span>
                <span className="px-2.5 py-1 rounded-md bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-muted font-medium">
                  Day route order
                </span>
                <span className="px-2.5 py-1 rounded-md bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-muted font-medium">
                  Opening hours
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-line dark:border-line-dark flex items-center justify-between text-sm font-semibold text-forest dark:text-forest group-hover:translate-x-0.5 transition-transform">
              <span>Plan Day Route</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Custom Pack */}
          <div
            onClick={() => navigate('/create?pack=custom')}
            className="cursor-pointer p-8 rounded-card border border-line dark:border-line-dark bg-surface dark:bg-surface-dark hover:border-tomato transition-all group space-y-6 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-btn bg-tomato-tint dark:bg-tomato-darkTint text-tomato flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-2xl text-ink dark:text-ink-dark">
                Custom Options Pack
              </h3>
              <p className="text-[16px] text-muted dark:text-muted-dark leading-relaxedBody">
                Decide movies, gifts, board games, or pitches. Add your own candidates with costs and tags. Standalone with zero external API dependencies.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-muted font-medium">
                  Type custom choices
                </span>
                <span className="px-2.5 py-1 rounded-md bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-muted font-medium">
                  Fair vote weighting
                </span>
                <span className="px-2.5 py-1 rounded-md bg-paper dark:bg-paper-dark border border-line dark:border-line-dark text-muted font-medium">
                  No external APIs needed
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-line dark:border-line-dark flex items-center justify-between text-sm font-semibold text-tomato group-hover:translate-x-0.5 transition-transform">
              <span>Decide Anything</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FINAL CTA BAND (Tomato Accent Background) */}
      <section className="bg-tomato py-20 px-4 sm:px-6 lg:px-8 text-center text-white">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-display">
            Start your next group pick in under a minute.
          </h2>
          <p className="text-lg text-white/90 max-w-xl mx-auto font-normal">
            No credit card, no sign-up required for your friends. Just share a link and let GroupPick find the best plan.
          </p>
          <div className="pt-4">
            <button
              onClick={() => navigate('/create')}
              className="min-h-[48px] px-8 py-3.5 rounded-btn bg-white hover:bg-paper text-ink font-bold text-base transition-all shadow-card active:scale-95 inline-flex items-center space-x-2 cursor-pointer"
            >
              <span>Start a group</span>
              <ArrowRight className="w-4 h-4 text-tomato" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

