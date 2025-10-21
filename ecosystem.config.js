module.exports = {
  apps: [
    {
      name: 'forgevid',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Advanced features
      kill_timeout: 5000,
      listen_timeout: 3000,
      wait_ready: true,
      
      // Cluster mode
      instance_var: 'INSTANCE_ID',
      
      // Monitoring
      pmx: true,
      
      // Environment specific
      env_file: '.env.local',
      
      // Process management
      merge_logs: true,
      time: true,
    },
    {
      name: 'forgevid-collaboration',
      script: 'server/collaboration-server.js',
      cwd: './',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      
      // Logging
      log_file: './logs/collaboration-combined.log',
      out_file: './logs/collaboration-out.log',
      error_file: './logs/collaboration-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Advanced features
      kill_timeout: 5000,
      listen_timeout: 3000,
      wait_ready: true,
      
      // Environment specific
      env_file: '.env.local',
      
      // Process management
      merge_logs: true,
      time: true,
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/krystinvestments/forgevid.git',
      path: '/var/www/forgevid',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run db:generate && npm run db:deploy && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: 'StrictHostKeyChecking=no'
    },
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/krystinvestments/forgevid.git',
      path: '/var/www/forgevid-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run db:generate && npm run db:deploy && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': '',
      ssh_options: 'StrictHostKeyChecking=no'
    }
  }
};




