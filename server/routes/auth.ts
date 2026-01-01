import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

export const authRoutes = Router();

authRoutes.post('/signup', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, profilePicture } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const existingUser = await Database.getUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    console.log('Creating user with profilePicture:', profilePicture);
    const user = await Database.createUser(email, passwordHash, undefined, profilePicture);
    console.log('User created:', user.id, 'with picture:', profilePicture);

    const token = jwt.sign(
      { userId: user.id, email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Fetch the user to confirm picture was saved
    const savedUser = await Database.getUserById(user.id);
    console.log('Saved user picture:', savedUser?.picture);

    res.json({ token, user: { id: user.id, email, picture: savedUser?.picture || profilePicture } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

authRoutes.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const user = await Database.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, picture: user.picture } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

authRoutes.post('/google', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Google login request received:', { email: req.body.email });
    const { email, name, picture } = req.body;

    if (!email) {
      console.log('Email missing from request');
      res.status(400).json({ error: 'Email required' });
      return;
    }

    console.log('Fetching user by email:', email);
    let user = await Database.getUserByEmail(email);
    console.log('User found:', !!user);

    if (!user) {
      console.log('Creating new user');
      const randomPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const newUser = await Database.createUser(email, passwordHash, name, picture);
      console.log('New user created:', newUser.id);
      user = {
        id: newUser.id,
        email,
        password_hash: passwordHash,
        name: name || undefined,
        picture: picture || undefined,
      };
    } else {
      console.log('Updating existing user profile');
      if (name || picture) {
        await Database.updateUserProfile(user.id, name, picture);
      }
      user = {
        ...user,
        name: name || user.name,
        picture: picture || user.picture,
      };
    }

    console.log('Generating JWT token');
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    console.log('Sending response');
    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        picture: user.picture || null,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Google login failed', details: errorMessage });
  }
});

authRoutes.get('/google/callback', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.query;
    console.log('Google callback received with code:', !!code);

    if (!code) {
      console.error('No authorization code provided');
      res.status(400).json({ error: 'Authorization code required' });
      return;
    }

    console.log('Exchanging authorization code for tokens...');
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: '972457710378-srvsbk8qqcg98ih8i9m8g73urt9hs8bu.apps.googleusercontent.com',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      res.status(401).json({ error: 'Token exchange failed', details: errorText });
      return;
    }
    
    console.log('Token exchange successful');

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      console.error('User info fetch failed:', await userInfoResponse.text());
      res.status(401).json({ error: 'Failed to get user info' });
      return;
    }

    const googleUser = await userInfoResponse.json();
    const { email, name, picture } = googleUser;
    console.log('Google user info received:', { email, name: !!name, picture: !!picture });

    if (!email) {
      console.error('Email not provided by Google');
      res.status(400).json({ error: 'Email not provided by Google' });
      return;
    }

    // Create or update user
    console.log('Looking up user by email:', email);
    let user = await Database.getUserByEmail(email);

    if (!user) {
      console.log('Creating new user from Google login');
      const randomPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const newUser = await Database.createUser(email, passwordHash, name, picture);
      user = {
        id: newUser.id,
        email,
        password_hash: passwordHash,
        name: name || undefined,
        picture: picture || undefined,
      };
      console.log('New user created:', user.id);
    } else {
      console.log('User found, updating profile');
      if (name || picture) {
        await Database.updateUserProfile(user.id, name, picture);
      }
      user = {
        ...user,
        name: name || user.name,
        picture: picture || user.picture,
      };
    }

    // Generate JWT token
    console.log('Generating JWT token for user:', user.id);
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/auth/callback?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify({ id: user.id, email: user.email, name: user.name, picture: user.picture }))}`;
    console.log('Redirecting to:', redirectUrl.split('?')[0] + '?token=***');
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google callback error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

authRoutes.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await Database.getUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

authRoutes.post('/update-profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    await Database.updateUserProfile(req.user.id, name);
    
    const user = await Database.getUserById(req.user.id);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});
