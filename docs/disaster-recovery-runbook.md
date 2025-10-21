## Overview

This runbook provides step-by-step procedures for disaster recovery scenarios in the ForgeVid platform. It covers various failure scenarios and the appropriate response procedures.

## Review & Update Instructions
- Review this runbook quarterly and after any major incident.
- Update contact information, recovery steps, and backup procedures as needed.
- Log all incidents and recovery actions in `docs/security-audit-log.md`.

## Emergency Contacts

- **On-Call Engineer**: +1-555-0123 (PagerDuty)
- **Engineering Manager**: engineering-manager@forgevid.com
- **DevOps Lead**: devops@forgevid.com
- **CEO**: ceo@forgevid.com

## Severity Levels

### P0 - Critical (Complete Service Outage)
- **Response Time**: 15 minutes
- **Resolution Target**: 4 hours
- **Escalation**: Immediate page to on-call + engineering manager

### P1 - High (Partial Service Degradation)
- **Response Time**: 30 minutes
- **Resolution Target**: 8 hours
- **Escalation**: Page to on-call engineer

### P2 - Medium (Non-Critical Feature Impact)
- **Response Time**: 2 hours
- **Resolution Target**: 24 hours
- **Escalation**: Slack notification to engineering team

## Disaster Recovery Scenarios

### 1. Complete Regional Outage

**Symptoms:**
- All health checks failing in primary region
- 100% error rate on API endpoints
- Users unable to access the platform

**Immediate Response (0-15 minutes):**
1. Confirm outage scope via monitoring dashboards
2. Check cloud provider status pages (AWS, Vercel)
3. Initiate emergency communication to stakeholders
4. Begin automated failover process

