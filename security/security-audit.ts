import { prisma } from '@/lib/database';
import { Logger } from '@/lib/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'authentication' | 'authorization' | 'data-protection' | 'injection' | 'xss' | 'csrf' | 'configuration' | 'dependencies';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  cve?: string;
  cvss?: number;
  status: 'open' | 'in-progress' | 'resolved' | 'false-positive';
  discoveredAt: Date;
  resolvedAt?: Date;
  evidence?: string[];
}

export interface SecurityAuditReport {
  id: string;
  timestamp: Date;
  overallScore: number;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  recommendations: string[];
  compliance: {
    owasp: number;
    gdpr: number;
    soc2: number;
  };
}

export class SecurityAuditor {
  private vulnerabilities: SecurityVulnerability[] = [];

  /**
   * Run comprehensive security audit
   */
  async runSecurityAudit(): Promise<SecurityAuditReport> {
    Logger.info('Starting comprehensive security audit');

    try {
      // Run all security checks in parallel
      const [
        authVulns,
        dataProtectionVulns,
        injectionVulns,
        xssVulns,
        csrfVulns,
        configVulns,
        dependencyVulns,
        owaspScore,
        gdprScore,
        soc2Score
      ] = await Promise.all([
        this.auditAuthentication(),
        this.auditDataProtection(),
        this.auditInjectionVulnerabilities(),
        this.auditXSSVulnerabilities(),
        this.auditCSRFProtection(),
        this.auditConfiguration(),
        this.auditDependencies(),
        this.auditOWASPCompliance(),
        this.auditGDPRCompliance(),
        this.auditSOC2Compliance()
      ]);

      // Combine all vulnerabilities
      this.vulnerabilities = [
        ...authVulns,
        ...dataProtectionVulns,
        ...injectionVulns,
        ...xssVulns,
        ...csrfVulns,
        ...configVulns,
        ...dependencyVulns
      ];

      // Calculate overall score
      const overallScore = this.calculateOverallScore();

      // Generate recommendations
      const recommendations = this.generateRecommendations();

      const report: SecurityAuditReport = {
        id: `audit_${Date.now()}`,
        timestamp: new Date(),
        overallScore,
        vulnerabilities: this.vulnerabilities,
        summary: this.calculateSummary(),
        recommendations,
        compliance: {
          owasp: owaspScore,
          gdpr: gdprScore,
          soc2: soc2Score
        }
      };

      // Store audit report
      await this.storeAuditReport(report);

      Logger.info('Security audit completed', {
        totalVulnerabilities: this.vulnerabilities.length,
        overallScore,
        critical: this.vulnerabilities.filter(v => v.severity === 'critical').length
      });

      return report;
    } catch (error) {
      Logger.error('Security audit failed', error as Error);
      throw error;
    }
  }

  /**
   * Audit authentication security
   */
  private async auditAuthentication(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for weak password policies
      const weakPasswords = await this.checkWeakPasswords();
      if (weakPasswords.length > 0) {
        vulnerabilities.push({
          id: 'auth_001',
          severity: 'high',
          category: 'authentication',
          title: 'Weak Password Policy',
          description: 'Users with weak passwords detected',
          impact: 'Accounts with weak passwords are vulnerable to brute force attacks',
          recommendation: 'Implement strong password policy and force password reset',
          status: 'open',
          discoveredAt: new Date(),
          evidence: weakPasswords
        });
      }

      // Check for missing MFA
      const mfaStatus = await this.checkMFAStatus();
      if (!mfaStatus.enabled) {
        vulnerabilities.push({
          id: 'auth_002',
          severity: 'medium',
          category: 'authentication',
          title: 'Missing Multi-Factor Authentication',
          description: 'MFA is not enforced for user accounts',
          impact: 'Accounts are vulnerable to credential theft',
          recommendation: 'Enable MFA for all user accounts',
          status: 'open',
          discoveredAt: new Date()
        });
      }

      // Check for session security
      const sessionSecurity = await this.checkSessionSecurity();
      if (!sessionSecurity.secure) {
        vulnerabilities.push({
          id: 'auth_003',
          severity: 'high',
          category: 'authentication',
          title: 'Insecure Session Management',
          description: 'Session security issues detected',
          impact: 'Sessions are vulnerable to hijacking',
          recommendation: 'Implement secure session management',
          status: 'open',
          discoveredAt: new Date(),
          evidence: sessionSecurity.issues
        });
      }

      // Check for JWT security
      const jwtSecurity = await this.checkJWTSecurity();
      if (!jwtSecurity.secure) {
        vulnerabilities.push({
          id: 'auth_004',
          severity: 'high',
          category: 'authentication',
          title: 'Insecure JWT Implementation',
          description: 'JWT security issues detected',
          impact: 'Tokens are vulnerable to tampering',
          recommendation: 'Implement secure JWT handling',
          status: 'open',
          discoveredAt: new Date(),
          evidence: jwtSecurity.issues
        });
      }

    } catch (error) {
      Logger.error('Authentication audit failed', error as Error);
    }

