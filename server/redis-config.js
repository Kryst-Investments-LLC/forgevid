const Redis = require('ioredis');

// Production Redis configuration
const createRedisClient = (options = {}) => {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
    // Production optimizations
    maxmemory: process.env.REDIS_MAX_MEMORY || '256mb',
    maxmemoryPolicy: 'allkeys-lru',
    ...options
  };

  const redis = new Redis(config);

  // Connection event handlers
  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready for operations');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
  });

  redis.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  return redis;
};

// Redis cluster configuration for high availability
const createRedisCluster = () => {
  const cluster = new Redis.Cluster([
    {
      host: process.env.REDIS_CLUSTER_HOST_1 || 'localhost',
      port: parseInt(process.env.REDIS_CLUSTER_PORT_1 || '7000'),
    },
    {
      host: process.env.REDIS_CLUSTER_HOST_2 || 'localhost',
      port: parseInt(process.env.REDIS_CLUSTER_PORT_2 || '7001'),
    },
    {
      host: process.env.REDIS_CLUSTER_HOST_3 || 'localhost',
      port: parseInt(process.env.REDIS_CLUSTER_PORT_3 || '7002'),
    }
  ], {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
    },
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
  });

  return cluster;
};

// Redis connection pool for better performance
const createRedisPool = (size = 10) => {
  const pool = [];
  for (let i = 0; i < size; i++) {
    pool.push(createRedisClient({ db: i % 16 })); // Distribute across 16 databases
  }
  return pool;
};

module.exports = {
  createRedisClient,
  createRedisCluster,
  createRedisPool
};
