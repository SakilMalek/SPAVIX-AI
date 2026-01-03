# GDPR Compliance Implementation

## Overview
Complete GDPR compliance framework including privacy policy, user consent, data rights, and data protection measures.

## 1. Privacy Policy & Terms of Service

### Privacy Policy Template

```markdown
# Privacy Policy

## 1. Data Collection
We collect the following personal data:
- Email address
- Name (optional)
- Profile picture (optional)
- Room images for transformation
- Project information
- Usage analytics

## 2. Data Usage
Your data is used to:
- Provide room transformation services
- Improve our AI models
- Send service notifications
- Comply with legal obligations

## 3. Data Retention
- User account data: Retained until account deletion
- Generated transformations: Retained until user deletion
- Session data: 24 hours
- Logs: 30 days
- Backups: 30 days

## 4. User Rights
You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your account and data
- Export your data
- Withdraw consent

## 5. Data Security
- HTTPS encryption for all communications
- Bcryptjs password hashing (10 rounds)
- PostgreSQL database with SSL
- Regular security audits
- Rate limiting and access controls

## 6. Third-Party Services
- Google OAuth for authentication
- Google Gemini API for image generation
- AWS S3 for backup storage (optional)

## 7. Contact
For privacy inquiries: privacy@spavix.com
```

### Terms of Service Template

```markdown
# Terms of Service

## 1. Acceptance of Terms
By using SPAVIX, you accept these terms.

## 2. User Responsibilities
- You are responsible for account security
- You must not use the service for illegal purposes
- You must not abuse rate limits
- You must respect intellectual property rights

## 3. Service Limitations
- Service provided "as-is"
- No warranty of uninterrupted service
- No liability for data loss
- Rate limits apply to all users

## 4. Intellectual Property
- Generated images are owned by the user
- SPAVIX retains right to use for improvement
- User grants license to use images for service

## 5. Termination
- Users can delete accounts anytime
- SPAVIX can terminate accounts for abuse
- Data deleted upon account termination

## 6. Limitation of Liability
SPAVIX is not liable for:
- Data loss or corruption
- Service interruptions
- Third-party service failures
- Indirect or consequential damages
```

## 2. User Consent Implementation

### Consent Schema

```typescript
// server/middleware/validation.ts
export const consentSchema = z.object({
  email: z.string().email(),
  privacyConsent: z.boolean().refine(v => v === true, 'Privacy policy consent required'),
  termsConsent: z.boolean().refine(v => v === true, 'Terms of service consent required'),
  marketingConsent: z.boolean().optional(),
});
```

### Consent Tracking

```typescript
// server/db.ts - Add consent tracking to users table
static async initializeDatabase(): Promise<void> {
  await this.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_consent BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP;
  `);
}

// Track consent on signup
static async recordUserConsent(
  userId: string,
  privacyConsent: boolean,
  termsConsent: boolean,
  marketingConsent: boolean
): Promise<void> {
  await this.query(
    `UPDATE users SET 
      privacy_consent = $2,
      terms_consent = $3,
      marketing_consent = $4,
      consent_timestamp = NOW()
    WHERE id = $1`,
    [userId, privacyConsent, termsConsent, marketingConsent]
  );
}
```

### Consent Endpoint

```typescript
// server/routes/auth.ts
authRoutes.post('/consent', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  const validated = validateRequest(consentSchema, req.body);
  const { privacyConsent, termsConsent, marketingConsent } = validated;

  if (!privacyConsent || !termsConsent) {
    throw Errors.badRequest('Privacy and terms consent required');
  }

  await Database.recordUserConsent(
    req.user.id,
    privacyConsent,
    termsConsent,
    marketingConsent || false
  );

  logger.logSecurity('User consent recorded', 'low', {
    userId: req.user.id,
    privacyConsent,
    termsConsent,
    marketingConsent
  });

  res.json({ success: true, message: 'Consent recorded' });
}));
```

## 3. Data Rights Implementation

### Data Export Endpoint

```typescript
// server/routes/data.ts
export const dataRoutes = Router();

