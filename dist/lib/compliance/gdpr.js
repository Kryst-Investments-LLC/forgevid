import { prisma } from '@/lib/database';
import { Logger } from '@/lib/logger';
export class GDPRCompliance {
    /**
     * Handle data access request (Article 15)
     */
    static async handleDataAccessRequest(userId) {
        try {
            Logger.info('Processing GDPR data access request', { userId });
            const userData = await this.collectUserData(userId);
            // Log the request
            await this.logGDPRRequest({
                id: `access_${Date.now()}`,
                userId,
                type: 'access',
                status: 'completed',
                requestedAt: new Date(),
                completedAt: new Date(),
                data: userData
            });
            return userData;
        }
        catch (error) {
            Logger.error('Failed to process data access request', error, { userId });
            throw error;
        }
    }
    /**
     * Handle data portability request (Article 20)
     */
    static async handleDataPortabilityRequest(userId) {
        try {
            Logger.info('Processing GDPR data portability request', { userId });
            const userData = await this.collectUserData(userId);
            // Format data for portability (JSON format)
            const portableData = {
                user: userData.user,
                videos: userData.videos,
                templates: userData.templates,
                mediaAssets: userData.mediaAssets,
                usageRecords: userData.usageRecords,
                exportDate: new Date().toISOString(),
                format: 'JSON',
                version: '1.0'
            };
            await this.logGDPRRequest({
                id: `portability_${Date.now()}`,
                userId,
                type: 'portability',
                status: 'completed',
                requestedAt: new Date(),
                completedAt: new Date(),
                data: portableData
            });
            return portableData;
        }
        catch (error) {
            Logger.error('Failed to process data portability request', error, { userId });
            throw error;
        }
    }
    /**
     * Handle data rectification request (Article 16)
     */
    static async handleDataRectificationRequest(userId, corrections) {
        try {
            Logger.info('Processing GDPR data rectification request', { userId, corrections });
            // Update user data
            if (corrections.email || corrections.name) {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        ...(corrections.email && { email: corrections.email }),
                        ...(corrections.name && { name: corrections.name })
                    }
                });
            }
            // Update video data
            if (corrections.videos) {
                for (const videoUpdate of corrections.videos) {
                    await prisma.video.update({
                        where: { id: videoUpdate.id },
                        data: {
                            title: videoUpdate.title,
                            description: videoUpdate.description
                        }
                    });
                }
            }
            await this.logGDPRRequest({
                id: `rectification_${Date.now()}`,
                userId,
                type: 'rectification',
                status: 'completed',
                requestedAt: new Date(),
                completedAt: new Date(),
                data: corrections
            });
            Logger.info('Data rectification completed', { userId });
        }
        catch (error) {
            Logger.error('Failed to process data rectification request', error, { userId });
            throw error;
        }
    }
    /**
     * Handle data erasure request (Article 17 - Right to be forgotten)
     */
    static async handleDataErasureRequest(userId) {
        try {
            Logger.info('Processing GDPR data erasure request', { userId });
            // Check if user has active subscriptions or legal obligations
            const activeSubscriptions = await prisma.organizationPlan.findMany({
                where: {
                    organization: {
                        users: {
                            some: { id: userId }
                        }
                    },
                    isActive: true
                }
            });
            if (activeSubscriptions.length > 0) {
                throw new Error('Cannot delete user with active subscriptions');
            }
            // Anonymize user data instead of hard delete for audit purposes
            await prisma.user.update({
                where: { id: userId },
                data: {
                    email: `deleted_${userId}@anonymized.local`,
                    name: 'Deleted User',
                    image: null,
                    lastLoginAt: null,
                    metadata: JSON.stringify({ deletedAt: new Date().toISOString(), originalUserId: userId }),
                }
            });
            // Anonymize videos
            await prisma.video.updateMany({
                where: { userId },
                data: {
                    title: 'Deleted Video',
                    description: 'This video has been deleted',
                    fileUrl: null,
                    thumbnail: null,
                    transcript: null,
                    summary: null
                }
            });
            // Anonymize templates
            await prisma.template.updateMany({
                where: { createdById: userId },
                data: {
                    name: 'Deleted Template',
                    description: 'This template has been deleted',
                }
            });
            // Anonymize media assets
            await prisma.mediaAsset.updateMany({
                where: { uploadedById: userId },
                data: {
                    fileName: 'deleted_asset',
                    metadata: null
                }
            });
            await this.logGDPRRequest({
                id: `erasure_${Date.now()}`,
                userId,
                type: 'erasure',
                status: 'completed',
                requestedAt: new Date(),
                completedAt: new Date()
            });
            Logger.info('Data erasure completed', { userId });
        }
        catch (error) {
            Logger.error('Failed to process data erasure request', error, { userId });
            throw error;
        }
    }
    /**
     * Handle data processing restriction request (Article 18)
     */
    static async handleDataRestrictionRequest(userId, restrictionType) {
        try {
            Logger.info('Processing GDPR data restriction request', { userId, restrictionType });
            // Add restriction flag to user
            await prisma.user.update({
                where: { id: userId },
                data: {
                    metadata: JSON.stringify({
                        gdprRestrictions: {
                            [restrictionType]: true,
                            restrictedAt: new Date().toISOString()
                        }
                    })
                }
            });
            await this.logGDPRRequest({
                id: `restriction_${Date.now()}`,
                userId,
                type: 'restriction',
                status: 'completed',
                requestedAt: new Date(),
                completedAt: new Date(),
                data: { restrictionType }
            });
            Logger.info('Data restriction applied', { userId, restrictionType });
        }
        catch (error) {
            Logger.error('Failed to process data restriction request', error, { userId });
            throw error;
        }
    }
    /**
     * Collect all user data for GDPR compliance
     */
    static async collectUserData(userId) {
        const [user, videos, templates, mediaAssets, usageRecords, auditLogs] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    image: true,
                    role: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    lastLoginAt: true,
                    organizationId: true
                }
            }),
            prisma.video.findMany({
                where: { userId },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    duration: true,
                    fileSize: true,
                    createdAt: true,
                    updatedAt: true
                }
            }),
            prisma.template.findMany({
                where: { createdById: userId },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    category: true,
                    isPublic: true,
                    createdAt: true,
                    updatedAt: true
                }
            }),
            prisma.mediaAsset.findMany({
                where: { uploadedById: userId },
                select: {
                    id: true,
                    fileName: true,
                    fileSize: true,
                    createdAt: true
                }
            }),
            prisma.usageRecord.findMany({
                where: { userId },
                select: {
                    id: true,
                    action: true,
                    resourceType: true,
                    quantity: true,
                    timestamp: true
                }
            }),
            prisma.auditLog.findMany({
                where: { userId },
                select: {
                    id: true,
                    action: true,
                    details: true,
                    timestamp: true
                }
            })
        ]);
        return {
            user,
            videos,
            templates,
            mediaAssets,
            usageRecords,
            auditLogs,
            collectedAt: new Date().toISOString()
        };
    }
    /**
     * Log GDPR requests for audit purposes
     */
    static async logGDPRRequest(request) {
        await prisma.auditLog.create({
            data: {
                action: 'GDPR_REQUEST',
                userId: request.userId,
                details: JSON.stringify({
                    requestId: request.id,
                    type: request.type,
                    status: request.status,
                    requestedAt: request.requestedAt,
                    completedAt: request.completedAt,
                    reason: request.reason
                }),
                resource: 'user_data'
            }
        });
    }
    /**
     * Get GDPR compliance status for a user
     */
    static async getComplianceStatus(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                createdAt: true,
                metadata: true
            }
        });
        if (!user) {
            throw new Error('User not found');
        }
        const metadata = user.metadata ? JSON.parse(user.metadata) : {};
        const gdprRestrictions = metadata.gdprRestrictions || {};
        return {
            userId,
            email: user.email,
            accountCreated: user.createdAt,
            dataRetentionPeriod: '7 years', // Based on business requirements
            gdprRights: {
                access: true,
                portability: true,
                rectification: true,
                erasure: !gdprRestrictions.processing,
                restriction: true
            },
            restrictions: gdprRestrictions,
            lastDataExport: metadata.lastDataExport || null,
            consentGiven: metadata.consentGiven || false,
            consentDate: metadata.consentDate || null
        };
    }
    /**
     * Record user consent for data processing
     */
    static async recordConsent(userId, consentData) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                metadata: JSON.stringify({
                    consentGiven: true,
                    consentDate: new Date().toISOString(),
                    consentData: consentData
                })
            }
        });
        await this.logGDPRRequest({
            id: `consent_${Date.now()}`,
            userId,
            type: 'access', // Using access type for consent logging
            status: 'completed',
            requestedAt: new Date(),
            completedAt: new Date(),
            data: consentData
        });
    }
}
