import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // 1. Get the password and user IP
  const { password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // 2. Load secrets
  const adminPass = process.env.ADMIN_PASS;
  const guestPass = process.env.GUEST_PASS;
  
  // CONFIG: Limit guest access to 10 requests per IP per day
  const DAILY_LIMIT = 10;

  try {
    // --- CHECK 1: ADMIN (Unlimited) ---
    if (password === adminPass) {
      return res.status(200).json({ success: true, type: 'admin' });
    }

    // --- CHECK 2: GUEST (Limited) ---
    if (password === guestPass) {
      // Create a unique key for this user for today: e.g., "guest_usage:2026-01-07:192.168.1.1"
      const today = new Date().toISOString().slice(0, 10);
      const key = `guest_usage:${today}:${ip}`;

      // Increment the counter for this IP (returns the new value)
      const currentUsage = await kv.incr(key);

      // (Optional) Set data to expire after 24 hours to save space
      if (currentUsage === 1) {
        await kv.expire(key, 86400); 
      }

      if (currentUsage <= DAILY_LIMIT) {
        return res.status(200).json({ 
          success: true, 
          type: 'guest',
          remaining: DAILY_LIMIT - currentUsage 
        });
      } else {
        return res.status(429).json({ 
          success: false, 
          message: `Daily limit exceeded (${DAILY_LIMIT}/${DAILY_LIMIT}). Try again tomorrow.` 
        });
      }
    }

    // --- CHECK 3: INVALID ---
    return res.status(401).json({ success: false, message: 'Invalid Credentials' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}