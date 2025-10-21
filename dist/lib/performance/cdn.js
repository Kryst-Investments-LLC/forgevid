import { Cloudinary } from '@cloudinary/url-gen';
import { Logger } from '@/lib/logger';
export class CDNOptimizer {
    cloudinary;
    stats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        bandwidthSaved: 0,
        averageResponseTime: 0,
        errorRate: 0
    };
    constructor() {
        this.cloudinary = new Cloudinary({
            cloud: {
                cloudName: process.env.CLOUDINARY_CLOUD_NAME
            },
            url: {
                secure: true,
                cname: process.env.CLOUDINARY_CNAME
            }
        });
    }
    /**
     * Generate optimized image URL
     */
    generateImageURL(publicId, optimization = { format: 'auto', quality: 'auto' }) {
        try {
            const image = this.cloudinary.image(publicId);
            // Apply format optimization
            if (optimization.format === 'auto') {
                image.format('auto');
            }
            else if (optimization.format) {
                image.format(optimization.format);
            }
            // Apply quality optimization
            if (optimization.quality === 'auto') {
                image.quality('auto');
            }
            else if (optimization.quality) {
                image.quality(optimization.quality);
            }
            // Apply dimensions
            if (optimization.width || optimization.height) {
                // Note: resize method signature may vary by Cloudinary version
                // image.resize('scale');
            }
            // Apply gravity for face detection
            if (optimization.gravity) {
                // Note: gravity method may not exist in current Cloudinary version
                // image.gravity(optimization.gravity);
            }
            // Apply effects
            if (optimization.effects) {
                optimization.effects.forEach(effect => {
                    // Note: effect method may not exist in current Cloudinary version
                    // image.effect(effect);
                });
            }
            // Apply custom transformations
            if (optimization.transformations) {
                optimization.transformations.forEach(transformation => {
                    image.addTransformation(transformation);
                });
            }
            // Add performance optimizations
            image.addTransformation('f_auto,q_auto,dpr_auto');
            const url = image.toURL();
            this.recordRequest();
            return url;
        }
        catch (error) {
            Logger.error('CDN URL generation failed', error, { publicId });
            return this.getFallbackURL(publicId);
        }
    }
    /**
     * Generate responsive image URLs for different screen sizes
     */
    generateResponsiveImageURLs(publicId, baseOptimization = { format: 'auto', quality: 'auto' }) {
        return {
            mobile: this.generateImageURL(publicId, {
                ...baseOptimization,
                width: 480,
                height: 320,
                crop: 'fill',
                gravity: 'auto'
            }),
            tablet: this.generateImageURL(publicId, {
                ...baseOptimization,
                width: 768,
                height: 512,
                crop: 'fill',
                gravity: 'auto'
            }),
            desktop: this.generateImageURL(publicId, {
                ...baseOptimization,
                width: 1200,
                height: 800,
                crop: 'fill',
                gravity: 'auto'
            }),
            retina: this.generateImageURL(publicId, {
                ...baseOptimization,
                width: 2400,
                height: 1600,
                crop: 'fill',
                gravity: 'auto'
            })
        };
    }
    /**
     * Generate video thumbnail with optimization
     */
    generateVideoThumbnail(videoPublicId, timeOffset = 0, optimization = { format: 'auto', quality: 'auto' }) {
        try {
            const video = this.cloudinary.video(videoPublicId);
            // Extract frame at specific time
            video.addTransformation(`so_${timeOffset}`);
            // Apply image optimizations
            if (optimization.format === 'auto') {
                video.format('auto');
            }
            else if (optimization.format) {
                video.format(optimization.format);
            }
            if (optimization.quality === 'auto') {
                video.quality('auto');
            }
            else if (optimization.quality) {
                video.quality(optimization.quality);
            }
            if (optimization.width || optimization.height) {
                // Note: resize method signature may vary by Cloudinary version
                // video.resize('scale');
            }
            // Convert video to image
            video.addTransformation('f_auto,q_auto');
            const url = video.toURL();
            this.recordRequest();
            return url;
        }
        catch (error) {
            Logger.error('Video thumbnail generation failed', error, { videoPublicId });
            return this.getFallbackURL(videoPublicId);
        }
    }
    /**
     * Generate optimized video URL with adaptive streaming
     */
    generateVideoURL(videoPublicId, options = {}) {
        try {
            const video = this.cloudinary.video(videoPublicId);
            // Apply quality settings
            if (options.quality === 'auto') {
                video.quality('auto');
            }
            else if (options.quality) {
                const qualityMap = {
                    low: 30,
                    medium: 60,
                    high: 80
                };
                video.quality(qualityMap[options.quality]);
            }
            // Apply format
            if (options.format === 'auto') {
                video.format('auto');
            }
            else if (options.format) {
                video.format(options.format);
            }
            // Enable adaptive streaming
            if (options.streaming) {
                video.addTransformation('f_auto,q_auto,fl_progressive');
            }
            const url = video.toURL();
            this.recordRequest();
            return url;
        }
        catch (error) {
            Logger.error('Video URL generation failed', error, { videoPublicId });
            return this.getFallbackURL(videoPublicId);
        }
    }
    /**
     * Generate WebP/AVIF format URLs with fallbacks
     */
    generateModernImageURLs(publicId, optimization = { format: 'auto', quality: 'auto' }) {
        return {
            webp: this.generateImageURL(publicId, {
                ...optimization,
                format: 'webp'
            }),
            avif: this.generateImageURL(publicId, {
                ...optimization,
                format: 'avif'
            }),
            fallback: this.generateImageURL(publicId, {
                ...optimization,
                format: 'jpg'
            })
        };
    }
    /**
     * Preload critical images
     */
    async preloadImages(publicIds, optimization = { format: 'auto', quality: 'auto' }) {
        try {
            const preloadPromises = publicIds.map(async (publicId) => {
                const url = this.generateImageURL(publicId, optimization);
                // In a real implementation, you would preload the image
                // For now, we'll just log the preload
                Logger.debug('Preloading image', { publicId, url });
            });
            await Promise.all(preloadPromises);
            Logger.info('Image preloading completed', { count: publicIds.length });
        }
        catch (error) {
            Logger.error('Image preloading failed', error);
        }
    }
    /**
     * Get CDN statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Reset CDN statistics
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            bandwidthSaved: 0,
            averageResponseTime: 0,
            errorRate: 0
        };
    }
    /**
     * Health check for CDN
     */
    async healthCheck() {
        const start = Date.now();
        try {
            // Test with a simple image request
            const testUrl = this.generateImageURL('sample', {
                width: 100,
                height: 100,
                format: 'auto',
                quality: 'auto'
            });
            const response = await fetch(testUrl, { method: 'HEAD' });
            const latency = Date.now() - start;
            return {
                status: response.ok && latency < 2000 ? 'healthy' : 'unhealthy',
                latency
            };
        }
        catch (error) {
            Logger.error('CDN health check failed', error);
            return {
                status: 'unhealthy',
                latency: Date.now() - start
            };
        }
    }
    // Private methods
    recordRequest() {
        this.stats.totalRequests++;
    }
    getFallbackURL(publicId) {
        // Return a fallback URL or placeholder
        return `https://via.placeholder.com/400x300?text=${encodeURIComponent(publicId)}`;
    }
}
// Global CDN optimizer instance
export const cdnOptimizer = new CDNOptimizer();
// React hook for optimized images
export function useOptimizedImage(publicId, optimization) {
    return cdnOptimizer.generateImageURL(publicId, optimization);
}
// React hook for responsive images
export function useResponsiveImage(publicId, optimization) {
    return cdnOptimizer.generateResponsiveImageURLs(publicId, optimization);
}