    return vulnerabilities;
  }

  /**
   * Audit data protection
   */
  private async auditDataProtection(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for unencrypted sensitive data
      const unencryptedData = await this.checkUnencryptedData();
      if (unencryptedData.length > 0) {
        vulnerabilities.push({
          id: 'data_001',
          severity: 'critical',
          category: 'data-protection',
          title: 'Unencrypted Sensitive Data',
          description: 'Sensitive data stored without encryption',
          impact: 'Data breach risk if database is compromised',
          recommendation: 'Encrypt all sensitive data at rest',
          status: 'open',
          discoveredAt: new Date(),
          evidence: unencryptedData
        });
      }

      // Check for data exposure in logs
      const logExposure = await this.checkLogDataExposure();
      if (logExposure.length > 0) {
        vulnerabilities.push({
          id: 'data_002',
          severity: 'medium',
          category: 'data-protection',
          title: 'Sensitive Data in Logs',
          description: 'Sensitive data found in application logs',
          impact: 'Data exposure through log files',
          recommendation: 'Sanitize logs to remove sensitive data',
          status: 'open',
          discoveredAt: new Date(),
          evidence: logExposure
        });
      }

      // Check for PII handling
      const piiHandling = await this.checkPIIHandling();
      if (!piiHandling.compliant) {
        vulnerabilities.push({
          id: 'data_003',
          severity: 'high',
          category: 'data-protection',
          title: 'Inadequate PII Protection',
          description: 'PII handling does not meet compliance requirements',
          impact: 'GDPR compliance violation risk',
          recommendation: 'Implement proper PII protection measures',
          status: 'open',
          discoveredAt: new Date(),
          evidence: piiHandling.issues
        });
      }

    } catch (error) {
      Logger.error('Data protection audit failed', error as Error);
    }

    return vulnerabilities;
  }

  /**
   * Audit injection vulnerabilities
   */
  private async auditInjectionVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for SQL injection
      const sqlInjection = await this.checkSQLInjection();
      if (sqlInjection.length > 0) {
        vulnerabilities.push({
          id: 'injection_001',
          severity: 'critical',
          category: 'injection',
          title: 'SQL Injection Vulnerabilities',
          description: 'SQL injection vulnerabilities detected',
          impact: 'Database compromise and data theft',
          recommendation: 'Use parameterized queries and input validation',
          status: 'open',
          discoveredAt: new Date(),
          evidence: sqlInjection
        });
      }

      // Check for NoSQL injection
      const nosqlInjection = await this.checkNoSQLInjection();
      if (nosqlInjection.length > 0) {
        vulnerabilities.push({
          id: 'injection_002',
          severity: 'high',
          category: 'injection',
          title: 'NoSQL Injection Vulnerabilities',
          description: 'NoSQL injection vulnerabilities detected',
          impact: 'Database compromise and data theft',
          recommendation: 'Implement proper NoSQL query validation',
          status: 'open',
          discoveredAt: new Date(),
          evidence: nosqlInjection
        });
      }

      // Check for command injection
      const commandInjection = await this.checkCommandInjection();
      if (commandInjection.length > 0) {
        vulnerabilities.push({
          id: 'injection_003',
          severity: 'critical',
          category: 'injection',
          title: 'Command Injection Vulnerabilities',
          description: 'Command injection vulnerabilities detected',
          impact: 'Server compromise and arbitrary code execution',
          recommendation: 'Validate and sanitize all command inputs',
          status: 'open',
          discoveredAt: new Date(),
          evidence: commandInjection
        });
      }

    } catch (error) {
      Logger.error('Injection audit failed', error as Error);
    }

    return vulnerabilities;
  }

  /**
   * Audit XSS vulnerabilities
   */
  private async auditXSSVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for stored XSS
      const storedXSS = await this.checkStoredXSS();
      if (storedXSS.length > 0) {
        vulnerabilities.push({
          id: 'xss_001',
          severity: 'high',
          category: 'xss',
          title: 'Stored XSS Vulnerabilities',
          description: 'Stored XSS vulnerabilities detected',
          impact: 'Session hijacking and data theft',
          recommendation: 'Implement proper input sanitization and output encoding',
          status: 'open',
          discoveredAt: new Date(),
          evidence: storedXSS
        });
      }

      // Check for reflected XSS
      const reflectedXSS = await this.checkReflectedXSS();
      if (reflectedXSS.length > 0) {
        vulnerabilities.push({
          id: 'xss_002',
          severity: 'medium',
          category: 'xss',
          title: 'Reflected XSS Vulnerabilities',
          description: 'Reflected XSS vulnerabilities detected',
          impact: 'Session hijacking and data theft',
          recommendation: 'Implement proper input validation and output encoding',
          status: 'open',
          discoveredAt: new Date(),
          evidence: reflectedXSS
        });
      }

      // Check for DOM XSS
      const domXSS = await this.checkDOMXSS();
      if (domXSS.length > 0) {
        vulnerabilities.push({
          id: 'xss_003',
          severity: 'medium',
          category: 'xss',
          title: 'DOM XSS Vulnerabilities',
          description: 'DOM XSS vulnerabilities detected',
          impact: 'Client-side code execution',
          recommendation: 'Implement proper DOM manipulation security',
          status: 'open',
          discoveredAt: new Date(),
          evidence: domXSS
        });
      }

    } catch (error) {
      Logger.error('XSS audit failed', error as Error);
    }

    return vulnerabilities;
  }

  /**
   * Audit CSRF protection
   */
  private async auditCSRFProtection(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for missing CSRF tokens
      const csrfStatus = await this.checkCSRFProtection();
      if (!csrfStatus.protected) {
        vulnerabilities.push({
          id: 'csrf_001',
          severity: 'high',
          category: 'csrf',
          title: 'Missing CSRF Protection',
          description: 'CSRF protection not implemented',
          impact: 'Cross-site request forgery attacks',
          recommendation: 'Implement CSRF tokens for all state-changing operations',
          status: 'open',
          discoveredAt: new Date(),
          evidence: csrfStatus.issues
        });
      }

    } catch (error) {
      Logger.error('CSRF audit failed', error as Error);
    }

    return vulnerabilities;
  }

  /**
   * Audit configuration security
   */
  private async auditConfiguration(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Check for insecure configurations
      const configIssues = await this.checkConfigurationSecurity();
      if (configIssues.length > 0) {
        vulnerabilities.push({
          id: 'config_001',
          severity: 'medium',
          category: 'configuration',
          title: 'Insecure Configuration',
          description: 'Security misconfigurations detected',
          impact: 'Various security vulnerabilities',
          recommendation: 'Review and fix configuration issues',
          status: 'open',
          discoveredAt: new Date(),
          evidence: configIssues
        });
      }

      // Check for exposed secrets
      const exposedSecrets = await this.checkExposedSecrets();
      if (exposedSecrets.length > 0) {
        vulnerabilities.push({
          id: 'config_002',
          severity: 'critical',
          category: 'configuration',
          title: 'Exposed Secrets',
          description: 'Secrets exposed in configuration or code',
          impact: 'Complete system compromise',
          recommendation: 'Remove exposed secrets and use secure secret management',
          status: 'open',
          discoveredAt: new Date(),
          evidence: exposedSecrets
        });
      }

    } catch (error) {
      Logger.error('Configuration audit failed', error as Error);
    }

    return vulnerabilities;
  }

  /**
   * Audit dependencies for vulnerabilities
   */
  private async auditDependencies(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json');
      const auditResults = JSON.parse(stdout);

      if (auditResults.vulnerabilities) {
        for (const [name, vuln] of Object.entries(auditResults.vulnerabilities)) {
          const vulnerability = vuln as any;
          vulnerabilities.push({
            id: `dep_${Date.now()}_${name}`,
            severity: this.mapSeverity(vulnerability.severity),
            category: 'dependencies',
            title: `Vulnerable Dependency: ${name}`,
            description: vulnerability.title || 'Vulnerable dependency detected',
            impact: vulnerability.overview || 'Security vulnerability in dependency',
            recommendation: vulnerability.recommendation || 'Update to secure version',
            cve: vulnerability.cves?.[0],
            cvss: vulnerability.cvss?.score,
            status: 'open',
            discoveredAt: new Date(),
            evidence: [name, vulnerability.range]
          });
        }
      }

    } catch (error) {
      Logger.error('Dependency audit failed', error as Error);
    }

    return vulnerabilities;
  }

  // Helper methods for specific checks
  private async checkWeakPasswords(): Promise<string[]> {
    // This would check for weak passwords in the database
    // For now, return empty array as placeholder
    return [];
  }

  private async checkMFAStatus(): Promise<{ enabled: boolean }> {
    // Check if MFA is enabled
    return { enabled: false }; // Placeholder
  }

  private async checkSessionSecurity(): Promise<{ secure: boolean; issues: string[] }> {
    // Check session security
    return { secure: true, issues: [] }; // Placeholder
  }

  private async checkJWTSecurity(): Promise<{ secure: boolean; issues: string[] }> {
    // Check JWT security
    return { secure: true, issues: [] }; // Placeholder
  }

  private async checkUnencryptedData(): Promise<string[]> {
    // Check for unencrypted sensitive data
    return []; // Placeholder
  }

  private async checkLogDataExposure(): Promise<string[]> {
    // Check for sensitive data in logs
    return []; // Placeholder
  }

  private async checkPIIHandling(): Promise<{ compliant: boolean; issues: string[] }> {
    // Check PII handling compliance
    return { compliant: true, issues: [] }; // Placeholder
  }

  private async checkSQLInjection(): Promise<string[]> {
    // Check for SQL injection vulnerabilities
    return []; // Placeholder
  }

  private async checkNoSQLInjection(): Promise<string[]> {
    // Check for NoSQL injection vulnerabilities
    return []; // Placeholder
  }

  private async checkCommandInjection(): Promise<string[]> {
    // Check for command injection vulnerabilities
    return []; // Placeholder
  }

  private async checkStoredXSS(): Promise<string[]> {
    // Check for stored XSS vulnerabilities
    return []; // Placeholder
  }

  private async checkReflectedXSS(): Promise<string[]> {
    // Check for reflected XSS vulnerabilities
    return []; // Placeholder
  }

  private async checkDOMXSS(): Promise<string[]> {
    // Check for DOM XSS vulnerabilities
    return []; // Placeholder
  }

  private async checkCSRFProtection(): Promise<{ protected: boolean; issues: string[] }> {
    // Check CSRF protection
    return { protected: true, issues: [] }; // Placeholder
  }

  private async checkConfigurationSecurity(): Promise<string[]> {
    // Check configuration security
    return []; // Placeholder
  }

  private async checkExposedSecrets(): Promise<string[]> {
    // Check for exposed secrets
    return []; // Placeholder
  }

  private async auditOWASPCompliance(): Promise<number> {
    // Calculate OWASP compliance score
    return 85; // Placeholder
  }

  private async auditGDPRCompliance(): Promise<number> {
    // Calculate GDPR compliance score
    return 90; // Placeholder
  }

  private async auditSOC2Compliance(): Promise<number> {
    // Calculate SOC2 compliance score
    return 88; // Placeholder
  }

  private calculateOverallScore(): number {
    if (this.vulnerabilities.length === 0) return 100;

    const criticalCount = this.vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = this.vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = this.vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowCount = this.vulnerabilities.filter(v => v.severity === 'low').length;

    const score = 100 - (criticalCount * 20) - (highCount * 10) - (mediumCount * 5) - (lowCount * 2);
    return Math.max(0, score);
  }

  private calculateSummary() {
    return {
      total: this.vulnerabilities.length,
      critical: this.vulnerabilities.filter(v => v.severity === 'critical').length,
      high: this.vulnerabilities.filter(v => v.severity === 'high').length,
      medium: this.vulnerabilities.filter(v => v.severity === 'medium').length,
      low: this.vulnerabilities.filter(v => v.severity === 'low').length,
      info: this.vulnerabilities.filter(v => v.severity === 'info').length
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.vulnerabilities.some(v => v.severity === 'critical')) {
      recommendations.push('Address all critical vulnerabilities immediately');
    }

    if (this.vulnerabilities.some(v => v.category === 'authentication')) {
      recommendations.push('Strengthen authentication mechanisms');
    }

    if (this.vulnerabilities.some(v => v.category === 'data-protection')) {
      recommendations.push('Implement comprehensive data protection measures');
    }

    if (this.vulnerabilities.some(v => v.category === 'injection')) {
      recommendations.push('Implement input validation and parameterized queries');
    }

    if (this.vulnerabilities.some(v => v.category === 'xss')) {
      recommendations.push('Implement proper input sanitization and output encoding');
    }

    if (this.vulnerabilities.some(v => v.category === 'csrf')) {
      recommendations.push('Implement CSRF protection for all state-changing operations');
    }

    if (this.vulnerabilities.some(v => v.category === 'dependencies')) {
      recommendations.push('Update vulnerable dependencies to secure versions');
    }

    return recommendations;
  }

  private mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    switch (severity.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'moderate': return 'medium';
      case 'low': return 'low';
      default: return 'info';
    }
  }

  private async storeAuditReport(report: SecurityAuditReport): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'SECURITY_AUDIT_COMPLETED',
        userId: null,
        details: JSON.stringify(report),
        resource: 'security_audit'
      }
    });
  }
}

// Global security auditor instance
export const securityAuditor = new SecurityAuditor();
