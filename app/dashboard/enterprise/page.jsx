'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Database, Zap, BarChart3, AlertTriangle, CheckCircle, Download, Upload, Settings, Eye } from 'lucide-react';
export default function EnterpriseDashboard() {
    const [complianceStatus, setComplianceStatus] = useState(null);
    const [performanceStats, setPerformanceStats] = useState(null);
    const [healthStatus, setHealthStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadDashboardData();
    }, []);
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [complianceRes, performanceRes, healthRes] = await Promise.all([
                fetch('/api/enterprise/features?feature=compliance'),
                fetch('/api/enterprise/features?feature=performance'),
                fetch('/api/enterprise/features?feature=health&action=all')
            ]);
            if (!complianceRes.ok || !performanceRes.ok || !healthRes.ok) {
                throw new Error('Failed to load dashboard data');
            }
            const [compliance, performance, health] = await Promise.all([
                complianceRes.json(),
                performanceRes.json(),
                healthRes.json()
            ]);
            setComplianceStatus(compliance);
            setPerformanceStats(performance);
            setHealthStatus(health.health);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const handleGDPRAction = async (action, data) => {
        try {
            const response = await fetch(`/api/enterprise/features?feature=gdpr&action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`GDPR ${action} failed`);
            }
            // Reload dashboard data
            await loadDashboardData();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };
    const handlePerformanceAction = async (action, data) => {
        try {
            const response = await fetch(`/api/enterprise/features?feature=performance&action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`Performance ${action} failed`);
            }
            // Reload dashboard data
            await loadDashboardData();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };
    if (loading) {
        return (<div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>);
    }
    if (error) {
        return (<Alert variant="destructive">
        <AlertTriangle className="h-4 w-4"/>
        <AlertDescription>{error}</AlertDescription>
      </Alert>);
    }
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enterprise Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor compliance, performance, and system health
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <Settings className="h-4 w-4 mr-2"/>
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="compliance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GDPR Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2"/>
                  GDPR Compliance
                </CardTitle>
                <CardDescription>
                  Data protection and privacy compliance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge variant={complianceStatus?.gdpr.status === 'compliant' ? 'default' : 'destructive'}>
                    {complianceStatus?.gdpr.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Issues</span>
                  <span className="text-sm text-muted-foreground">
                    {complianceStatus?.gdpr.issues || 0}
                  </span>
                </div>
                <div className="space-y-2">
                  <Button size="sm" variant="outline" onClick={() => handleGDPRAction('access')}>
                    <Eye className="h-4 w-4 mr-2"/>
                    Request Data Access
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleGDPRAction('portability')}>
                    <Download className="h-4 w-4 mr-2"/>
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SOC2 Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2"/>
                  SOC2 Compliance
                </CardTitle>
                <CardDescription>
                  Security and availability controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Overall Compliance</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={complianceStatus?.soc2.overallCompliance || 0} className="w-20"/>
                    <span className="text-sm">
                      {Math.round(complianceStatus?.soc2.overallCompliance || 0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Critical Issues</span>
                  <Badge variant={complianceStatus?.soc2.criticalIssues === 0 ? 'default' : 'destructive'}>
                    {complianceStatus?.soc2.criticalIssues || 0}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleGDPRAction('assessment')}>
                  <BarChart3 className="h-4 w-4 mr-2"/>
                  Run Assessment
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cache Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2"/>
                  Cache Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Hit Rate</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={(performanceStats?.cache?.hitRate || 0) * 100} className="w-20"/>
                    <span className="text-sm">
                      {Math.round((performanceStats?.cache.hitRate || 0) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hits</span>
                  <span className="text-sm text-muted-foreground">
                    {performanceStats?.cache.hits || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Misses</span>
                  <span className="text-sm text-muted-foreground">
                    {performanceStats?.cache.misses || 0}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => handlePerformanceAction('optimize')}>
                  <Settings className="h-4 w-4 mr-2"/>
                  Optimize
                </Button>
              </CardContent>
            </Card>

            {/* CDN Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2"/>
                  CDN Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Total Requests</span>
                  <span className="text-sm text-muted-foreground">
                    {performanceStats?.cdn.totalRequests || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cache Hits</span>
                  <span className="text-sm text-muted-foreground">
                    {performanceStats?.cdn.cacheHits || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Avg Response Time</span>
                  <span className="text-sm text-muted-foreground">
                    {performanceStats?.cdn.averageResponseTime || 0}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bandwidth Saved</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((performanceStats?.cdn.bandwidthSaved || 0) / 1024 / 1024)}MB
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Database Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2"/>
                  Database Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Total Queries</span>
                  <span className="text-sm text-muted-foreground">
                    {performanceStats?.database.totalQueries || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Avg Query Time</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(performanceStats?.database.averageQueryTime || 0)}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Slow Queries</span>
                  <Badge variant={performanceStats?.database.slowQueries === 0 ? 'default' : 'destructive'}>
                    {performanceStats?.database.slowQueries || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Connections</span>
                  <span className="text-sm text-muted-foreground">
                    {performanceStats?.database.activeConnections || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cache Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2"/>
                  Cache Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge variant={healthStatus?.services.cache.status === 'healthy' ? 'default' : 'destructive'}>
                    {healthStatus?.services.cache.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Latency</span>
                  <span className="text-sm text-muted-foreground">
                    {healthStatus?.services.cache.latency || 0}ms
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* CDN Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2"/>
                  CDN Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge variant={healthStatus?.services.cdn.status === 'healthy' ? 'default' : 'destructive'}>
                    {healthStatus?.services.cdn.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Latency</span>
                  <span className="text-sm text-muted-foreground">
                    {healthStatus?.services.cdn.latency || 0}ms
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Database Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2"/>
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge variant={healthStatus?.services.database.status === 'healthy' ? 'default' : 'destructive'}>
                    {healthStatus?.services.database.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Latency</span>
                  <span className="text-sm text-muted-foreground">
                    {healthStatus?.services.database.latency || 0}ms
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overall Health Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {healthStatus?.status === 'healthy' ? (<CheckCircle className="h-5 w-5 mr-2 text-green-500"/>) : (<AlertTriangle className="h-5 w-5 mr-2 text-red-500"/>)}
                Overall System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge variant={healthStatus?.status === 'healthy' ? 'default' : 'destructive'}>
                  {healthStatus?.status || 'Unknown'}
                </Badge>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Last checked: {healthStatus?.timestamp ? new Date(healthStatus.timestamp).toLocaleString() : 'Never'}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);
}