**Failover Procedure:**
\`\`\`bash
# 1. Check current region status
curl -f https://api.forgevid.com/health || echo "Primary region down"

# 2. Initiate manual failover if automatic failover hasn't triggered
node scripts/failover.js --target-region us-west-2 --confirm

# 3. Update DNS records (if not automated)
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 \
  --change-batch file://dns-failover.json

# 4. Verify failover success
curl -f https://us-west-2.forgevid.com/health
\`\`\`

**Post-Failover (15-60 minutes):**
1. Monitor new primary region performance
2. Communicate status to users via status page
3. Begin investigation of root cause
4. Prepare for failback when primary region recovers

### 2. Database Failure

**Symptoms:**
- Database connection errors
- 500 errors on data-dependent endpoints
- Backup/restore job failures

**Immediate Response:**
1. Check database cluster status
2. Identify if it's a primary or replica failure
3. Assess data consistency across replicas

**Recovery Procedure:**
\`\`\`bash
# 1. Check database status
pg_isready -h primary-db.forgevid.com -p 5432

# 2. If primary is down, promote replica
pg_promote -D /var/lib/postgresql/data

# 3. Update application connection strings
kubectl set env deployment/api DATABASE_URL="postgresql://replica-db.forgevid.com:5432/forgevid"

# 4. Restart application pods
kubectl rollout restart deployment/api
\`\`\`

### 3. Data Corruption

**Symptoms:**
- Inconsistent data in user interfaces
- Failed data validation checks
- Reports of missing or incorrect user data

**Recovery Procedure:**
1. **Immediate**: Stop all write operations to prevent further corruption
2. **Assessment**: Identify scope and cause of corruption
3. **Recovery**: Restore from most recent clean backup
4. **Validation**: Verify data integrity post-recovery

\`\`\`bash
# 1. Enable read-only mode
kubectl patch configmap app-config --patch '{"data":{"READ_ONLY_MODE":"true"}}'

# 2. Identify latest clean backup
aws s3 ls s3://forgevid-backups/ --recursive | grep backup_full | tail -5

# 3. Restore from backup
node scripts/restore-backup.js --backup-id backup_full_20240101_120000

# 4. Validate data integrity
node scripts/validate-data-integrity.js --full-check
\`\`\`

### 4. Security Incident

**Symptoms:**
- Unusual access patterns
- Unauthorized data access alerts
- Suspicious API usage

**Immediate Response:**
1. **Isolate**: Block suspicious IP addresses
2. **Assess**: Determine scope of potential breach
3. **Secure**: Rotate all API keys and secrets
4. **Communicate**: Notify security team and legal

**Security Lockdown Procedure:**
\`\`\`bash
# 1. Enable security lockdown mode
kubectl patch configmap security-config --patch '{"data":{"LOCKDOWN_MODE":"true"}}'

# 2. Rotate all API keys
node scripts/rotate-api-keys.js --emergency

# 3. Force logout all users
redis-cli FLUSHDB 1  # Clear session store

# 4. Enable additional monitoring
kubectl scale deployment/security-monitor --replicas=5
\`\`\`

## Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

| Component | RTO | RPO | Backup Frequency |
|-----------|-----|-----|------------------|
| Web Application | 15 minutes | 1 hour | Continuous deployment |
| Database | 30 minutes | 15 minutes | Every 15 minutes |
| File Storage | 1 hour | 1 hour | Every hour |
| User Sessions | 5 minutes | 5 minutes | Real-time replication |

## Backup and Restore Procedures

### Creating Emergency Backup
\`\`\`bash
# Full system backup
node scripts/emergency-backup.js --type full --priority high

# Database only backup
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql
\`\`\`

### Restoring from Backup
\`\`\`bash
# List available backups
node scripts/list-backups.js --recent 10

# Restore specific backup
node scripts/restore-backup.js --backup-id <backup_id> --confirm

# Verify restore
node scripts/verify-restore.js --backup-id <backup_id>
\`\`\`

## Communication Templates

### Initial Incident Notification
\`\`\`
🚨 INCIDENT ALERT - P0
Service: ForgeVid Platform
Status: Investigating
Impact: Complete service outage
ETA: Investigating
Updates: Every 15 minutes
Incident Commander: [Name]
\`\`\`

### Resolution Notification
\`\`\`
✅ INCIDENT RESOLVED - P0
Service: ForgeVid Platform
Status: Resolved
Duration: [X] minutes
Root Cause: [Brief description]
Next Steps: Post-mortem scheduled for [date]
\`\`\`

## Post-Incident Procedures

### Immediate (0-2 hours after resolution)
1. Confirm all systems are stable
2. Document timeline of events
3. Preserve logs and evidence
4. Communicate resolution to stakeholders

### Short-term (2-24 hours)
1. Conduct initial root cause analysis
2. Identify immediate preventive measures
3. Update monitoring and alerting
4. Schedule post-mortem meeting

### Long-term (1-7 days)
1. Complete detailed post-mortem
2. Implement preventive measures
3. Update runbooks and procedures
4. Conduct team retrospective

## Testing and Validation

### Monthly DR Tests
- Failover to secondary region
- Database restore from backup
- Security incident response drill

### Quarterly DR Tests
- Complete regional failover
- Full system restore from backup
- Cross-team incident response exercise

### Annual DR Tests
- Disaster recovery simulation
- Business continuity validation
- Third-party vendor failover testing

## Monitoring and Alerting

### Critical Alerts
- Regional health check failures
- Database connection failures
- High error rates (>5%)
- Security anomalies

### Alert Escalation
1. **0-15 minutes**: Automated alerts to on-call
2. **15-30 minutes**: Escalate to engineering manager
3. **30-60 minutes**: Escalate to VP Engineering
4. **60+ minutes**: Escalate to executive team

## Tools and Resources

### Monitoring Dashboards
- [System Health Dashboard](https://monitoring.forgevid.com/health)
- [Performance Metrics](https://monitoring.forgevid.com/performance)
- [Security Dashboard](https://monitoring.forgevid.com/security)

### Communication Channels
- **Slack**: #incidents (for coordination)
- **Status Page**: https://status.forgevid.com
- **PagerDuty**: https://forgevid.pagerduty.com
---
**Platform Ownership:** ForgeVid is owned and operated by Kryst Investments LLC.

### Documentation
- [Architecture Overview](./architecture.md)
- [Monitoring Guide](./monitoring.md)
- [Security Procedures](./security.md)

---

**Last Updated**: January 2024
**Next Review**: April 2024
**Owner**: DevOps Team
