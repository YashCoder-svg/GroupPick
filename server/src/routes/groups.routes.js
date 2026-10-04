import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { Group } from '../models/Group.js';
import { Member } from '../models/Member.js';
import { Preference } from '../models/Preference.js';
import { Decision } from '../models/Decision.js';
import { FairnessLedger } from '../models/FairnessLedger.js';
import {
  optionalOrganizerAuth,
  requireMemberAuth,
  requireGroupOrganizer,
} from '../middleware/auth.js';
import { runDecisionPipeline } from '../engine/index.js';
import { getPlacesForDestination } from '../services/placesService.js';

const router = express.Router();

const generateGroupCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'GP-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const createGroupSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  packId: z.enum(['food', 'trip', 'custom']),
  organizerName: z.string().min(1, 'Organizer name is required').max(50),
  destination: z
    .object({
      name: z.string(),
      state: z.string().optional().default(''),
      lat: z.number(),
      lng: z.number(),
      bbox: z.array(z.number()).optional().default([]),
    })
    .optional(),
  packConfig: z
    .object({
      city: z.string().optional(),
      centerLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
      date: z.string().optional(),
      timeRange: z.object({ start: z.string(), end: z.string() }).optional(),
      maxBudgetCap: z.number().optional(),
      customOptions: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            category: z.string().optional(),
            cost: z.number().default(0),
            tags: z.array(z.string()).default([]),
            openingHours: z.object({ open: z.string(), close: z.string() }).optional(),
          })
        )
        .optional(),
    })
    .optional(),
  strategy: z.enum(['utilitarian', 'maximin', 'nash', 'borda']).default('utilitarian'),
});

const preferenceSchema = z.object({
  budget: z.number().min(0, 'Budget cannot be negative'),
  hardLimits: z.array(z.string()).default([]),
  softWishes: z.array(z.string()).default([]),
  rankedPicks: z.array(z.string()).default([]),
  customNotes: z.string().max(280).optional(),
});

// Helper to find group by ID or Code
const findGroupByIdOrCode = async (idOrCode) => {
  if (!idOrCode) return null;
  if (/^[0-9a-fA-F]{24}$/.test(idOrCode)) {
    const byId = await Group.findById(idOrCode);
    if (byId) return byId;
  }
  return Group.findOne({ code: idOrCode.toUpperCase() });
};

