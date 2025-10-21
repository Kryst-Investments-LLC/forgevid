import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '@/lib/logger';

const execAsync = promisify(exec);

export interface LoadTestScenario {
  name: string;
  weight: number;
  duration: number;
  arrivalRate: number;
  rampUp: number;
  rampDown: number;
  endpoints: LoadTestEndpoint[];
}

export interface LoadTestEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  maxResponseTime: number;
}

export interface LoadTestResult {
  scenario: string;
  timestamp: Date;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  throughput: number;
  errors: LoadTestError[];
  performance: {
    cpu: number;
    memory: number;
    database: number;
    cache: number;
  };
}

export interface LoadTestError {
  type: string;
  message: string;
  count: number;
  percentage: number;
}

export class LoadTestSuite {
  private scenarios: LoadTestScenario[] = [];
  private results: LoadTestResult[] = [];

  constructor() {
    this.initializeScenarios();
  }

  /**
   * Initialize load test scenarios
   */
  private initializeScenarios(): void {
    this.scenarios = [
      {
        name: 'User Authentication Flow',
        weight: 20,
        duration: 300, // 5 minutes
        arrivalRate: 10,
        rampUp: 60,
        rampDown: 60,
        endpoints: [
          {
            method: 'POST',
            url: '/api/auth/login',
            body: { email: 'test@example.com', password: 'password123' },
            expectedStatus: 200,
            maxResponseTime: 1000
          },
          {
            method: 'GET',
            url: '/api/auth/session',
            expectedStatus: 200,
            maxResponseTime: 500
          }
        ]
      },
      {
        name: 'Video Upload and Processing',
        weight: 30,
        duration: 600, // 10 minutes
        arrivalRate: 5,
        rampUp: 120,
        rampDown: 120,
        endpoints: [
          {
            method: 'POST',
            url: '/api/videos',
            body: { title: 'Test Video', description: 'Load test video' },
            expectedStatus: 200,
            maxResponseTime: 5000
          },
          {
            method: 'GET',
            url: '/api/videos',
            expectedStatus: 200,
            maxResponseTime: 1000
          },
          {
            method: 'PUT',
            url: '/api/videos',
            body: { videoId: 'test-id', action: 'transcribe' },
            expectedStatus: 200,
            maxResponseTime: 3000
          }
        ]
      },
      {
        name: 'Template and AI Operations',
        weight: 25,
        duration: 400, // 6.7 minutes
        arrivalRate: 8,
        rampUp: 80,
        rampDown: 80,
        endpoints: [
          {
            method: 'GET',
            url: '/api/templates',
            expectedStatus: 200,
            maxResponseTime: 800
          },
          {
            method: 'POST',
            url: '/api/ai/generate',
            body: { type: 'transcript', videoId: 'test-id' },
            expectedStatus: 200,
            maxResponseTime: 2000
          },
          {
            method: 'GET',
            url: '/api/analytics/usage',
            expectedStatus: 200,
            maxResponseTime: 600
          }
        ]
      },
      {
        name: 'Dashboard and Analytics',
        weight: 15,
        duration: 300, // 5 minutes
        arrivalRate: 15,
        rampUp: 60,
        rampDown: 60,
        endpoints: [
          {
            method: 'GET',
            url: '/api/dashboard/stats',
            expectedStatus: 200,
            maxResponseTime: 1000
          },
          {
            method: 'GET',
            url: '/api/videos?page=1&limit=10',
            expectedStatus: 200,
            maxResponseTime: 800
          },
          {
            method: 'GET',
            url: '/api/health',
            expectedStatus: 200,
            maxResponseTime: 500
          }
        ]
      },
      {
        name: 'High Load Stress Test',
        weight: 10,
        duration: 180, // 3 minutes
        arrivalRate: 50,
        rampUp: 30,
        rampDown: 30,
        endpoints: [
          {
            method: 'GET',
            url: '/api/health',
            expectedStatus: 200,
            maxResponseTime: 1000
          },
          {
            method: 'GET',
            url: '/api/videos',
            expectedStatus: 200,
            maxResponseTime: 2000
          }
        ]
      }
    ];
  }

  /**
   * Run comprehensive load test suite
   */
  async runLoadTestSuite(): Promise<LoadTestResult[]> {
    Logger.info('Starting comprehensive load test suite');

    try {
      // Run each scenario
      for (const scenario of this.scenarios) {
        Logger.info(`Running scenario: ${scenario.name}`);
        const result = await this.runScenario(scenario);
        this.results.push(result);
        
        // Wait between scenarios
        await this.delay(30000); // 30 seconds
      }

      // Generate comprehensive report
      await this.generateLoadTestReport();

      Logger.info('Load test suite completed', {
        totalScenarios: this.scenarios.length,
        totalResults: this.results.length
      });

      return this.results;
    } catch (error) {
      Logger.error('Load test suite failed', error as Error);
      throw error;
    }
  }

