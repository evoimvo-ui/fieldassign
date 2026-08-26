import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, changePasswordSchema } from '../validators/authValidators.js';
import { sendVerificationEmail } from '../services/emailService.js';

const router = express.Router();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register — registracija organizacije + admin korisnika
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { orgName, name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email već postoji' });
    }

    // Kreiraj organizaciju
    const slug = orgName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const organization = await Organization.create({ name: orgName, slug });

    // Kreiraj admin korisnika
    const user = await User.create({
      organization: organization._id,
      name,
      email,
      password,
      role: 'admin',
    });

    // Generiši verifikacioni token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 sata

    user.verificationTokenHash = tokenHash;
    user.verificationTokenExpires = expires;
    user.lastVerificationSentAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Pošalji verifikacioni email — ne prekidaj flow ako ne uspije
    sendVerificationEmail(user, token).catch((err) => {
      console.error('Neuspiješno slanje verifikacionog emaila:', err.message);
    });

    const authToken = generateToken(user._id);
    res.status(201).json({ token: authToken, user, organization });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email i lozinka su obavezni' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Pogrešan email ili lozinka' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Vaš nalog je deaktiviran' });
    }

    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);
    const organization = await Organization.findById(user.organization);

    res.json({ token, user, organization });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Korisnik nije pronađen' });

    const organization = await Organization.findById(user.organization);
    res.json({ user, organization });
  } catch {
    res.status(401).json({ message: 'Nevažeći token' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Trenutna lozinka nije ispravna' });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Lozinka uspješno promijenjena' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// GET /api/auth/verify-email — potvrda emaila preko tokena iz linka
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Nedostaje verifikacioni token' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ verificationTokenHash: tokenHash });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Nevažeći verifikacioni link' });
    }

    if (user.verificationTokenExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Verifikacioni link je istekao' });
    }

    user.emailVerified = true;
    user.verificationTokenHash = null;
    user.verificationTokenExpires = null;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Email uspješno potvrđen' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Interna greška servera' });
  }
});

// POST /api/auth/resend-verification — ponovno slanje verifikacionog emaila
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email je već potvrđen' });
    }

    // Rate limit: 2 minute između slanja
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (user.lastVerificationSentAt && user.lastVerificationSentAt > twoMinutesAgo) {
      const waitSeconds = Math.ceil(
        (user.lastVerificationSentAt.getTime() - twoMinutesAgo.getTime()) / 1000
      );
      return res.status(429).json({
        message: `Pričekajte ${waitSeconds}s prije ponovnog slanja`,
        waitSeconds,
      });
    }

    // Generiši novi token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationTokenHash = tokenHash;
    user.verificationTokenExpires = expires;
    user.lastVerificationSentAt = new Date();
    await user.save({ validateBeforeSave: false });

    sendVerificationEmail(user, token).catch((err) => {
      console.error('Neuspiješno slanje verifikacionog emaila (resend):', err.message);
    });

    res.json({ message: 'Verifikacioni email ponovno poslan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// POST /api/auth/update-email — promjena emaila prije verifikacije
router.post('/update-email', authenticate, async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail) {
      return res.status(400).json({ message: 'Novi email je obavezan' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email je već potvrđen, ne može se mijenjati ovim putem' });
    }

    // Provjeri da novi email već ne postoji
    const existing = await User.findOne({ email: newEmail.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email već postoji' });
    }

    // Ažuriraj email
    user.email = newEmail.toLowerCase();

    // Generiši NOVI token za novi email
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationTokenHash = tokenHash;
    user.verificationTokenExpires = expires;
    user.lastVerificationSentAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Pošalji verifikacioni email na novu adresu
    sendVerificationEmail(user, token).catch((err) => {
      console.error('Neuspiješno slanje verifikacionog emaila (update-email):', err.message);
    });

    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ user: safeUser, message: 'Email ažuriran, verifikacioni link poslan na novu adresu' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

export default router;
