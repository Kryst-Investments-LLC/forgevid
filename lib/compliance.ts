import { prisma } from './database'
import { SecurityAuditLogger } from './security'

// GDPR Compliance
export class GDPRCompliance {
  static async handleDataRequest(userId: string, requestType: 'access' | 'portability' | 'deletion') {
    try {
      switch (requestType) {
        case 'access':
          return await this.exportUserData(userId)
        case 'portability':
          return await this.exportUserData(userId, true)
        case 'deletion':
          return await this.deleteUserData(userId)
        default:
          throw new Error('Invalid request type')
      }
    } catch (error) {
      console.error('GDPR request failed:', error)
      throw error
    }
  }

  static async exportUserData(userId: string, portable: boolean = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        videos: true,
        usageRecords: true,
        analytics: true,
        subscriptions: true,
        payments: true,
        notifications: true,
        sessions: true
      }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const exportData = {
      personalData: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      content: user.videos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        status: video.status,
        duration: video.duration,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt
      })),
      usage: user.usageRecords.map(record => ({
        action: record.action,
        timestamp: record.timestamp,
        metadata: record.metadata
      })),
      analytics: user.analytics.map(analytics => ({
        date: analytics.date,
        videosCreated: analytics.videosCreated,
        aiGenerations: analytics.aiGenerations,
        exportsGenerated: analytics.exportsGenerated
      })),
      subscriptions: user.subscriptions.map(sub => ({
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd
      })),
      payments: user.payments.map(payment => ({
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt
      }))
    }

    // Log data export
    await SecurityAuditLogger.logSecurityEvent('data_export', {
      userId,
      severity: 'low',
      data: { requestType: portable ? 'portability' : 'access' }
    })

    return exportData
  }

  static async deleteUserData(userId: string) {
    await prisma.$transaction(async (tx) => {
      // Delete user data in correct order (respecting foreign key constraints)
      await tx.usageRecord.deleteMany({ where: { userId } })
      await tx.userAnalytics.deleteMany({ where: { userId } })
      await tx.notification.deleteMany({ where: { userId } })
      await tx.session.deleteMany({ where: { userId } })
      await tx.apiKey.deleteMany({ where: { userId } })
      await tx.collaborationMember.deleteMany({ where: { userId } })
      await tx.videoEdit.deleteMany({ where: { userId } })
      await tx.videoExport.deleteMany({ where: { video: { userId } } })
      await tx.videoAnalytics.deleteMany({ where: { video: { userId } } })
      await tx.video.deleteMany({ where: { userId } })
      await tx.payment.deleteMany({ where: { userId } })
      await tx.subscription.deleteMany({ where: { userId } })
      await tx.user.delete({ where: { id: userId } })
    })

    // Log data deletion
    await SecurityAuditLogger.logSecurityEvent('data_deletion', {
      userId,
      severity: 'medium',
      data: { requestType: 'deletion' }
    })
  }

  static async anonymizeUserData(userId: string) {
    const anonymizedData = {
      email: `anonymized_${userId}@deleted.local`,
      name: 'Deleted User',
      password: null
    }

    await prisma.user.update({
      where: { id: userId },
      data: anonymizedData
    })

    // Log data anonymization
    await SecurityAuditLogger.logSecurityEvent('data_anonymization', {
      userId,
      severity: 'medium',
      data: { requestType: 'anonymization' }
    })
  }
}

// SOC2 Compliance
export class SOC2Compliance {
  static async logAccess(userId: string, resource: string, action: string) {
    await SecurityAuditLogger.logSecurityEvent('access_log', {
      userId,
      severity: 'low',
      data: { resource, action, timestamp: new Date().toISOString() }
    })
  }

  static async logDataModification(userId: string, resource: string, changes: Record<string, any>) {
    await SecurityAuditLogger.logSecurityEvent('data_modification', {
      userId,
      severity: 'medium',
      data: { resource, changes, timestamp: new Date().toISOString() }
    })
  }

  static async generateComplianceReport(startDate: Date, endDate: Date) {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const report = {
      period: { startDate, endDate },
      totalEvents: auditLogs.length,
      eventsByType: auditLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      eventsBySeverity: auditLogs.reduce((acc, log) => {
        const severity = (typeof log.details === 'string' ? JSON.parse(log.details) : log.details)?.severity || 'low'
        acc[severity] = (acc[severity] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      events: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        userId: log.userId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.createdAt,
        details: log.details
      }))
    }

    return report
  }
}

// HIPAA Compliance (if applicable)
export class HIPAACompliance {
  static async logPHIAccess(userId: string, phiType: string, action: string) {
    await SecurityAuditLogger.logSecurityEvent('phi_access', {
      userId,
      severity: 'high',
      data: { phiType, action, timestamp: new Date().toISOString() }
    })
  }

  static async encryptSensitiveData(data: any): Promise<string> {
    // In production, use proper encryption
    return Buffer.from(JSON.stringify(data)).toString('base64')
  }

