# Database Backup and Disaster Recovery Strategy

## Overview
Comprehensive backup and disaster recovery plan for PostgreSQL database to ensure data protection and business continuity.

## Backup Strategy

### 1. Automated Daily Backups

**Backup Schedule:**
- Daily full backups at 2:00 AM UTC
- Incremental backups every 6 hours
- Retention: 30 days of daily backups

**Implementation:**
```bash
#!/bin/bash
# backup.sh - Daily backup script

BACKUP_DIR="/var/backups/spavix"
DB_NAME="spavix"
DB_USER="postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/spavix_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform full backup
pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" -F c -b -v -f "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "spavix_backup_*.sql.gz" -mtime +30 -delete

# Log backup completion
echo "$(date): Backup completed: $BACKUP_FILE.gz" >> "$BACKUP_DIR/backup.log"
```

**Cron Job:**
```bash
# Add to crontab -e
0 2 * * * /usr/local/bin/backup.sh
```

### 2. Point-in-Time Recovery (PITR)

**WAL Archiving Configuration:**

```bash
# postgresql.conf settings
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib postgresql/wal_archive/%f'
archive_timeout = 300
```

**Benefits:**
- Recover to any point in time
- Minimal data loss
- Supports incremental backups

### 3. Backup Verification

**Weekly Backup Test:**
```bash
#!/bin/bash
# verify_backup.sh - Test backup restoration

BACKUP_FILE=$1
TEST_DB="spavix_test_restore"

# Create test database
createdb "$TEST_DB"

# Restore from backup
pg_restore -d "$TEST_DB" "$BACKUP_FILE"

# Verify data integrity
psql -d "$TEST_DB" -c "SELECT COUNT(*) FROM users;"
psql -d "$TEST_DB" -c "SELECT COUNT(*) FROM generations;"
psql -d "$TEST_DB" -c "SELECT COUNT(*) FROM projects;"

# Drop test database
dropdb "$TEST_DB"

echo "Backup verification completed"
```

## Disaster Recovery Plan

### Recovery Objectives

**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 1 hour

### Recovery Procedures

#### Scenario 1: Data Corruption

**Steps:**
1. Identify corruption point using transaction logs
2. Restore from latest backup before corruption
3. Apply WAL archives to recover to point-in-time
4. Verify data integrity
5. Notify users of recovery

**Estimated Recovery Time:** 2-4 hours

#### Scenario 2: Disk Failure

**Steps:**
1. Replace failed disk
2. Restore PostgreSQL data directory from backup
3. Apply WAL archives
4. Verify cluster integrity
5. Resume operations

**Estimated Recovery Time:** 1-2 hours

#### Scenario 3: Complete Database Loss

**Steps:**
1. Provision new database server
2. Install PostgreSQL
3. Restore from latest full backup
4. Apply WAL archives to latest point
5. Verify all tables and indexes
6. Update application connection strings
7. Resume operations

**Estimated Recovery Time:** 3-4 hours

## Implementation in Application

### Backup Endpoint (Admin Only)

```typescript
// POST /api/admin/backup
adminRoutes.post('/backup', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `spavix_backup_${timestamp}.sql`;
  
  try {
    // Execute backup command
    const { exec } = require('child_process');
    exec(`pg_dump -h localhost -U postgres spavix > /var/backups/${backupFile}`, (error) => {
      if (error) {
        logger.logSecurity('Backup failed', 'high', { error: error.message });
        return res.status(500).json({ error: 'Backup failed' });
      }
      
      logger.info('Database backup created', { backupFile });
      res.json({ success: true, backupFile });
    });
  } catch (error) {
    logger.error('Backup error', { error });
    res.status(500).json({ error: 'Backup failed' });
  }
}));
```

### Restore Endpoint (Admin Only)

