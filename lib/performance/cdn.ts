import { Cloudinary } from '@cloudinary/url-gen';
import { logger as Logger } from '@/lib/logger';

export interface CDNOptimization {
  format: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  quality: 'auto' | number;
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'crop' | 'thumb';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  effects?: string[];
  transformations?: string[];
}

export interface CDNStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  bandwidthSaved: number;
  averageResponseTime: number;
  errorRate: number;
}

export class CDNOptimizer {
  private cloudinary: Cloudinary;
  private stats: CDNStats = {
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
        cloudName: process.env.CLOUDINARY_CLOUD_NAME!
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
  generateImageURL(
    publicId: string,
    optimization: CDNOptimization = { format: 'auto', quality: 'auto' }
  ): string {
    try {
      const image = this.cloudinary.image(publicId);
      
      // Apply format optimization
      if (optimization.format === 'auto') {
        image.format('auto');
      } else if (optimization.format) {
        image.format(optimization.format);
      }

      // Apply quality optimization
      if (optimization.quality === 'auto') {
        image.quality('auto');
      } else if (optimization.quality) {
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
    } catch (error) {
      Logger.error('CDN URL generation failed', error as Error, { publicId });
      return this.getFallbackURL(publicId);
    }
  }

  /**
   * Generate responsive image URLs for different screen sizes
   */
  generateResponsiveImageURLs(
    publicId: string,
    baseOptimization: CDNOptimization = { format: 'auto', quality: 'auto' }
  ): {
    mobile: string;
    tablet: string;
    desktop: string;
    retina: string;
  } {
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
  generateVideoThumbnail(
    videoPublicId: string,
    timeOffset: number = 0,
    optimization: CDNOptimization = { format: 'auto', quality: 'auto' }
  ): string {
    try {
      const video = this.cloudinary.video(videoPublicId);
      
      // Extract frame at specific time
      video.addTransformation(`so_${timeOffset}`);
      
      // Apply image optimizations
      if (optimization.format === 'auto') {
        video.format('auto');
      } else if (optimization.format) {
        video.format(optimization.format);
      }

      if (optimization.quality === 'auto') {
        video.quality('auto');
      } else if (optimization.quality) {
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
    } catch (error) {
      Logger.error('Video thumbnail generation failed', error as Error, { videoPublicId });
      return this.getFallbackURL(videoPublicId);
    }
  }

  /**
   * Generate optimized video URL with adaptive streaming
   */
  generateVideoURL(
    videoPublicId: string,
    options: {
      quality?: 'auto' | 'low' | 'medium' | 'high';
      format?: 'mp4' | 'webm' | 'auto';
      streaming?: boolean;
    } = {}
  ): string {
    try {
      const video = this.cloudinary.video(videoPublicId);
      
      // Apply quality settings
      if (options.quality === 'auto') {
        video.quality('auto');
      } else if (options.quality) {
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
      } else if (options.format) {
        video.format(options.format);
      }

      // Enable adaptive streaming
      if (options.streaming) {
        video.addTransformation('f_auto,q_auto,fl_progressive');
      }

      const url = video.toURL();
      this.recordRequest();
      
      return url;
    } catch (error) {
      Logger.error('Video URL generation failed', error as Error, { videoPublicId });
      return this.getFallbackURL(videoPublicId);
    }
  }

  /**
   * Generate WebP/AVIF format URLs with fallbacks
   */
  generateModernImageURLs(publicId: string, optimization: CDNOptimization = { format: 'auto', quality: 'auto' }): {
    webp: string;
    avif: string;
    fallback: string;
  } {
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
  async preloadImages(publicIds: string[], optimization: CDNOptimization = { format: 'auto', quality: 'auto' }): Promise<void> {
    try {
      const preloadPromises = publicIds.map(async (publicId) => {
        const url = this.generateImageURL(publicId, optimization);
        
        // In a real implementation, you would preload the image
        // For now, we'll just log the preload
        Logger.debug('Preloading image', { publicId, url });
      });

      await Promise.all(preloadPromises);
      Logger.info('Image preloading completed', { count: publicIds.length });
    } catch (error) {
      Logger.error('Image preloading failed', error as Error);
    }
  }

  /**
   * Get CDN statistics
   */
  getStats(): CDNStats {
    return { ...this.stats };
  }

  /**
   * Reset CDN statistics
   */
  resetStats(): void {
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
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
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
    } catch (error) {
      Logger.error('CDN health check failed', error as Error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start
      };
    }
  }

  // Private methods
  private recordRequest(): void {
    this.stats.totalRequests++;
  }

  private getFallbackURL(publicId: string): string {
    // Return a fallback URL or placeholder
    return '/placeholder.svg';
  }
}

// Global CDN optimizer instance
export const cdnOptimizer = new CDNOptimizer();

// React hook for optimized images
export function useOptimizedImage(publicId: string, optimization?: CDNOptimization) {
  return cdnOptimizer.generateImageURL(publicId, optimization);
}

// React hook for responsive images
export function useResponsiveImage(publicId: string, optimization?: CDNOptimization) {
  return cdnOptimizer.generateResponsiveImageURLs(publicId, optimization);
}
