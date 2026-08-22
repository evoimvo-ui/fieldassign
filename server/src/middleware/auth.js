import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Niste prijavljeni' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Korisnik nije pronađen ili je deaktiviran' });
    }

    req.user = user;
    req.organizationId = user.organization;
    next();
  } catch {
    return res.status(401).json({ message: 'Nevažeći token' });
  }
};

// Samo admin može pristupiti
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Nedovoljna prava pristupa' });
  }
  next();
};

// Provjeri da li je pretplata aktivna
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) return res.status(404).json({ message: 'Organizacija nije pronađena' });

    const isExpired = org.planExpiresAt && org.planExpiresAt < new Date();
    const isCanceled = org.planStatus === 'canceled';

    if (isExpired || isCanceled) {
      return res.status(402).json({ message: 'Pretplata je istekla', code: 'SUBSCRIPTION_EXPIRED' });
    }

    req.organization = org;
    next();
  } catch {
    return res.status(500).json({ message: 'Greška servera' });
  }
};
