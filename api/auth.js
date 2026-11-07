import { appPromise } from '../server/index.js';

export default async function handler(req, res) {
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('Authentication API initialization failed:', error);

    return res.status(500).json({
      ok: false,
      message: 'Authentication service unavailable.',
    });
  }
}