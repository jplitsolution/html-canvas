import { redisService } from '../../common/services/redis.service.js';

export const createAdminService = () => {
  const getCacheStats = async () => {
    return redisService.getStats();
  };

  const clearCache = async ({ scope = 'all', pattern = '' } = {}) => {
    if (!redisService.isConnected()) {
      const err = new Error('Redis is not connected or cache is disabled');
      err.statusCode = 503;
      throw err;
    }

    let deletedCount = 0;
    const sanitizedScope = String(scope || 'all').toLowerCase();

    switch (sanitizedScope) {
      case 'all': {
        await redisService.flushDb();
        return {
          scope: 'all',
          message: 'All Redis cache flushed successfully',
          deletedCount: -1,
          timestamp: new Date().toISOString(),
        };
      }

      case 'flow': {
        const res = await redisService.deletePattern('flow:*');
        deletedCount = res.deletedCount;
        break;
      }

      case 'campaign': {
        const [r1, r2] = await Promise.all([
          redisService.deletePattern('flow:campaign:*'),
          redisService.deletePattern('campaign:*'),
        ]);
        deletedCount = (r1.deletedCount || 0) + (r2.deletedCount || 0);
        break;
      }

      case 'detection': {
        const [r1, r2, r3, r4] = await Promise.all([
          redisService.deletePattern('orange_bf:*'),
          redisService.deletePattern('universe_dcb:*'),
          redisService.deletePattern('flow:detect:*'),
          redisService.deletePattern('flow:early:*'),
        ]);
        deletedCount =
          (r1.deletedCount || 0) +
          (r2.deletedCount || 0) +
          (r3.deletedCount || 0) +
          (r4.deletedCount || 0);
        break;
      }

      case 'otp': {
        const res = await redisService.deletePattern('otp:*');
        deletedCount = res.deletedCount;
        break;
      }

      case 'custom': {
        const cleanPattern = String(pattern || '').trim();
        if (!cleanPattern || cleanPattern === '*' || cleanPattern === '') {
          // If wildcard all, route to flushDb
          await redisService.flushDb();
          return {
            scope: 'custom',
            pattern: '*',
            message: 'All Redis cache flushed successfully',
            deletedCount: -1,
            timestamp: new Date().toISOString(),
          };
        }
        const res = await redisService.deletePattern(cleanPattern);
        deletedCount = res.deletedCount;
        return {
          scope: 'custom',
          pattern: cleanPattern,
          message: `Cleared ${deletedCount} keys matching '${cleanPattern}'`,
          deletedCount,
          timestamp: new Date().toISOString(),
        };
      }

      default: {
        const err = new Error(`Unsupported cache scope: ${scope}`);
        err.statusCode = 400;
        throw err;
      }
    }

    return {
      scope: sanitizedScope,
      message: `Successfully cleared ${deletedCount} cache keys for scope '${sanitizedScope}'`,
      deletedCount,
      timestamp: new Date().toISOString(),
    };
  };

  const listKeys = async ({ pattern = '*', limit = 50 } = {}) => {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const pat = String(pattern || '*').trim() || '*';
    return redisService.scanKeys({ pattern: pat, limit: lim });
  };

  const deleteSingleKey = async (key) => {
    const cleanKey = String(key || '').trim();
    if (!cleanKey) {
      const err = new Error('Key is required');
      err.statusCode = 400;
      throw err;
    }
    return redisService.deleteKey(cleanKey);
  };

  return {
    getCacheStats,
    clearCache,
    listKeys,
    deleteSingleKey,
  };
};

export const adminService = createAdminService();
