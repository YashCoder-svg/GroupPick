import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const ParetoScatterChart = ({ options = [] }) => {
  if (!options || options.length === 0) return null;

  const data = options.map((opt) => ({
    name: opt.title || opt.name,
    totalSatisfaction: opt.overallScore ?? 80,
    minSatisfaction: opt.minSatisfaction ?? 70,
    cost: opt.costPerPerson ?? opt.cost ?? 20,
    archetype: opt.archetype,
    category: opt.category,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-surface dark:bg-surface-dark border border-line dark:border-line-dark p-3.5 rounded-btn shadow-card text-xs space-y-1 text-ink dark:text-ink-dark max-w-xs">
          <div className="font-display font-bold text-sm text-tomato">{d.name}</div>
          <div className="text-ink-muted dark:text-ink-mutedDark">{d.category}</div>
          <div className="flex justify-between gap-4 pt-1.5 border-t border-line dark:border-line-dark">
            <span className="text-ink-muted dark:text-ink-mutedDark">Group Avg Satisfaction:</span>
            <span className="font-bold text-ink dark:text-ink-dark">{d.totalSatisfaction}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-muted dark:text-ink-mutedDark">Fairness (Min Score):</span>
            <span className="font-bold text-forest dark:text-forest-dark">{d.minSatisfaction}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-ink-muted dark:text-ink-mutedDark">Est. Cost:</span>
            <span className="font-bold text-tomato">${d.cost} / person</span>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider pt-1 text-ink-muted">
            {d.archetype?.replace(/_/g, ' ')}
          </div>
        </div>
      );
    }
    return null;
  };

  const getArchetypeColor = (archetype) => {
    if (archetype === 'best_overall') return '#FF5B3A'; // Tomato
    if (archetype === 'fairest_to_everyone') return '#12403A'; // Deep green
    if (archetype === 'most_budget_friendly') return '#D97706'; // Warm amber
    return '#6B665C';
  };

  return (
    <div className="w-full bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-card p-6 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h4 className="font-display font-bold text-lg text-ink dark:text-ink-dark">
            Pareto Frontier Trade-Offs
          </h4>
          <p className="text-xs text-ink-muted dark:text-ink-mutedDark">
            Total satisfaction vs. fairness (minimum satisfaction of any member)
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-tomato inline-block" />
            <span className="text-ink-muted dark:text-ink-mutedDark">Best Overall</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-forest dark:bg-forest-dark inline-block" />
            <span className="text-ink-muted dark:text-ink-mutedDark">Fairest</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
            <span className="text-ink-muted dark:text-ink-mutedDark">Cheapest</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <XAxis
              type="number"
              dataKey="totalSatisfaction"
              name="Total Satisfaction"
              unit="%"
              domain={[50, 100]}
              stroke="#A8A398"
              fontSize={11}
            />
            <YAxis
              type="number"
              dataKey="minSatisfaction"
              name="Min Fairness"
              unit="%"
              domain={[40, 100]}
              stroke="#A8A398"
              fontSize={11}
            />
            <ZAxis type="number" dataKey="cost" range={[140, 280]} name="Cost" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter name="Options" data={data}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getArchetypeColor(entry.archetype)}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ParetoScatterChart;
