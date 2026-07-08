# 🔐 **FORGEVID ADMIN GUIDE**

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Audience:** Platform Administrators

---

## 📋 **TABLE OF CONTENTS**

1. [Overview](#overview)
2. [Accessing Admin Dashboard](#accessing-admin-dashboard)
3. [User Management](#user-management)
4. [Content Moderation](#content-moderation)
5. [System Monitoring](#system-monitoring)
6. [Revenue & Analytics](#revenue--analytics)
7. [Security Management](#security-management)
8. [Support Management](#support-management)
9. [System Configuration](#system-configuration)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 **OVERVIEW**

The ForgeVid Admin Dashboard provides comprehensive administrative controls for managing users, content, payments, and system operations.

### **Admin Capabilities**

- **User Management:** Create, update, suspend, delete users
- **Content Moderation:** Review and moderate templates, videos
- **System Monitoring:** Track performance, errors, uptime
- **Revenue Management:** View analytics, manage subscriptions
- **Security Oversight:** Monitor threats, manage permissions
- **Support Tickets:** Handle user support requests

---

## 🔑 **ACCESSING ADMIN DASHBOARD**

### **Requirements**

- Admin role assigned to your account
- Valid authentication session
- HTTPS enabled in production

### **Login Process**

1. Navigate to `/dashboard/admin`
2. Enter your admin credentials
3. Authenticate with 2FA if enabled
4. Access granted to admin controls

### **Admin Roles**

| Role | Permissions |
|------|------------|
| **SUPER_ADMIN** | All permissions, system configuration |
| **ADMIN** | User management, moderation, analytics |
| **MODERATOR** | Content moderation, user reports |
| **SUPPORT** | Ticket management, user assistance |

---

## 👥 **USER MANAGEMENT**

### **User Actions**

#### **1. View All Users**
- Navigate to: `Admin Dashboard > Users`
- See paginated list with filters
- Search by name, email, plan

#### **2. User Details**
- Click on user to view profile
- See: Activity, subscriptions, videos, usage

#### **3. Suspend User**
```typescript
// API endpoint
POST /api/admin/users/[userId]/suspend
Body: { reason: string, duration?: number }
```

#### **4. Delete User**
```typescript
// API endpoint
DELETE /api/admin/users/[userId]
Body: { confirm: true }
```

#### **5. Reset Password**
- Click "Reset Password" on user profile
- System emails reset link
- Link expires in 1 hour

#### **6. Assign Roles**
- Click "Edit Roles" on user profile
- Select roles from dropdown
- Save changes

### **User Filters**

- **By Plan:** Free, Starter, Pro, Enterprise
- **By Status:** Active, Suspended, Deleted
- **By Role:** User, Admin, Moderator
- **By Date:** Created, Last active

---

## 🛡️ **CONTENT MODERATION**

### **Template Moderation**

#### **1. Pending Reviews**
- Navigate to: `Admin Dashboard > Moderation > Templates`
- Review template content, metadata, thumbnail
- Actions: Approve, Request Changes, Reject

#### **2. Flagged Content**
- Templates reported by users
- Review reason for flagging
- Actions: Remove flag, Take action

#### **3. Bulk Actions**
- Select multiple templates
- Apply action to all selected
- Common: Approve all, Reject all

### **Video Moderation**

#### **1. Review Videos**
- Navigate to: `Admin Dashboard > Moderation > Videos`
- Check for inappropriate content
- Verify copyright compliance

#### **2. AI-Generated Content**
- Auto-flagged AI content
- Verify AI disclosure
- Ensure quality standards

---

## 📊 **SYSTEM MONITORING**

### **Performance Metrics**

#### **1. Server Health**
- CPU usage
- Memory usage
- Disk space
- Network traffic

#### **2. API Metrics**
- Request rate
- Response times
- Error rates
- Endpoint popularity

#### **3. Database Health**
- Query performance
- Connection pool
- Slow queries
- Index usage

#### **4. Video Processing**
- Queue length
- Average processing time
- Success/failure rate
- Storage usage

### **Alerts Configuration**

#### **1. Set Alert Thresholds**
```typescript
// Example alert configuration
{
  cpuUsage: { threshold: 80, severity: 'warning' },
  errorRate: { threshold: 5, severity: 'critical' },
  diskSpace: { threshold: 85, severity: 'warning' },
  responseTime: { threshold: 2000, severity: 'warning' },
}
```

#### **2. Notification Channels**
- Email alerts
- Slack notifications
- SMS (critical only)
- Dashboard badges

---

## 💰 **REVENUE & ANALYTICS**

### **Revenue Dashboard**

#### **1. Overview Metrics**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn rate
- LTV (Lifetime Value)

#### **2. Subscription Analytics**
- Active subscriptions by plan
- Conversion rates
- Upgrade/downgrade trends
- Cancellation reasons

#### **3. Payment Processing**
- Stripe transaction logs
- Failed payment handling
- Refund management
- Revenue forecasting

### **User Analytics**

#### **1. Usage Metrics**
- Videos generated per user
- AI generation usage
- Storage consumption
- Engagement scores

#### **2. Growth Metrics**
- New user signups
- Activation rate
- Retention cohorts
- Viral coefficient

---

## 🔒 **SECURITY MANAGEMENT**

### **Threat Monitoring**

#### **1. Failed Login Attempts**
- View login logs
- Identify suspicious patterns
- IP address tracking
- Geo-location analysis

#### **2. API Abuse**
- Rate limit violations
- Unusual request patterns
- Scraping detection
- Bot identification

#### **3. Data Access Logs**
- Who accessed what
- When and from where
- Data modification tracking
- Export activities

### **Access Controls**

#### **1. Role Permissions**
- Configure role-based access
- Define permission sets
- Test permissions
- Audit changes

#### **2. IP Whitelisting**
- Add trusted IPs
- Manage firewall rules
- Geo-blocking settings

#### **3. 2FA Enforcement**
- Require 2FA for admins
- Set grace periods
- Monitor compliance

---

## 🎫 **SUPPORT MANAGEMENT**

### **Ticket System**

#### **1. View Tickets**
- Open, In Progress, Resolved
- By priority: Low, Medium, High, Urgent
- By category: Technical, Billing, Feature Request

#### **2. Assign Tickets**
- Auto-assign or manual
- Workload balancing
- SLA tracking

#### **3. Respond to Tickets**
- In-app messaging
- Email notifications
- Mark resolved
- Request feedback

### **Knowledge Base**

- Common issues
- Troubleshooting guides
- Feature documentation
- FAQ management

---

## ⚙️ **SYSTEM CONFIGURATION**

### **Feature Flags**

#### **1. Enable/Disable Features**
```typescript
// Example feature flags
{
  aiVideoGeneration: true,
  collaboration: true,
  voiceSynthesis: false,
  branchingVideos: false,
}
```

#### **2. A/B Testing**
- Configure experiments
- Traffic allocation
- Conversion tracking

### **AI Configuration**

#### **1. API Keys**
- OpenAI API key
- ElevenLabs key
- Pexels API key
- Usage limits

#### **2. Model Settings**
- GPT-4 vs GPT-3.5
- Temperature settings
- Max tokens
- Rate limits

### **Storage Management**

#### **1. Cloudinary Settings**
- Upload presets
- Transformations
- CDN configuration
- Storage quotas

#### **2. Database Management**
- Backup schedules
- Retention policies
- Cleanup jobs
- Migration management

---

## 🐛 **TROUBLESHOOTING**

### **Common Issues**

#### **1. Server Performance Issues**
**Symptoms:** Slow response times, timeouts  
**Diagnosis:** Check CPU, memory, database  
**Solution:** Scale resources, optimize queries

#### **2. Video Processing Failures**
**Symptoms:** Videos stuck in processing  
**Diagnosis:** Check FFmpeg logs, queue status  
**Solution:** Clear queue, restart workers

#### **3. Payment Processing Errors**
**Symptoms:** Checkout failures  
**Diagnosis:** Check Stripe logs, API keys  
**Solution:** Verify Stripe config, test cards

#### **4. User Complaints**
**Symptoms:** "Can't access X"  
**Diagnosis:** Check permissions, logs  
**Solution:** Verify role, test user flow

---

## 📞 **GETTING HELP**

### **Support Channels**

- **Email:** admin@forgevid.com
- **Slack:** #forgevid-admins
- **Emergency:** +1 (555) 123-4567

### **Documentation**

- [Architecture Guide](./ARCHITECTURE.md)
- [API Documentation](./API-DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

**Admin Guide Status:** Complete ✅  
**Last Audit:** December 2024