// 1. Create a new decision group
router.post('/', optionalOrganizerAuth, async (req, res, next) => {
  try {
    const validated = createGroupSchema.parse(req.body);

    let code = generateGroupCode();
    while (await Group.findOne({ code })) {
      code = generateGroupCode();
    }

    const organizerToken = crypto.randomUUID();

    const destination = validated.destination || {
      name: validated.packConfig?.city || 'Delhi',
      state: 'Delhi',
      lat: validated.packConfig?.centerLocation?.lat || 28.6139,
      lng: validated.packConfig?.centerLocation?.lng || 77.209,
      bbox: [],
    };

    const packConfig = {
      ...(validated.packConfig || {}),
      city: destination.name,
      centerLocation: { lat: destination.lat, lng: destination.lng },
    };

    const group = await Group.create({
      code,
      title: validated.title,
      packId: validated.packId,
      destination,
      packConfig,
      strategy: validated.strategy,
      organizerToken,
      organizerId: req.user?._id || null,
      status: 'collecting',
    });

    // If Food or Trip pack, pre-fetch/cache places around destination (non-blocking)
    if (group.packId !== 'custom') {
      getPlacesForDestination({
        destinationName: destination.name,
        lat: destination.lat,
        lng: destination.lng,
        radius: 5000,
        packType: group.packId,
      }).catch((err) => {
        console.warn('[Pre-fetch Places Warning]', err.message);
      });
    }

    const guestToken = crypto.randomUUID();
    const organizerMember = await Member.create({
      groupId: group._id,
      guestToken,
      displayName: validated.organizerName,
      isOrganizer: true,
      hasResponded: false,
      avatarColor: '#6366F1', // Indigo accent
    });

    // Initialize fairness ledger for organizer
    await FairnessLedger.create({
      groupId: group._id,
      memberId: organizerMember._id,
      displayName: organizerMember.displayName,
      timesTopChoiceWon: 0,
      timesTopChoiceLost: 0,
      currentWeight: 1.0,
      history: [],
    });

    const host = req.get('host') || 'localhost:5173';
    const protocol = req.protocol;
    const shareUrl = `${protocol}://${host}/join/${group.code}`;

    res.status(201).json({
      group,
      member: {
        _id: organizerMember._id,
        displayName: organizerMember.displayName,
        isOrganizer: true,
        avatarColor: organizerMember.avatarColor,
        hasResponded: false,
      },
      guestToken,
      organizerToken,
      shareUrl,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Get group details & public member list (zero private data leaked)
router.get('/:id', async (req, res, next) => {
  try {
    const group = await findGroupByIdOrCode(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members = await Member.find(
      { groupId: group._id },
      { _id: 1, displayName: 1, avatarColor: 1, isOrganizer: 1, hasResponded: 1, joinedAt: 1 }
    ).sort({ joinedAt: 1 });

    // If caller provided their member token, return their own identity & own preferences
    const memberToken = req.headers['x-member-token'] || 
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

    let currentMember = null;
    let myPreference = null;

    if (memberToken) {
      const found = await Member.findOne({ groupId: group._id, guestToken: memberToken });
      if (found) {
        currentMember = {
          _id: found._id,
          displayName: found.displayName,
          isOrganizer: found.isOrganizer,
          avatarColor: found.avatarColor,
          hasResponded: found.hasResponded,
        };

        const pref = await Preference.findOne({ groupId: group._id, memberId: found._id });
        if (pref) {
          myPreference = {
            budget: pref.budget,
            hardLimits: pref.hardLimits,
            softWishes: pref.softWishes,
            rankedPicks: pref.rankedPicks,
            customNotes: pref.customNotes,
            submittedAt: pref.submittedAt,
          };
        }
      }
    }

    res.json({
      group,
      members,
      currentMember,
      myPreference,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Join a group with just a name (no signup required)
router.post('/:id/join', async (req, res, next) => {
  try {
    const group = await findGroupByIdOrCode(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const joinSchema = z.object({
      displayName: z.string().min(1, 'Display name is required').max(50),
      avatarColor: z.string().optional(),
    });

    const validated = joinSchema.parse(req.body);

    const colors = ['#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#3B82F6', '#14B8A6'];
    const chosenColor = validated.avatarColor || colors[Math.floor(Math.random() * colors.length)];

    const guestToken = crypto.randomUUID();

    const member = await Member.create({
      groupId: group._id,
      guestToken,
      displayName: validated.displayName.trim(),
      avatarColor: chosenColor,
      isOrganizer: false,
      hasResponded: false,
    });

    // Initialize fairness ledger for new member
    await FairnessLedger.create({
      groupId: group._id,
      memberId: member._id,
      displayName: member.displayName,
      timesTopChoiceWon: 0,
      timesTopChoiceLost: 0,
      currentWeight: 1.0,
      history: [],
    });

    const publicMember = {
      _id: member._id,
      displayName: member.displayName,
      avatarColor: member.avatarColor,
      isOrganizer: false,
      hasResponded: false,
      joinedAt: member.joinedAt,
    };

    // Emit live socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${group._id}`).emit('member:joined', { member: publicMember });
    }

    res.status(201).json({
      member: publicMember,
      guestToken,
      groupId: group._id,
      groupCode: group.code,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Submit private preferences (authenticated by member guest token)
router.put('/:id/preferences', requireMemberAuth, async (req, res, next) => {
  try {
    const validated = preferenceSchema.parse(req.body);
    const member = req.member;
    const group = req.group || (await Group.findById(member.groupId));

    const pref = await Preference.findOneAndUpdate(
      { groupId: group._id, memberId: member._id },
      {
        budget: validated.budget,
        hardLimits: validated.hardLimits,
        softWishes: validated.softWishes,
        rankedPicks: validated.rankedPicks,
        customNotes: validated.customNotes || '',
        submittedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update member responded status
    await Member.findByIdAndUpdate(member._id, { hasResponded: true });

    // Emit live socket event (CRITICAL: ZERO PRIVATE BUDGET OR PREFERENCE LEAKED!)
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${group._id}`).emit('member:responded', {
        memberId: member._id,
        displayName: member.displayName,
        hasResponded: true,
      });
    }

    res.json({
      success: true,
      message: 'Preferences saved securely. Your private budget is strictly confidential.',
      hasResponded: true,
    });
  } catch (err) {
    next(err);
  }
});

// 5. Get aggregate response progress and feasible budget ceiling (Zero private leakage)
router.get('/:id/status', async (req, res, next) => {
  try {
    const group = await findGroupByIdOrCode(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members = await Member.find(
      { groupId: group._id },
      { _id: 1, displayName: 1, avatarColor: 1, isOrganizer: 1, hasResponded: 1, joinedAt: 1 }
    ).sort({ joinedAt: 1 });

    const preferences = await Preference.find({ groupId: group._id });

    // Aggregate feasible budget range computation
    // The group ceiling is the MINIMUM budget set by any responding member.
    // If Ravi set $20, Asha $40, Maya $60 -> Group Ceiling is $20.
    // Nobody learns who set $20!
    let feasibleBudgetRange = null;
    const budgets = preferences
      .map((p) => p.budget)
      .filter((b) => typeof b === 'number' && !isNaN(b));

    if (budgets.length > 0) {
      feasibleBudgetRange = {
        min: Math.min(...budgets),
        max: Math.max(...budgets),
        groupCeiling: Math.min(...budgets), // Ceiling that satisfies everyone
        totalSubmittedBudgets: budgets.length,
      };
    }

    const totalMembers = members.length;
    const respondedCount = preferences.length;
    const allResponded = totalMembers > 0 && respondedCount >= totalMembers;

    res.json({
      groupId: group._id,
      groupCode: group.code,
      status: group.status,
      totalMembers,
      respondedCount,
      allResponded,
      feasibleBudgetRange,
      members,
    });
  } catch (err) {
    next(err);
  }
});

// 6. Run the decision engine (organizer only)
router.post('/:id/decide', requireGroupOrganizer, async (req, res, next) => {
  try {
    const group = req.group;
    const requestedStrategy = req.body?.strategy || group.strategy || 'utilitarian';

    // Fetch members and their preferences
    const members = await Member.find({ groupId: group._id });
    const preferences = await Preference.find({ groupId: group._id });
    const fairnessLedgers = await FairnessLedger.find({ groupId: group._id });

    if (preferences.length === 0) {
      return res.status(400).json({
        error: 'Cannot make a decision yet: No group members have submitted preferences.',
      });
    }

    const decisionResult = await runDecisionPipeline({
      group,
      members,
      preferences,
      fairnessLedgers,
      strategy: requestedStrategy,
    });

    // Save decision document
    const decision = await Decision.create({
      groupId: group._id,
      packId: group.packId,
      status: 'draft',
      strategyUsed: requestedStrategy,
      options: decisionResult.options,
      aggregateBudgetFeasibleRange: decisionResult.aggregateBudgetFeasibleRange,
      inputsSnapshot: decisionResult.inputsSnapshot,
    });

    // Update group status and pointer
    group.status = 'decided';
    group.strategy = requestedStrategy;
    group.latestDecisionId = decision._id;
    await group.save();

    // Emit live socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${group._id}`).emit('decision:ready', {
        decisionId: decision._id,
        optionsCount: decision.options.length,
      });
    }

    res.json(decision);
  } catch (err) {
    next(err);
  }
});

// 7. Get decisions for group
router.get('/:id/decisions', async (req, res, next) => {
  try {
    const group = await findGroupByIdOrCode(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const decisions = await Decision.find({ groupId: group._id }).sort({ createdAt: -1 });
    res.json(decisions);
  } catch (err) {
    next(err);
  }
});

// 8. Confirm decision and update Fairness Ledger
router.post('/decisions/:decisionId/confirm', async (req, res, next) => {
  try {
    const { decisionId } = req.params;
    const { selectedOptionId } = req.body;

    if (!selectedOptionId) {
      return res.status(400).json({ error: 'selectedOptionId is required' });
    }

    const decision = await Decision.findById(decisionId);
    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    const group = await Group.findById(decision.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const chosenOption = decision.options.find((o) => o.optionId === selectedOptionId);
    if (!chosenOption) {
      return res.status(400).json({ error: 'Invalid selectedOptionId for this decision' });
    }

    decision.status = 'confirmed';
    decision.confirmedOptionId = selectedOptionId;
    decision.confirmedAt = new Date();
    await decision.save();

    group.status = 'confirmed';
    await group.save();

    // Update Fairness Ledger for all members
    const preferences = await Preference.find({ groupId: group._id });
    const members = await Member.find({ groupId: group._id });
    const ledgerUpdates = [];

    for (const member of members) {
      const memberPref = preferences.find((p) => p.memberId.toString() === member._id.toString());
      const topChoice = memberPref?.rankedPicks?.[0] || null;

      let won = false;
      if (topChoice && topChoice === selectedOptionId) {
        won = true;
      } else {
        // If option was highly satisfying (score >= 80) or matched top pick
        const sat = chosenOption.memberSatisfactions.find(
          (s) => s.memberId.toString() === member._id.toString()
        );
        if (sat && sat.score >= 85) {
          won = true;
        }
      }

      let ledger = await FairnessLedger.findOne({ groupId: group._id, memberId: member._id });
      if (!ledger) {
        ledger = new FairnessLedger({
          groupId: group._id,
          memberId: member._id,
          displayName: member.displayName,
          timesTopChoiceWon: 0,
          timesTopChoiceLost: 0,
          currentWeight: 1.0,
        });
      }

      const weightBefore = ledger.currentWeight;
      let weightAfter = weightBefore;

      if (won) {
        ledger.timesTopChoiceWon += 1;
        // Winner gets slightly moderated weight (down towards 0.85 min)
        weightAfter = Math.max(0.85, Math.round((weightBefore - 0.1) * 100) / 100);
      } else {
        ledger.timesTopChoiceLost += 1;
        // Loser gets priority boost (up towards 1.30 max)
        weightAfter = Math.min(1.3, Math.round((weightBefore + 0.15) * 100) / 100);
      }

      ledger.currentWeight = weightAfter;
      ledger.history.push({
        decisionId: decision._id,
        topChoiceId: topChoice,
        winningOptionId: selectedOptionId,
        won,
        weightBefore,
        weightAfter,
        timestamp: new Date(),
      });

      await ledger.save();

      ledgerUpdates.push({
        memberId: member._id,
        displayName: member.displayName,
        won,
        previousWeight: weightBefore,
        newWeight: weightAfter,
      });
    }

    // Emit live socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`group:${group._id}`).emit('decision:confirmed', {
        decisionId: decision._id,
        confirmedOptionId: selectedOptionId,
        winningTitle: chosenOption.title,
        ledgerUpdates,
      });
    }

    res.json({
      success: true,
      decision,
      ledgerUpdates,
    });
  } catch (err) {
    next(err);
  }
});

// 9. Get Fairness Ledger history for group
router.get('/:id/fairness', async (req, res, next) => {
  try {
    const group = await findGroupByIdOrCode(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const ledgers = await FairnessLedger.find({ groupId: group._id });
    res.json(ledgers);
  } catch (err) {
    next(err);
  }
});

export default router;
