import { Router, Request, Response } from 'express';

export const healthRoutes = Router();

// Quick health check (no DB) - for keep-alive pings
healthRoutes.get('/quick', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Full health check (with DB)
healthRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { getPool } = await import('../db.js');
    const pool = getPool();
    
    // Test database connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