```typescript
// POST /api/admin/restore
adminRoutes.post('/restore', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  const { backupFile } = req.body;
  
  if (!backupFile) {
    throw Errors.badRequest('Backup file required');
  }
  
  try {
    logger.logSecurity('Database restore initiated', 'critical', { backupFile });
    
    // Execute restore command
    const { exec } = require('child_process');
    exec(`pg_restore -d spavix /var/backups/${backupFile}`, (error) => {
      if (error) {
        logger.logSecurity('Restore failed', 'critical', { error: error.message });
        return res.status(500).json({ error: 'Restore failed' });
      }
      
      logger.logSecurity('Database restore completed', 'critical', { backupFile });
      res.json({ success: true, message: 'Database restored' });
    });
  } catch (error) {
    logger.error('Restore error', { error });
    res.status(500).json({ error: 'Restore failed' });
  }
}));
```

## Monitoring and Alerting

### Backup Monitoring

```typescript
// Check backup status
const checkBackupStatus = async () => {
  const backupDir = '/var/backups/spavix';
  const files = fs.readdirSync(backupDir);
  const latestBackup = files
    .filter(f => f.startsWith('spavix_backup_'))
    .sort()
    .pop();
  
  if (!latestBackup) {
    logger.logSecurity('No recent backups found', 'critical');
    sendAlert('Database backup missing');
    return;
  }
  
  const backupAge = Date.now() - fs.statSync(`${backupDir}/${latestBackup}`).mtime.getTime();
  const backupAgeHours = backupAge / (1000 * 60 * 60);
  
  if (backupAgeHours > 24) {
    logger.logSecurity('Backup is stale', 'high', { ageHours: backupAgeHours });
    sendAlert('Database backup is older than 24 hours');
  }
};

// Run check every 6 hours
setInterval(checkBackupStatus, 6 * 60 * 60 * 1000);
```

### Alert Notifications

```typescript
const sendAlert = async (message: string) => {
  // Send email alert
  await emailService.send({
    to: 'admin@spavix.com',
    subject: 'Database Backup Alert',
    body: message
  });
  
  // Log alert
  logger.logSecurity('Alert sent', 'high', { message });
};
```

## Backup Storage

### Local Storage
- Location: `/var/backups/spavix`
- Retention: 30 days
- Frequency: Daily
- Size: ~500MB per backup

### Cloud Storage (Recommended)
- Service: AWS S3 / Google Cloud Storage
- Retention: 90 days
- Replication: Multi-region
- Encryption: AES-256

**Implementation:**
```bash
#!/bin/bash
# upload_backup_to_s3.sh

BACKUP_FILE=$1
S3_BUCKET="spavix-backups"
S3_KEY="$(date +%Y/%m/%d)/$(basename $BACKUP_FILE)"

aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/$S3_KEY" \
  --sse AES256 \
  --storage-class GLACIER_IR

echo "Backup uploaded to S3: s3://$S3_BUCKET/$S3_KEY"
```

## Testing Schedule

- **Weekly:** Verify latest backup can be restored
- **Monthly:** Full disaster recovery drill
- **Quarterly:** Test recovery to point-in-time
- **Annually:** Comprehensive disaster recovery exercise

## Documentation

### Backup Checklist
- [ ] Daily backup completed
- [ ] Backup file verified
- [ ] Backup uploaded to cloud storage
- [ ] Backup retention policy enforced
- [ ] Monitoring alerts configured

### Recovery Checklist
- [ ] Backup file located
- [ ] Recovery environment prepared
- [ ] Backup restored successfully
- [ ] Data integrity verified
- [ ] Application tested
- [ ] Users notified

## Compliance

- **GDPR:** Backups retained for 30 days minimum
- **SOC 2:** Automated backups with verification
- **ISO 27001:** Encrypted backups with access controls
- **HIPAA:** Backup encryption and audit trails

## Cost Estimation

| Component | Cost | Notes |
|-----------|------|-------|
| Local Storage | $50/month | 1TB capacity |
| Cloud Storage (S3) | $15/month | 30 days retention |
| Backup Verification | $0 | Automated |
| Disaster Recovery | $0 | Documented procedures |
| **Total** | **$65/month** | |

## Conclusion

This backup and disaster recovery strategy ensures:
- ✅ Daily automated backups
- ✅ Point-in-time recovery capability
- ✅ Regular backup verification
- ✅ Documented recovery procedures
- ✅ 4-hour RTO, 1-hour RPO
- ✅ Compliance with regulations
- ✅ Cost-effective implementation