  static async decryptSensitiveData(encryptedData: string): Promise<any> {
    // In production, use proper decryption
    return JSON.parse(Buffer.from(encryptedData, 'base64').toString())
  }
}

// PCI DSS Compliance
export class PCIDSSCompliance {
  static async logPaymentAccess(userId: string, paymentId: string, action: string) {
    await SecurityAuditLogger.logSecurityEvent('payment_access', {
      userId,
      severity: 'high',
      data: { paymentId, action, timestamp: new Date().toISOString() }
    })
  }

  static maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 4) return '****'
    return '*'.repeat(cardNumber.length - 4) + cardNumber.slice(-4)
  }

  static validatePCICompliance(): boolean {
    // Check if all PCI requirements are met
    const requirements = [
      'secure_network',
      'cardholder_data_protection',
      'vulnerability_management',
      'access_control',
      'network_monitoring',
      'security_policy'
    ]

    // In production, implement actual checks
    return requirements.every(req => true) // Placeholder
  }
}

// Data Retention Policy
export class DataRetentionManager {
  static async enforceRetentionPolicy() {
    const retentionPeriods = {
      auditLogs: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      usageRecords: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
      sessions: 30 * 24 * 60 * 60 * 1000, // 30 days
      notifications: 90 * 24 * 60 * 60 * 1000, // 90 days
      videoAnalytics: 365 * 24 * 60 * 60 * 1000, // 1 year
    }

    for (const [table, retentionMs] of Object.entries(retentionPeriods)) {
      const cutoffDate = new Date(Date.now() - retentionMs)
      
      try {
        switch (table) {
          case 'auditLogs':
            await prisma.auditLog.deleteMany({
              where: { createdAt: { lt: cutoffDate } }
            })
            break
          case 'usageRecords':
            await prisma.usageRecord.deleteMany({
              where: { timestamp: { lt: cutoffDate } }
            })
            break
          case 'sessions':
            await prisma.session.deleteMany({
              where: { createdAt: { lt: cutoffDate } }
            })
            break
          case 'notifications':
            await prisma.notification.deleteMany({
              where: { createdAt: { lt: cutoffDate } }
            })
            break
          case 'videoAnalytics':
            await prisma.videoAnalytics.deleteMany({
              where: { createdAt: { lt: cutoffDate } }
            })
            break
        }
        
        console.log(`Cleaned up expired ${table}`)
      } catch (error) {
        console.error(`Failed to clean up ${table}:`, error)
      }
    }
  }
}

// Consent Management
export class ConsentManager {
  static async recordConsent(userId: string, consentType: string, granted: boolean) {
    await SecurityAuditLogger.logSecurityEvent('consent_recorded', {
      userId,
      severity: 'low',
      data: { consentType, granted, timestamp: new Date().toISOString() }
    })
  }

  static async checkConsent(userId: string, consentType: string): Promise<boolean> {
    // In production, check actual consent records
    return true // Placeholder
  }

  static async withdrawConsent(userId: string, consentType: string) {
    await SecurityAuditLogger.logSecurityEvent('consent_withdrawn', {
      userId,
      severity: 'medium',
      data: { consentType, timestamp: new Date().toISOString() }
    })
  }
}

// Compliance Monitoring
export class ComplianceMonitor {
  static async generateComplianceReport(): Promise<{
    gdpr: boolean
    soc2: boolean
    hipaa: boolean
    pci: boolean
    dataRetention: boolean
    lastUpdated: string
  }> {
    const report = {
      gdpr: await this.checkGDPRCompliance(),
      soc2: await this.checkSOC2Compliance(),
      hipaa: await this.checkHIPAACompliance(),
      pci: PCIDSSCompliance.validatePCICompliance(),
      dataRetention: await this.checkDataRetentionCompliance(),
      lastUpdated: new Date().toISOString()
    }

    return report
  }

  private static async checkGDPRCompliance(): Promise<boolean> {
    // Check GDPR requirements
    return true // Placeholder
  }

  private static async checkSOC2Compliance(): Promise<boolean> {
    // Check SOC2 requirements
    return true // Placeholder
  }

  private static async checkHIPAACompliance(): Promise<boolean> {
    // Check HIPAA requirements
    return true // Placeholder
  }

  private static async checkDataRetentionCompliance(): Promise<boolean> {
    // Check data retention compliance
    return true // Placeholder
  }
}

// Schedule compliance tasks
setInterval(() => {
  DataRetentionManager.enforceRetentionPolicy().catch(console.error)
}, 24 * 60 * 60 * 1000) // Daily

export function initializeCompliance() {
  console.log('📋 Initializing compliance framework...')
  
  // Log compliance initialization
  SecurityAuditLogger.logSecurityEvent('compliance_initialized', {
    severity: 'low',
    data: { timestamp: new Date().toISOString() }
  })
  
  console.log('✅ Compliance framework initialized')
}


