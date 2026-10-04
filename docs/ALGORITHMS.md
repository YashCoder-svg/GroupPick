# GroupPick: Decision Engine & Fairness Algorithms

This document provides a rigorous mathematical and conceptual breakdown of the social choice algorithms, privacy protections, and dynamic fairness weighting implemented in the GroupPick Decision Engine (`/server/src/engine`).

---

## 1. Algorithmic Pipeline Overview

```
                                  [ Candidate Options ]
                                            │
                                            ▼
[ Private Budgets & Hard Limits ] ──► [ 1. Hard Filter ] ──► [ Eliminated Stats & Bottleneck Suggestions ]
                                            │ (Feasible Set)
                                            ▼
[ Soft Wishes, Ratings, Ranks ] ───► [ 2. Satisfaction Matrix (0-100) ]
                                            │
[ Historical Fairness Ledger ] ───► [ 3. Dynamic Weight Normalization ]
                                            │
                                            ▼
                               [ 4. Weighted Social Welfare Matrix ]
                                            │
                                ┌───────────┴───────────┐
                                ▼                       ▼
                        [ Utilitarian Sum ]     [ Rawlsian Maximin ]
                        [ Nash Product    ]     [ Borda Count      ]
                                └───────────┬───────────┘
                                            ▼
                                [ 5. Pareto Frontier ]
                                            │
                                            ▼
                                [ 6. Three Archetypes ]
                       ├── Best Overall (Maximum Group Utility)
                       ├── Fairest to Everyone (Maximum Worst-Off Score)
                       └── Most Budget-Friendly (Minimal Cost on Frontier)
                                            │
                                            ▼
                              [ 7. Explanation Generator ]
                              [ 8. Time-Window TSP Day Route ]
```

---

## 2. Hard-Constraint Filtering & Private Budgets

### Hard Limits vs. Soft Wishes
- **Hard Limits**: Binary disqualifiers. If *any single member* specifies a hard constraint that an option does not satisfy, that option is immediately removed from the candidate pool.
  - Examples: `vegan`, `halal`, `celiac-safe`, `wheelchair-accessible`, `max-budget`.
- **Soft Wishes**: Non-disqualifying preferences. If an option does not meet a soft wish, it remains eligible but receives fewer points in the satisfaction matrix.
  - Examples: `outdoor-seating`, `craft-beer`, `quiet`, `view`.

### The Private Budget Guarantee
Let group members $M = \{m_1, m_2, \dots, m_n\}$ each have a private budget $B_i \in \mathbb{R}^+$.

1. **Feasible Group Ceiling**:
   $$B_{\text{ceiling}} = \min_{i \in M} B_i$$
2. **Hard Elimination Rule**:
   $$\text{Candidate } c \text{ is feasible} \iff \text{Cost}(c) \le B_{\text{ceiling}}$$
3. **Information Security**:
   - The API **never** transmits individual $B_i$ to peers or in the public status endpoint.
   - The group status endpoint only transmits $B_{\text{ceiling}}$ as an aggregate boundary.
   - No peer can deduce who set the floor or ceiling.

### Edge Case: Zero Feasible Candidates (Constraint Relaxation)
When $\text{FeasibleSet} = \emptyset$, the engine computes constraint elimination bottlenecks:
$$\Delta_{\text{budget}} = \min_{c \in C} \text{Cost}(c) - B_{\text{ceiling}}$$
The engine suggests:
> *"No option fits all constraints. Raising the group ceiling by $\$ \Delta_{\text{budget}}$ unlocks $K$ candidates, or relaxing '$X$' unlocks $M$ candidates."*

---

## 3. Satisfaction Matrix Computation ($S_{i, j}$)

For member $m_i$ and candidate option $c_j$, the normalized satisfaction score $S_{i, j} \in [0, 100]$ is computed as:

$$S_{i, j} = \text{Clamp}\Big( S_{\text{base}} + S_{\text{budget}} + S_{\text{wishes}} + S_{\text{rank}} + S_{\text{quality}}, 0, 100 \Big)$$

