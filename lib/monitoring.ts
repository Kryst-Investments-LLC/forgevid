import { logger } from './logger';
import { productionConfig } from '../config/production';

export interface SecurityEvent {
  type: 'rate_limit' | 'suspicious_request' | 'error_rate' | 'response_time' | 'authentication_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface AlertThreshold {
  rateLimitViolations: number;
  suspiciousRequests: number;
  errorRate: number;
  responseTime: number;
}

export class SecurityMonitor {
  private eventCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private lastResetTime: Date = new Date();
  private thresholds: AlertThreshold;

  constructor() {
    this.thresholds = productionConfig.monitoring.thresholds;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Reset counters every hour
    setInterval(() => {
      this.resetCounters();
    }, 60 * 60 * 1000);

    // Check thresholds every 5 minutes
    setInterval(() => {
      this.checkThresholds();
    }, 5 * 60 * 1000);
  }

  private resetCounters(): void {
    this.eventCounts.clear();
    this.errorCounts.clear();
    this.responseTimes = [];
    this.lastResetTime = new Date();
    logger.info('Monitoring counters reset');
  }

  public recordEvent(event: SecurityEvent): void {
    const key = `${event.type}_${event.severity}`;
    const count = this.eventCounts.get(key) || 0;
    this.eventCounts.set(key, count + 1);

    // Log security event
    logger.warn(`Security Event: ${event.type}`, {
      severity: event.severity,
      message: event.message,
      data: event.data,
      timestamp: event.timestamp,
    });

    // Check if we need to send an alert
    this.checkEventThreshold(event);
  }

  public recordError(endpoint: string, statusCode: number): void {
    const key = `${endpoint}_${statusCode}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
  }

  public recordResponseTime(duration: number): void {
    this.responseTimes.push(duration);
    
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  private checkEventThreshold(event: SecurityEvent): void {
    const key = `${event.type}_${event.severity}`;
    const count = this.eventCounts.get(key) || 0;

    let shouldAlert = false;
    let threshold = 0;

    switch (event.type) {
      case 'rate_limit':
        threshold = this.thresholds.rateLimitViolations;
        shouldAlert = count >= threshold;
        break;
      case 'suspicious_request':
        threshold = this.thresholds.suspiciousRequests;
        shouldAlert = count >= threshold;
        break;
      case 'authentication_failure':
        threshold = 10; // Alert after 10 auth failures
        shouldAlert = count >= threshold;
        break;
    }

    if (shouldAlert) {
      this.sendAlert({
        type: event.type,
        severity: event.severity,
        message: `Threshold exceeded: ${count} ${event.type} events in the last hour`,
        data: { count, threshold, event },
        timestamp: new Date(),
      });
    }
  }

  private checkThresholds(): void {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check error rate
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalRequests = this.responseTimes.length;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    if (errorRate > this.thresholds.errorRate) {
      this.sendAlert({
        type: 'error_rate',
        severity: 'high',
        message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
        data: { errorRate, totalErrors, totalRequests },
        timestamp: now,
      });
    }

    // Check average response time
    if (this.responseTimes.length > 0) {
      const avgResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
      
      if (avgResponseTime > this.thresholds.responseTime) {
        this.sendAlert({
          type: 'response_time',
          severity: 'medium',
          message: `High response time detected: ${avgResponseTime.toFixed(2)}ms`,
          data: { avgResponseTime, sampleSize: this.responseTimes.length },
          timestamp: now,
        });
      }
    }
  }

  private async sendAlert(event: SecurityEvent): Promise<void> {
    logger.error(`SECURITY ALERT: ${event.message}`, event.data);

    // Send email alert
    if (productionConfig.monitoring.alerts.email.enabled) {
      await this.sendEmailAlert(event);
    }

    // Send webhook alert
    if (productionConfig.monitoring.alerts.webhook.enabled) {
      await this.sendWebhookAlert(event);
    }

    // Send Slack alert
    if (productionConfig.monitoring.alerts.slack.enabled) {
      await this.sendSlackAlert(event);
    }
  }

  private async sendEmailAlert(event: SecurityEvent): Promise<void> {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport(productionConfig.monitoring.alerts.email.smtp);

      const mailOptions = {
        from: productionConfig.monitoring.alerts.email.smtp.auth.user,
        to: productionConfig.monitoring.alerts.email.recipients.join(','),
        subject: `🚨 ForgeVid Security Alert: ${event.type.toUpperCase()}`,
        html: `
          <h2>Security Alert</h2>
          <p><strong>Type:</strong> ${event.type}</p>
          <p><strong>Severity:</strong> ${event.severity}</p>
          <p><strong>Message:</strong> ${event.message}</p>
          <p><strong>Timestamp:</strong> ${event.timestamp.toISOString()}</p>
          <h3>Details:</h3>
          <pre>${JSON.stringify(event.data, null, 2)}</pre>
        `,
      };

      await transporter.sendMail(mailOptions);
      logger.info('Email alert sent successfully');
    } catch (error) {
      logger.error('Failed to send email alert', error);
    }
  }

  private async sendWebhookAlert(event: SecurityEvent): Promise<void> {
    try {
      const payload = {
        text: `🚨 ForgeVid Security Alert`,
        attachments: [
          {
            color: this.getSeverityColor(event.severity),
            fields: [
              { title: 'Type', value: event.type, short: true },
              { title: 'Severity', value: event.severity, short: true },
              { title: 'Message', value: event.message, short: false },
              { title: 'Timestamp', value: event.timestamp.toISOString(), short: true },
            ],
          },
        ],
      };

      const response = await fetch(productionConfig.monitoring.alerts.webhook.url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${productionConfig.monitoring.alerts.webhook.secret}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        logger.info('Webhook alert sent successfully');
      } else {
        logger.error('Webhook alert failed', { status: response.status });
      }
    } catch (error) {
      logger.error('Failed to send webhook alert', error);
    }
  }

  private async sendSlackAlert(event: SecurityEvent): Promise<void> {
    try {
      const payload = {
        channel: productionConfig.monitoring.alerts.slack.channel,
        text: `🚨 *ForgeVid Security Alert*`,
        attachments: [
          {
            color: this.getSeverityColor(event.severity),
            fields: [
              { title: 'Type', value: event.type, short: true },
              { title: 'Severity', value: event.severity, short: true },
              { title: 'Message', value: event.message, short: false },
              { title: 'Timestamp', value: event.timestamp.toISOString(), short: true },
            ],
          },
        ],
      };

      const response = await fetch(productionConfig.monitoring.alerts.slack.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        logger.info('Slack alert sent successfully');
      } else {
        logger.error('Slack alert failed', { status: response.status });
      }
    } catch (error) {
      logger.error('Failed to send Slack alert', error);
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ffcc00';
      case 'low': return '#00ff00';
      default: return '#cccccc';
    }
  }

  public getMetrics(): Record<string, any> {
    return {
      eventCounts: Object.fromEntries(this.eventCounts),
      errorCounts: Object.fromEntries(this.errorCounts),
      avgResponseTime: this.responseTimes.length > 0 
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length 
        : 0,
      totalRequests: this.responseTimes.length,
      lastReset: this.lastResetTime,
    };
  }
}

// Create global monitor instance
export const securityMonitor = new SecurityMonitor();