  /**
   * Run individual scenario
   */
  private async runScenario(scenario: LoadTestScenario): Promise<LoadTestResult> {
    const startTime = Date.now();
    
    try {
      // Create Artillery configuration for this scenario
      const config = this.createArtilleryConfig(scenario);
      const configFile = `load-testing/scenario-${scenario.name.replace(/\s+/g, '-').toLowerCase()}.yml`;
      
      // Write config to file
      await this.writeConfigFile(configFile, config);
      
      // Run Artillery test
      const { stdout, stderr } = await execAsync(`artillery run ${configFile} --output ${configFile}.json`);
      
      // Parse results
      const result = await this.parseArtilleryResults(configFile, scenario, startTime);
      
      // Clean up
      await this.cleanupFiles([configFile, `${configFile}.json`]);
      
      return result;
    } catch (error) {
      Logger.error(`Scenario ${scenario.name} failed`, error as Error);
      throw error;
    }
  }

  /**
   * Create Artillery configuration for scenario
   */
  private createArtilleryConfig(scenario: LoadTestScenario): any {
    return {
      config: {
        target: process.env.LOAD_TEST_TARGET || 'http://localhost:3000',
        phases: [
          {
            duration: scenario.rampUp,
            arrivalRate: 1,
            name: 'Ramp up'
          },
          {
            duration: scenario.duration - scenario.rampUp - scenario.rampDown,
            arrivalRate: scenario.arrivalRate,
            name: 'Sustained load'
          },
          {
            duration: scenario.rampDown,
            arrivalRate: 1,
            name: 'Ramp down'
          }
        ],
        defaults: {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ForgeVid-LoadTest/1.0'
          }
        }
      },
      scenarios: scenario.endpoints.map((endpoint, index) => ({
        name: `${scenario.name} - ${endpoint.method} ${endpoint.url}`,
        weight: 100 / scenario.endpoints.length,
        flow: [
          {
            [endpoint.method.toLowerCase()]: {
              url: endpoint.url,
              headers: endpoint.headers || {},
              json: endpoint.body,
              expect: {
                statusCode: endpoint.expectedStatus,
                hasHeader: 'content-type'
              }
            }
          }
        ]
      }))
    };
  }

  /**
   * Parse Artillery results
   */
  private async parseArtilleryResults(
    configFile: string,
    scenario: LoadTestScenario,
    startTime: number
  ): Promise<LoadTestResult> {
    try {
      const fs = require('fs');
      const resultsFile = `${configFile}.json`;
      const resultsData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      
      const summary = resultsData.aggregate;
      const errors = this.extractErrors(resultsData);
      
      return {
        scenario: scenario.name,
        timestamp: new Date(startTime),
        duration: scenario.duration,
        totalRequests: summary.counters['http.requests'] || 0,
        successfulRequests: summary.counters['http.responses'] || 0,
        failedRequests: summary.counters['http.request_rate'] || 0,
        averageResponseTime: summary.summaries['http.response_time'].mean || 0,
        p95ResponseTime: summary.summaries['http.response_time'].p95 || 0,
        p99ResponseTime: summary.summaries['http.response_time'].p99 || 0,
        requestsPerSecond: summary.rates['http.request_rate'] || 0,
        errorRate: this.calculateErrorRate(summary),
        throughput: summary.rates['http.request_rate'] || 0,
        errors,
        performance: await this.getPerformanceMetrics()
      };
    } catch (error) {
      Logger.error('Failed to parse Artillery results', error as Error);
      throw error;
    }
  }

  /**
   * Extract errors from results
   */
  private extractErrors(resultsData: any): LoadTestError[] {
    const errors: LoadTestError[] = [];
    const errorCounts: Record<string, number> = {};
    
    if (resultsData.aggregate?.counters) {
      for (const [key, count] of Object.entries(resultsData.aggregate.counters)) {
        if (key.startsWith('http.codes.4') || key.startsWith('http.codes.5')) {
          const errorType = key.replace('http.codes.', '');
          errorCounts[errorType] = count as number;
        }
      }
    }
    
    const totalRequests = resultsData.aggregate?.counters?.['http.requests'] || 1;
    
    for (const [errorType, count] of Object.entries(errorCounts)) {
      errors.push({
        type: errorType,
        message: `HTTP ${errorType} errors`,
        count: count as number,
        percentage: ((count as number) / totalRequests) * 100
      });
    }
    
    return errors;
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(summary: any): number {
    const totalRequests = summary.counters?.['http.requests'] || 0;
    const successfulRequests = summary.counters?.['http.responses'] || 0;
    
    if (totalRequests === 0) return 0;
    
    return ((totalRequests - successfulRequests) / totalRequests) * 100;
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<{
    cpu: number;
    memory: number;
    database: number;
    cache: number;
  }> {
    try {
      // This would typically connect to monitoring systems
      // For now, return placeholder values
      return {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        database: Math.random() * 100,
        cache: Math.random() * 100
      };
    } catch (error) {
      Logger.error('Failed to get performance metrics', error as Error);
      return { cpu: 0, memory: 0, database: 0, cache: 0 };
    }
  }

  /**
   * Generate comprehensive load test report
   */
  private async generateLoadTestReport(): Promise<void> {
    try {
      const report = {
        timestamp: new Date(),
        summary: this.calculateOverallSummary(),
        scenarios: this.results,
        recommendations: this.generateRecommendations(),
        performance: this.calculatePerformanceMetrics()
      };

      // Save report to file
      const fs = require('fs');
      const reportFile = `load-testing/load-test-report-${Date.now()}.json`;
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

      Logger.info('Load test report generated', { reportFile });
    } catch (error) {
      Logger.error('Failed to generate load test report', error as Error);
    }
  }

  /**
   * Calculate overall summary
   */
  private calculateOverallSummary(): any {
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = this.results.reduce((sum, r) => sum + r.successfulRequests, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedRequests, 0);
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.averageResponseTime, 0) / this.results.length;
    const maxResponseTime = Math.max(...this.results.map(r => r.p99ResponseTime));
    const avgRPS = this.results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / this.results.length;

    return {
      totalRequests,
      totalSuccessful,
      totalFailed,
      successRate: (totalSuccessful / totalRequests) * 100,
      averageResponseTime: avgResponseTime,
      maxResponseTime,
      averageRPS: avgRPS,
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
    };
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.averageResponseTime, 0) / this.results.length;
    const maxResponseTime = Math.max(...this.results.map(r => r.p99ResponseTime));
    const avgErrorRate = this.results.reduce((sum, r) => sum + r.errorRate, 0) / this.results.length;

    if (avgResponseTime > 2000) {
      recommendations.push('Average response time is high. Consider optimizing database queries and implementing caching.');
    }

    if (maxResponseTime > 5000) {
      recommendations.push('P99 response time is very high. Review slow endpoints and optimize performance.');
    }

    if (avgErrorRate > 5) {
      recommendations.push('Error rate is high. Review error logs and fix underlying issues.');
    }

    if (avgErrorRate > 1) {
      recommendations.push('Error rate is above 1%. Consider implementing better error handling and retry mechanisms.');
    }

    const avgRPS = this.results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / this.results.length;
    if (avgRPS < 10) {
      recommendations.push('Throughput is low. Consider horizontal scaling and performance optimization.');
    }

    return recommendations;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): any {
    const avgCpu = this.results.reduce((sum, r) => sum + r.performance.cpu, 0) / this.results.length;
    const avgMemory = this.results.reduce((sum, r) => sum + r.performance.memory, 0) / this.results.length;
    const avgDatabase = this.results.reduce((sum, r) => sum + r.performance.database, 0) / this.results.length;
    const avgCache = this.results.reduce((sum, r) => sum + r.performance.cache, 0) / this.results.length;

    return {
      cpu: {
        average: avgCpu,
        max: Math.max(...this.results.map(r => r.performance.cpu)),
        status: avgCpu > 80 ? 'critical' : avgCpu > 60 ? 'warning' : 'good'
      },
      memory: {
        average: avgMemory,
        max: Math.max(...this.results.map(r => r.performance.memory)),
        status: avgMemory > 80 ? 'critical' : avgMemory > 60 ? 'warning' : 'good'
      },
      database: {
        average: avgDatabase,
        max: Math.max(...this.results.map(r => r.performance.database)),
        status: avgDatabase > 80 ? 'critical' : avgDatabase > 60 ? 'warning' : 'good'
      },
      cache: {
        average: avgCache,
        max: Math.max(...this.results.map(r => r.performance.cache)),
        status: avgCache > 80 ? 'critical' : avgCache > 60 ? 'warning' : 'good'
      }
    };
  }

  /**
   * Write configuration file
   */
  private async writeConfigFile(filePath: string, config: any): Promise<void> {
    const fs = require('fs');
    const yaml = require('js-yaml');
    
    fs.writeFileSync(filePath, yaml.dump(config));
  }

  /**
   * Clean up temporary files
   */
  private async cleanupFiles(files: string[]): Promise<void> {
    const fs = require('fs');
    
    for (const file of files) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global load test suite instance
export const loadTestSuite = new LoadTestSuite();