Where:
- $S_{\text{base}} = 40$ (baseline reward for clearing all hard constraints).
- $S_{\text{budget}} \in [0, 25]$:
  $$\text{Ratio} = \frac{\text{Cost}(c_j)}{B_i}$$
  - $0.40 \le \text{Ratio} \le 0.85 \implies 25$ pts (sweet spot).
  - $\text{Ratio} < 0.40 \implies 22$ pts (great savings).
  - $\text{Ratio} > 0.85 \implies 18$ pts (close to budget ceiling).
- $S_{\text{wishes}} \in [0, 25]$:
  $$S_{\text{wishes}} = 25 \times \frac{|\text{Wishes}(m_i) \cap \text{Attributes}(c_j)|}{|\text{Wishes}(m_i)|}$$
- $S_{\text{rank}} \in [0, 15]$:
  - Ranked #1: $+15$ pts
  - Ranked #2: $+10$ pts
  - Ranked #3: $+6$ pts
- $S_{\text{quality}} \in [0, 10]$:
  $$S_{\text{quality}} = \min\left(10, \text{round}\left(\frac{\text{Rating}(c_j)}{5} \times 10\right)\right)$$

---

## 4. The Fairness Ledger: Dynamic Weighting

To prevent recurring tyranny of the majority, each member has a persistent weight $w_i \in [0.80, 1.30]$ recorded in the `FairnessLedger` collection.

### Dynamic Weight Update Rule
After the group confirms winning option $c^*$:
- **If member's top choice won** (or satisfaction $\ge 85\%$):
  $$w_i^{(t+1)} = \max\Big(0.85, \text{round}(w_i^{(t)} - 0.10, 2)\Big)$$
- **If member compromised** (top choice lost and satisfaction $< 85\%$):
  $$w_i^{(t+1)} = \min\Big(1.30, \text{round}(w_i^{(t)} + 0.15, 2)\Big)$$

### Group Weight Normalization
Before applying weights to satisfaction scores, weights are normalized around 1.0:
$$\bar{w} = \frac{1}{|M|} \sum_{i \in M} w_i, \qquad \hat{w}_i = \frac{w_i}{\bar{w}}$$
$$\tilde{S}_{i, j} = \text{Clamp}\Big( \text{round}(S_{i, j} \times \hat{w}_i), 0, 100 \Big)$$

---

## 5. Social Welfare Aggregation Strategies

GroupPick supports 4 formal social choice strategies:

| Strategy | Objective Function | Mathematical Formulation | Philosophy |
| :--- | :--- | :--- | :--- |
| **Utilitarian** | Maximize Sum | $W_{\text{util}}(c_j) = \sum_{i=1}^n \tilde{S}_{i, j}$ | Benthamite maximum total happiness |
| **Maximin** | Maximize Minimum | $W_{\text{maximin}}(c_j) = \min_{i \in M} \tilde{S}_{i, j}$ | Rawlsian egalitarianism; protects worst-off |
| **Nash Welfare** | Maximize Geometric Mean | $W_{\text{nash}}(c_j) = \exp\left( \frac{1}{n} \sum_{i=1}^n \ln(\tilde{S}_{i, j} + 1) \right) - 1$ | Balances efficiency with equity |
| **Borda Count** | Positional Ranking | $W_{\text{borda}}(c_j) = \sum_{i=1}^n (|C| - 1 - \text{Rank}_{i}(c_j))$ | Standard ranked-choice consensus |

---

## 6. Pareto Frontier & The 3 Final Archetypes

### Pareto Dominance
Candidate $B$ dominates $A$ ($B \succ_{\text{Pareto}} A$) if and only if:
1. $W_{\text{util}}(B) \ge W_{\text{util}}(A)$
2. $\min_i \tilde{S}_{i}(B) \ge \min_i \tilde{S}_{i}(A)$
3. $\text{Cost}(B) \le \text{Cost}(A)$
4. At least one inequality is strict ($>$ or $<$).