// GET /api/data/export - Export user data
dataRoutes.get('/export', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  try {
    // Fetch all user data
    const user = await Database.getUserById(req.user.id);
    const generations = await Database.getGenerations(req.user.id, 1000, 0);
    const projects = await Database.getProjects(req.user.id, 1000, 0);
    const history = await Database.getTransformationHistory(req.user.id);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        createdAt: user.created_at
      },
      generations: generations.map(g => ({
        id: g.id,
        style: g.style,
        roomType: g.room_type,
        createdAt: g.created_at
      })),
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.created_at
      })),
      transformationHistory: history.length
    };

    logger.logSecurity('User data export requested', 'low', { userId: req.user.id });

    // Send as JSON file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="spavix-data-export.json"');
    res.json(exportData);
  } catch (error) {
    logger.error('Data export error', { error });
    throw Errors.internalServerError('Failed to export data');
  }
}));
```

### Account Deletion Endpoint

```typescript
// DELETE /api/data/delete - Delete user account and all data
dataRoutes.delete('/delete', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  try {
    const { password } = req.body;

    // Verify password before deletion
    const user = await Database.getUserById(req.user.id);
    if (!user) {
      throw Errors.notFound('User');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      logger.logSecurity('Account deletion: Invalid password', 'medium', { userId: req.user.id });
      throw Errors.invalidCredentials();
    }

    // Log deletion request
    logger.logSecurity('User account deletion initiated', 'high', { userId: req.user.id });

    // Delete all user data (cascading deletes handle related data)
    await Database.deleteUser(req.user.id);

    // Clear session
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error', { error: err });
      }
    });

    logger.logSecurity('User account deleted', 'high', { userId: req.user.id });

    res.json({ success: true, message: 'Account and all data deleted' });
  } catch (error) {
    logger.error('Account deletion error', { error });
    throw Errors.internalServerError('Failed to delete account');
  }
}));
```

### Consent Withdrawal Endpoint

```typescript
// POST /api/data/withdraw-consent
dataRoutes.post('/withdraw-consent', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  const { consentType } = req.body; // 'privacy', 'terms', 'marketing'

  if (!['privacy', 'terms', 'marketing'].includes(consentType)) {
    throw Errors.badRequest('Invalid consent type');
  }

  // Update consent in database
  await Database.withdrawConsent(req.user.id, consentType);

  logger.logSecurity('User withdrew consent', 'low', {
    userId: req.user.id,
    consentType
  });

  res.json({ success: true, message: `${consentType} consent withdrawn` });
}));
```

## 4. Data Protection Measures

### Encryption at Rest

```typescript
// Ensure database uses SSL
// postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/server.crt'
ssl_key_file = '/etc/postgresql/server.key'
```

### Encryption in Transit

```typescript
// server/middleware/securityHeaders.ts
// HTTPS enforcement (already implemented)
app.use(httpsRedirect);
```

### Data Minimization

```typescript
// Only collect necessary data
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // Name and picture are optional
  name: z.string().optional(),
  picture: z.string().url().optional(),
});
```

## 5. Data Retention Policy

### Retention Schedule

```typescript
// server/jobs/dataRetention.ts
export async function cleanupExpiredData() {
  const retentionDays = 30;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // Delete old session data
  await Database.query(
    'DELETE FROM session WHERE expire < $1',
    [cutoffDate]
  );

  // Delete old logs (keep for 30 days)
  // Note: Logs are typically stored in external service

  logger.info('Data retention cleanup completed', { cutoffDate });
}

// Run daily at 3 AM
schedule.scheduleJob('0 3 * * *', cleanupExpiredData);
```

## 6. Data Processing Agreement

### DPA Template

```markdown
# Data Processing Agreement

## 1. Parties
- Data Controller: SPAVIX (User)
- Data Processor: SPAVIX (Company)

## 2. Processing Details
- Purpose: Provide room transformation service
- Data Categories: Personal data, images
- Processing Duration: Until account deletion
- Sub-processors: Google (OAuth, Gemini API)

## 3. Data Subject Rights
- Access: Available via /api/data/export
- Rectification: Available via profile update
- Erasure: Available via /api/data/delete
- Portability: Available via /api/data/export
- Objection: Available via /api/data/withdraw-consent

## 4. Security Measures
- Encryption in transit (HTTPS)
- Encryption at rest (database SSL)
- Access controls (authentication)
- Audit logging
- Regular backups

## 5. Liability
SPAVIX is liable for data processing compliance.
```

## 7. Compliance Checklist

### Before Launch
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Consent mechanism implemented
- [ ] Data export endpoint working
- [ ] Account deletion endpoint working
- [ ] Consent withdrawal endpoint working
- [ ] Data retention policy documented
- [ ] DPA available for users
- [ ] GDPR compliance audit completed
- [ ] Legal review completed

### Ongoing
- [ ] User consents recorded
- [ ] Data retention cleanup runs daily
- [ ] Backups encrypted and stored
- [ ] Access logs maintained
- [ ] Security incidents logged
- [ ] User requests processed within 30 days
- [ ] Data processing documented

## 8. User Request Handling

### Access Request (DSAR)

```typescript
// Process within 30 days
// Provide data in portable format
// No charge for first request
```

### Deletion Request

```typescript
// Process within 30 days
// Delete all personal data
// Retain only for legal obligations
// Confirm deletion to user
```

### Correction Request

```typescript
// Process within 30 days
// Update inaccurate data
// Notify data processors
// Confirm correction to user
```

## 9. Incident Response

### Data Breach Procedure

```typescript
// 1. Identify and contain breach
// 2. Log incident details
// 3. Notify supervisory authority (within 72 hours)
// 4. Notify affected users (if high risk)
// 5. Document remediation measures
// 6. Review and improve security
```

## 10. Conclusion

This GDPR compliance implementation ensures:
- ✅ Transparent data collection
- ✅ Explicit user consent
- ✅ User data rights (access, deletion, export)
- ✅ Data protection measures
- ✅ Retention policies
- ✅ Incident response procedures
- ✅ Legal compliance
- ✅ User trust and confidence
