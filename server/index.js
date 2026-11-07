
import express from 'express';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { rateLimit } from 'express-rate-limit';
import { connectDB } from './db.js';
import { User } from './models/User.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    specialization: user.specialization,
  };
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Too many attempts. Please try again later.',
  },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'SAS backend running' });
});

async function startServer() {
  await connectDB();

  if (!process.env.SESSION_SECRET ||
      process.env.SESSION_SECRET.length < 64) {
    throw new Error('SESSION_SECRET is missing or too short.');
  }

  app.use(session({
    name: 'sas.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 7 * 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    },
  }));

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { fullName, email, password, specialization } = req.body ?? {};

      const cleanName = typeof fullName === 'string'
        ? fullName.trim()
        : '';
      const cleanEmail = typeof email === 'string'
        ? email.trim().toLowerCase()
        : '';

      if (
        cleanName.length < 2 ||
        cleanName.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
        typeof password !== 'string' ||
        password.length < 8 ||
        password.length > 72 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)
      ) {
        return res.status(400).json({
          ok: false,
          message: 'Enter a valid name, email and strong password.',
        });
      }

      const existing = await User.exists({ email: cleanEmail });

      if (existing) {
        return res.status(409).json({
          ok: false,
          message: 'An account with this email already exists.',
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await User.create({
        fullName: cleanName,
        email: cleanEmail,
        passwordHash,
        role: 'STUDENT',
        specialization: typeof specialization === 'string'
          ? specialization.trim().slice(0, 150)
          : undefined,
      });

      return res.status(201).json({
        ok: true,
        message: 'Account registered successfully.',
        user: publicUser(user),
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          ok: false,
          message: 'An account with this email already exists.',
        });
      }

      console.error('Registration error:', error);
      return res.status(500).json({
        ok: false,
        message: 'Registration failed.',
      });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res, next) => {
    try {
      const { email, password } = req.body ?? {};

      if (typeof email !== 'string' ||
          typeof password !== 'string') {
        return res.status(400).json({
          ok: false,
          message: 'Email and password are required.',
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      const user = await User.findOne({
        email: cleanEmail,
      }).select('+passwordHash');

      const validPassword = user
        ? await bcrypt.compare(password, user.passwordHash)
        : false;

      if (!user || !validPassword || user.status !== 'ACTIVE') {
        return res.status(401).json({
          ok: false,
          message: 'Invalid email or password.',
        });
      }

      req.session.regenerate(async (error) => {
        if (error) return next(error);

        try {
          req.session.userId = user.id;

          await User.updateOne(
            { _id: user.id },
            { $set: { lastLoginAt: new Date() } }
          );

          req.session.save((saveError) => {
            if (saveError) return next(saveError);

            return res.json({
              ok: true,
              message: 'Login successful.',
              user: publicUser(user),
            });
          });
        } catch (innerError) {
          next(innerError);
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/auth/me', async (req, res, next) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          ok: false,
          message: 'Not authenticated.',
        });
      }

      const user = await User.findById(req.session.userId);

      if (!user || user.status !== 'ACTIVE') {
        return res.status(401).json({
          ok: false,
          message: 'Session is no longer valid.',
        });
      }

      return res.json({
        ok: true,
        user: publicUser(user),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/logout', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);

      res.clearCookie('sas.sid', {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
      });

      res.json({
        ok: true,
        message: 'Logged out successfully.',
      });
    });
  });

  app.use((error, _req, res, _next) => {
    console.error('API error:', error);
    res.status(500).json({
      ok: false,
      message: 'Internal server error.',
    });
  });

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`SAS backend running at http://127.0.0.1:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Backend startup failed:', error.message);
  process.exitCode = 1;
});