The Pareto frontier $\mathcal{P}$ consists of all non-dominated candidates. From $\mathcal{P}$, the engine extracts 3 distinct archetypes:

1. **Best Overall** (`best_overall`):
   $$\arg\max_{c \in \mathcal{P}} W_{\text{strategy}}(c)$$
2. **Fairest to Everyone** (`fairest_to_everyone`):
   $$\arg\max_{c \in \mathcal{P} \setminus \{\text{Best}\}} \min_{i} \tilde{S}_{i}(c)$$
3. **Most Budget-Friendly** (`most_budget_friendly`):
   $$\arg\min_{c \in \mathcal{P} \setminus \{\text{Best, Fairest}\}} \text{Cost}(c)$$

---

## 7. Worked Example: Asha, Ravi, and Maya

Let 3 friends decide on dinner:
- **Asha**: Hard limit = `vegan`, Budget = $\$35$, Wishes = `['cozy', 'organic']`. (Last decision: Won, weight = $0.95$).
- **Ravi**: Hard limit = `halal`, Budget = $\$22$, Wishes = `['casual']`. (Last decision: Lost, weight = $1.20$).
- **Maya**: Hard limits = None, Budget = $\$45$, Wishes = `['wine', 'outdoor']`. (Weight = $1.00$).

### Step 1: Feasible Budget Ceiling
$$B_{\text{ceiling}} = \min(35, 22, 45) = \$22$$
All restaurants costing $> \$22$ are strictly eliminated. Ravi's budget is satisfied, but nobody knows who set $\$22$.

### Step 2: Weight Normalization
$$\text{Mean Weight } \bar{w} = \frac{0.95 + 1.20 + 1.00}{3} = 1.05$$
$$\hat{w}_{\text{Asha}} = \frac{0.95}{1.05} = 0.905, \quad \hat{w}_{\text{Ravi}} = \frac{1.20}{1.05} = 1.143, \quad \hat{w}_{\text{Maya}} = \frac{1.00}{1.05} = 0.952$$

### Step 3: Candidate Scoring
Suppose two feasible candidates remain under $\$22$:
- **Option A (Falafel Corner, \$14)**: Vegan, Halal, Kosher.
  - Raw scores: Asha = $84$, Ravi = $88$, Maya = $80$.
  - Weighted scores: Asha = $76$, Ravi = $100$, Maya = $76$.
  - Sum = $252$, Min = $76$, Cost = $\$14$.
- **Option B (Craft Ramen, \$22)**: Vegan broth, Halal chicken, Outdoor.
  - Raw scores: Asha = $90$, Ravi = $80$, Maya = $92$.
  - Weighted scores: Asha = $81$, Ravi = $91$, Maya = $88$.
  - Sum = $260$, Min = $81$, Cost = $\$22$.

### Step 4: Pareto Selection & Explanations
- **Best Overall**: Option B (Highest weighted sum = $260$).
- **Fairest to Everyone**: Option B (Highest min score = $81$).
- **Most Budget-Friendly**: Option A (Lowest cost = $\$14$).
- **Fairness Note**: Ravi's weight ($1.143\text{x}$) boosted Option A's score for him to $100\%$, ensuring his compromise from last time gave him heavy influence today!

---

## 8. Time-Window-Aware TSP Route Optimizer (Trip Pack)

For the Trip Pack, places must be scheduled into a feasible day itinerary:
1. **Haversine Distance**:
   $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
2. **Nearest-Neighbor Construction**:
   Starts at morning departure time ($t_0$), iteratively selects place $p$ minimizing:
   $$\text{Cost}(p) = \text{TravelTime} + \max(0, \text{OpenTime}(p) - t_{\text{arrival}})$$
3. **2-Opt Local Search**:
   Iteratively tests reversing segments $(i, k)$ to eliminate route crossings while verifying closing times.
