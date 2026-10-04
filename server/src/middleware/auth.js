import jwt from 'jsonwebtoken';
import { Group } from '../models/Group.js';
import { Member } from '../models/Member.js';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'grouppick_super_secret_jwt_dev_key_replace_in_prod';

/**
 * Generate a JWT token for a registered User
 */
export const generateUserToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Require valid JWT for registered organizer
 */
export const requireOrganizerAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Organizer authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional organizer auth - populates req.user if a valid token is present
 */
export const optionalOrganizerAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore token verification errors for optional auth
    }
  }
  next();
};

/**
 * Member authentication middleware
 * Validates x-member-token or Bearer token for member endpoints
 */
export const requireMemberAuth = async (req, res, next) => {
  const memberToken = req.headers['x-member-token'] || 
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!memberToken) {
    return res.status(401).json({ error: 'Member guest token required (x-member-token header)' });
  }

  const groupId = req.params.groupId || req.params.id;
  if (!groupId) {
    return res.status(400).json({ error: 'Group ID parameter missing' });
  }

  try {
    let group = null;
    if (/^[0-9a-fA-F]{24}$/.test(groupId)) {
      group = await Group.findById(groupId);
    } else {
      group = await Group.findOne({ code: groupId.toUpperCase() });
    }

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const member = await Member.findOne({
      groupId: group._id,
      guestToken: memberToken,
    });

    if (!member) {
      return res.status(403).json({ error: 'Invalid member token or member does not belong to this group' });
    }

    req.member = member;
    req.group = group;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Error authenticating member', details: err.message });
  }
};

/**
 * Require group organizer privilege
 * Can be authenticated via:
 * 1. Registered organizer user (JWT matching group.organizerId)
 * 2. Group organizerToken header/query (x-organizer-token)
 * 3. Member token whose isOrganizer is true
 */
export const requireGroupOrganizer = async (req, res, next) => {
  const groupId = req.params.groupId || req.params.id;
  if (!groupId) {
    return res.status(400).json({ error: 'Group ID parameter missing' });
  }

  try {
    let group = await Group.findById(groupId);
    if (!group) {
      group = await Group.findOne({ code: groupId.toUpperCase() });
    }
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    req.group = group;

    // 1. Check organizer token header or query
    const organizerToken = req.headers['x-organizer-token'] || req.query.organizerToken;
    if (organizerToken && organizerToken === group.organizerToken) {
      return next();
    }

    // 2. Check JWT user if logged in
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (group.organizerId && group.organizerId.toString() === decoded.userId) {
          req.user = { _id: decoded.userId, email: decoded.email };
          return next();
        }
      } catch {
        // Not a valid JWT, could be a guest member token
      }

      // Check if the bearer token is a member guest token with isOrganizer = true
      const member = await Member.findOne({
        groupId: group._id,
        guestToken: token,
        isOrganizer: true,
      });
      if (member) {
        req.member = member;
        return next();
      }
    }

    // 3. Check x-member-token with isOrganizer
    const memberToken = req.headers['x-member-token'];
    if (memberToken) {
      const member = await Member.findOne({
        groupId: group._id,
        guestToken: memberToken,
        isOrganizer: true,
      });
      if (member) {
        req.member = member;
        return next();
      }
    }

    return res.status(403).json({ error: 'Only the group organizer can perform this action' });
  } catch (err) {
    return res.status(500).json({ error: 'Error validating organizer permissions', details: err.message });
  }
};
