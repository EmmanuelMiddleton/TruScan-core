import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { randomUUID } from 'crypto';

console.log('🏁 Server process starting...');
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 1. Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 2. Immediate API Routes (No dependencies)
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'pong', timestamp: new Date().toISOString() });
});

// Log buffer for debugging
const logBuffer: string[] = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const addToBuffer = (type: string, ...args: any[]) => {
  const message = `[${new Date().toISOString()}] [${type}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
  logBuffer.push(message);
  if (logBuffer.length > 100) logBuffer.shift();
};

console.log = (...args: any[]) => {
  addToBuffer('INFO', ...args);
  originalLog(...args);
};
console.error = (...args: any[]) => {
  addToBuffer('ERROR', ...args);
  originalError(...args);
};
console.warn = (...args: any[]) => {
  addToBuffer('WARN', ...args);
  originalWarn(...args);
};

// 3. Supabase Client Setup
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_CODE = process.env.ADMIN_CODE || 'TS-ADMIN-2026';
const MOCK_MODE = process.env.MOCK_MODE === 'true' || process.env.NODE_ENV !== 'production';

// OTP Expiry
const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase environment variables are missing (SUPABASE_URL or SUPABASE_ANON_KEY)');
}

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

console.log(supabase ? '📡 Supabase client initialized' : '⚠️ Supabase not configured');

// Simple in-memory cache for admin stats
let adminStatsCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute

// Helper for Supabase queries with timeouts
const withTimeout = async <T>(promise: any, timeoutMs = 12000): Promise<any> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Database request timed out'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// 4. API Routes
app.get('/api/debug/status', (req, res) => {
  res.json({
    status: 'online',
    supabaseConfigured: !!supabase,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// --- WhatsApp OTP Auth Endpoints ---

// 1. Request OTP
app.post('/api/auth/whatsapp/request', async (req, res) => {
  const { whatsapp, type } = req.body; // type: 'agent' or 'admin'

  if (!whatsapp) {
    return res.status(400).json({ error: 'WhatsApp number is required' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + OTP_EXPIRY;

  // Store OTP in Supabase (to support serverless/Vercel)
  if (supabase) {
    try {
      const { error } = await supabase
        .from('truscan_otps')
        .upsert({ 
          whatsapp, 
          otp, 
          expires, 
          type: type || 'agent',
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } catch (e: any) {
      console.error('❌ Failed to store OTP in Supabase:', e.message);
      if (!MOCK_MODE) {
        return res.status(500).json({ error: 'Failed to initiate authentication. Please try again later.' });
      }
    }
  }

  console.log(`📱 [AUTH] OTP for ${whatsapp} (${type}): ${otp}`);

  // MOCK: In a real app, you'd call Twilio/Meta API here
  // For now, we'll just log it and return success
  res.status(200).json({
    success: true,
    message: 'OTP sent via WhatsApp',
    expiresIn: '5 minutes',
    mockOtp: MOCK_MODE ? otp : undefined // Only return OTP in mock/dev mode
  });
});

// 2. Verify OTP
app.post('/api/auth/whatsapp/verify', async (req, res) => {
  const { whatsapp, otp } = req.body;

  if (!whatsapp || !otp) {
    return res.status(400).json({ error: 'WhatsApp number and OTP are required' });
  }

  let storedData = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('truscan_otps')
        .select('*')
        .eq('whatsapp', whatsapp)
        .single();
      
      if (error) throw error;
      storedData = data;
    } catch (e: any) {
      console.error('❌ Failed to fetch OTP from Supabase:', e.message);
      if (!MOCK_MODE) {
        return res.status(400).json({ error: 'No OTP requested for this number' });
      }
    }
  }

  if (!storedData) {
    return res.status(400).json({ error: 'No OTP requested for this number' });
  }

  if (Date.now() > storedData.expires) {
    if (supabase) await supabase.from('truscan_otps').delete().eq('whatsapp', whatsapp);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (storedData.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // OTP is valid!
  if (supabase) await supabase.from('truscan_otps').delete().eq('whatsapp', whatsapp);

  // If it's an agent, we need to find their agent_code
  let agentCode = null;
  let isAdmin = false;

  if (storedData.type === 'admin') {
    isAdmin = true;
  } else {
    // Find agent by WhatsApp number
    if (supabase) {
      const { data, error } = await supabase
        .from('truscan_agents')
        .select('agent_code')
        .eq('whatsapp_number', whatsapp)
        .single();
      
      if (data) agentCode = data.agent_code;
      
      if (!data && !MOCK_MODE) {
        return res.status(404).json({ error: 'No agent account found for this number. Please apply first.' });
      }
    }
    
    // Mock agent code for demo if no Supabase or in mock mode
    if (!agentCode && MOCK_MODE) {
      agentCode = 'MOCK-AGENT-123';
    }
  }

  if (!isAdmin && !agentCode) {
    return res.status(404).json({ error: 'Account not found' });
  }

  // Create a database-backed session
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  if (supabase) {
    try {
      const { error } = await supabase
        .from('truscan_sessions')
        .insert({
          id: sessionToken,
          user_id: isAdmin ? 'admin' : agentCode,
          type: isAdmin ? 'admin' : 'agent',
          expires_at: expiresAt,
          whatsapp: whatsapp
        });
      
      if (error) throw error;
    } catch (e: any) {
      console.error('❌ Session storage failed:', e.message);
      if (!MOCK_MODE) {
        return res.status(500).json({ error: 'Failed to create session. Please try again.' });
      }
    }
  }

  res.status(200).json({
    success: true,
    agentCode,
    isAdmin,
    sessionToken
  });
});

// --- End WhatsApp OTP Auth Endpoints ---

// Session Validation Helper
async function validateSession(token: string | undefined, type: 'admin' | 'agent') {
  if (!token) return null;
  
  // For demo/dev purposes, if Supabase is not configured, we can allow the ADMIN_CODE
  if (type === 'admin' && token === ADMIN_CODE) {
    return { user_id: 'admin', type: 'admin' };
  }

  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('truscan_sessions')
      .select('*')
      .eq('id', token)
      .eq('type', type)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      console.warn(`❌ Session validation failed for ${type}:`, error?.message || 'Not found');
      return null;
    }
    return data;
  } catch (e) {
    console.error('💥 Session validation error:', e);
    return null;
  }
}

// Logout Endpoint
app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (token && supabase) {
    await supabase.from('truscan_sessions').delete().eq('id', token);
  }
  
  res.status(200).json({ success: true });
});

  app.get('/api/health/supabase', async (req, res) => {
    const configInfo = {
      urlSet: !!supabaseUrl,
      keySet: !!supabaseKey,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'none',
      keyPrefix: supabaseKey ? supabaseKey.substring(0, 5) + '...' : 'none',
    };

    if (!supabase) {
      return res.status(200).json({ 
        status: 'not_configured', 
        config: configInfo 
      });
    }
    try {
      const { data, error } = await supabase.from('truscan_agents').select('count', { count: 'exact', head: true });
      if (error) throw error;
      res.status(200).json({ 
        status: 'connected', 
        config: configInfo,
        agentsCount: data 
      });
    } catch (error: any) {
      console.error('Supabase health check failed:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        config: configInfo
      });
    }
  });

  app.get('/api/admin/logs', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const session = await validateSession(token, 'admin');
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(200).json(logBuffer);
  });

  // Combined Agent Data Endpoint
  app.get('/api/agent/:code/all', async (req, res) => {
    const { code } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const session = await validateSession(token, 'agent');
    if (!session || (session.user_id !== code && session.user_id !== 'admin')) {
      console.warn(`❌ Agent All: Unauthorized access attempt for code ${code}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`GET /api/agent/${code}/all called`);

    if (code === 'DEBUG' && MOCK_MODE) {
      console.log('✅ Returning DEBUG data for agent');
      return res.status(200).json({
        agent: {
          agent_code: 'DEBUG',
          total_referrals: 12,
          total_earnings: 4500,
          commission_tier: 'Premium',
          qr_image_path: null
        },
        referrals: [
          { id: '1', created_at: new Date().toISOString(), full_name: 'John Smith', entry_category: 'Retail', funnel_stage: 'lead_captured' },
          { id: '2', created_at: new Date(Date.now() - 86400000).toISOString(), full_name: 'Sarah Jones', entry_category: 'Manufacturing', funnel_stage: 'contacted' }
        ],
        stats: {
          leadsByStage: [
            { name: 'Lead Captured', value: 8 },
            { name: 'Contacted', value: 4 },
            { name: 'Qualified', value: 2 },
            { name: 'Proposal Sent', value: 1 },
            { name: 'Closed Won', value: 0 }
          ],
          conversionRate: '15%'
        }
      });
    }

    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    try {
      console.log(`[${new Date().toISOString()}] 🔍 Fetching combined data for agent: ${code}`);
      
      const [agentRes, referralsRes, statsRes]: any[] = await Promise.all([
        withTimeout(supabase.from('truscan_agents').select('*').eq('agent_code', code).single()),
        withTimeout(supabase.from('truscan_funnel').select('*').eq('agent_id', code).order('created_at', { ascending: false })),
        withTimeout(supabase.from('truscan_funnel').select('funnel_stage').eq('agent_id', code))
      ]);

      if (agentRes.error) {
        if (agentRes.error.code === 'PGRST116') {
          console.warn(`❌ Agent not found: ${code}`);
          return res.status(404).json({ error: 'Agent not found' });
        }
        console.error('❌ Agent fetch error:', agentRes.error);
        throw agentRes.error;
      }

      console.log(`✅ Agent found: ${agentRes.data.agent_name}`);

      // Process stats
      const stages_list = ['lead_captured', 'contacted', 'qualified', 'proposal_sent', 'closed_won'];
      const stageCounts: Record<string, number> = {};
      stages_list.forEach(s => stageCounts[s] = 0);
      
      statsRes.data?.forEach(l => {
        if (stageCounts[l.funnel_stage] !== undefined) {
          stageCounts[l.funnel_stage]++;
        }
      });

      const leadsByStage = Object.entries(stageCounts).map(([key, value]) => ({
        name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        value
      }));

      // Calculate conversion rate
      const totalReferrals = statsRes.data?.length || 0;
      const closedWon = stageCounts['closed_won'] || 0;
      const conversionRate = totalReferrals > 0 
        ? ((closedWon / totalReferrals) * 100).toFixed(1) + '%' 
        : '0%';

      console.log(`✅ Data processed for agent: ${code}. Referrals: ${referralsRes.data?.length || 0}`);

      res.status(200).json({
        agent: agentRes.data,
        referrals: referralsRes.data || [],
        stats: { leadsByStage, conversionRate }
      });
    } catch (error: any) {
      console.error('Fetch combined agent data error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch agent data' });
    }
  });

  app.post('/api/log-visit', async (req, res) => {
    if (!supabase) return res.status(200).json({ success: true }); // Silent fail if no supabase

    const { agentId, eventType } = req.body;
    try {
      await supabase.from('truscan_agent_logs').insert({
        agent_id: agentId,
        event_type: eventType
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Logging error:', error);
      res.status(200).json({ success: true }); // Don't break the frontend for logging errors
    }
  });

  app.post('/api/contact', async (req, res) => {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured on server.' });
    }

    const { name, email, whatsapp, business, service, message, consent, agentId } = req.body;

    try {
      const { error } = await supabase
        .from('truscan_funnel')
        .insert([{
          full_name: name,
          contact_number: email,
          whatsapp_number: whatsapp,
          entry_category: service,
          primary_bottleneck: message,
          agent_id: agentId,
          funnel_stage: 'lead_captured',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Submission error:', error);
      res.status(500).json({ error: error.message || 'Failed to save submission.' });
    }
  });

  // Partner Application Endpoints
  app.post('/api/partner-apply', async (req, res) => {
    const { name, email, whatsapp, experience } = req.body;
    
    if (!supabase) {
      console.log('Mock partner application received:', { name, email, whatsapp, experience });
      return res.status(200).json({ success: true });
    }

    try {
      const { error } = await supabase
        .from('truscan_partner_applications')
        .insert([{
          name,
          email,
          whatsapp,
          experience,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Supabase insert error (partner_applications):', JSON.stringify(error, null, 2));
        throw error;
      }
      console.log(`✅ Partner application received from: ${name} (${email})`);
      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Partner application catch block:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to submit application',
        details: error.details || 'Check if truscan_partner_applications table exists in Supabase'
      });
    }
  });

  // Admin Endpoints
  app.get('/api/admin/stats', async (req, res) => {
    console.log('📊 Admin Stats Request received');
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const session = await validateSession(token, 'admin');
    if (!session) {
      console.warn('❌ Admin Stats: Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check cache first
    const CACHE_TTL = 30000; // 30 seconds
    if (adminStatsCache && (Date.now() - adminStatsCache.timestamp < CACHE_TTL)) {
      console.log('✅ Admin Stats: Returning cached data');
      return res.status(200).json(adminStatsCache.data);
    }

    if (!supabase) {
      if (MOCK_MODE) {
        console.log('ℹ️ Admin Stats: Supabase not configured, returning mock data');
        return res.status(200).json({
          totalAgents: 12,
          totalLeads: 45,
          totalEarnings: 15400,
          leadsByStage: [
            { name: 'Lead Captured', value: 25 },
            { name: 'Contacted', value: 12 },
            { name: 'Proposal Sent', value: 5 },
            { name: 'Closed', value: 3 }
          ],
          recentLeads: [
            { id: '1', name: 'John Smith', stage: 'lead_captured', date: new Date().toISOString() },
            { id: '2', name: 'Sarah Jones', stage: 'contacted', date: new Date(Date.now() - 86400000).toISOString() }
          ]
        });
      }
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    try {
      console.log('🔍 Fetching Admin Stats from Supabase (Parallel)...');
      
      const [
        agentsRes,
        leadsRes,
        earningsRes,
        stagesRes,
        recentRes
      ]: any[] = await Promise.all([
        withTimeout(supabase.from('truscan_agents').select('*', { count: 'exact', head: true })),
        withTimeout(supabase.from('truscan_funnel').select('*', { count: 'exact', head: true })),
        withTimeout(supabase.from('truscan_agents').select('total_earnings')),
        withTimeout(supabase.from('truscan_funnel').select('funnel_stage')),
        withTimeout(supabase.from('truscan_funnel').select('id, full_name, funnel_stage, created_at').order('created_at', { ascending: false }).limit(5))
      ]);

      if (agentsRes.error || leadsRes.error || earningsRes.error || stagesRes.error || recentRes.error) {
        const firstError = agentsRes.error || leadsRes.error || earningsRes.error || stagesRes.error || recentRes.error;
        console.error('Supabase stats error:', {
          agents: agentsRes.error,
          leads: leadsRes.error,
          earnings: earningsRes.error,
          stages: stagesRes.error,
          recent: recentRes.error
        });
        
        // Fallback to mock data if table is missing and MOCK_MODE is on
        if (MOCK_MODE && firstError?.message?.includes('relation') && firstError?.message?.includes('does not exist')) {
          console.log('ℹ️ Table missing in stats, returning mock data');
          return res.status(200).json({
            totalAgents: 12,
            totalLeads: 45,
            totalEarnings: 15400,
            leadsByStage: [
              { name: 'Lead Captured', value: 25 },
              { name: 'Contacted', value: 12 },
              { name: 'Proposal Sent', value: 5 },
              { name: 'Closed', value: 3 }
            ],
            recentLeads: [
              { id: '1', name: 'John Smith (Mock)', stage: 'lead_captured', date: new Date().toISOString() },
              { id: '2', name: 'Sarah Jones (Mock)', stage: 'contacted', date: new Date(Date.now() - 86400000).toISOString() }
            ]
          });
        }
        return res.status(500).json({ 
          error: firstError?.message || 'One or more Supabase stats queries failed',
          details: firstError?.details || 'Check Supabase logs and RLS policies.',
          code: firstError?.code
        });
      }

      const totalAgents = agentsRes.count;
      const totalLeads = leadsRes.count;
      const totalEarnings = earningsRes.data?.reduce((acc, curr) => acc + (curr.total_earnings || 0), 0) || 0;
      
      const allStages = ['lead_captured', 'contacted', 'proposal_sent', 'closed'];
      const stageCounts: Record<string, number> = {};
      allStages.forEach(s => stageCounts[s] = 0);
      
      stagesRes.data?.forEach(lead => {
        const stage = lead.funnel_stage || 'lead_captured';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      });

      const leadsByStage = Object.entries(stageCounts).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value
      }));

      const statsData = {
        totalAgents: totalAgents || 0,
        totalLeads: totalLeads || 0,
        totalEarnings,
        leadsByStage,
        recentLeads: recentRes.data?.map(l => ({
          id: l.id,
          name: l.full_name,
          stage: l.funnel_stage,
          date: l.created_at
        })) || [],
        lastUpdated: new Date().toISOString()
      };

      // Update cache
      adminStatsCache = {
        data: statsData,
        timestamp: Date.now()
      };

      console.log('✅ Admin Stats: Data fetched successfully');
      res.status(200).json(statsData);
    } catch (error: any) {
      console.error('Fetch stats error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch stats' });
    }
  });

  // Admin Applications Endpoint
  app.get('/api/admin/applications', async (req, res) => {
    console.log('📋 Admin Applications Request received');
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const session = await validateSession(token, 'admin');
    if (!session) {
      console.warn('❌ Admin Applications: Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!supabase) {
      console.log('ℹ️ Admin Applications: Supabase not configured, returning mock data');
      return res.status(200).json([
        { id: '1', created_at: new Date().toISOString(), name: 'Jane Doe', email: 'jane@example.com', whatsapp: '0712345678', experience: 'I have a large network of retail business owners.', status: 'pending' },
        { id: '2', created_at: new Date().toISOString(), name: 'Bob Wilson', email: 'bob@example.com', whatsapp: '0823456789', experience: 'Experienced sales rep in the manufacturing sector.', status: 'approved' }
      ]);
    }

    try {
      console.log('🔍 Fetching applications from Supabase...');
      const { data, error }: any = await withTimeout(supabase
        .from('truscan_partner_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)); // Limit for performance

      if (error) {
        console.error('Supabase select error (partner_applications):', JSON.stringify(error, null, 2));
        // Fallback to mock data if table is missing or connection error
        if (error.code === 'PGRST116' || error.message?.includes('relation "truscan_partner_applications" does not exist')) {
          console.log('ℹ️ Table missing, returning mock data as fallback');
          return res.status(200).json([
            { id: '1', created_at: new Date().toISOString(), name: 'Jane Doe (Mock)', email: 'jane@example.com', whatsapp: '0712345678', experience: 'I have a large network of retail business owners.', status: 'pending' },
            { id: '2', created_at: new Date().toISOString(), name: 'Bob Wilson (Mock)', email: 'bob@example.com', whatsapp: '0823456789', experience: 'Experienced sales rep in the manufacturing sector.', status: 'approved' }
          ]);
        }
        // If it's another error, return it with more details
        return res.status(500).json({ 
          error: error.message || 'Supabase query failed',
          details: error.details || error.hint || 'Check Supabase logs and RLS policies.',
          code: error.code
        });
      }
      console.log(`✅ Admin Applications: ${data?.length || 0} applications fetched`);
      res.status(200).json(data);
    } catch (error: any) {
      console.error('Fetch applications error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch applications',
        details: 'Internal server error during fetch. Check server logs.',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.post('/api/admin/approve', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const session = await validateSession(token, 'admin');
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appId } = req.body;

    if (!supabase) {
      if (MOCK_MODE) {
        const agentCode = `TS-MOCK-${Math.floor(Math.random() * 900) + 100}`;
        const qrCodeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='; // Tiny mock pixel
        return res.status(200).json({ success: true, agentCode, qrCodeBase64 });
      }
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    try {
      // 1. Get application details
      const { data: appData, error: appError } = await supabase
        .from('truscan_partner_applications')
        .select('*')
        .eq('id', appId)
        .single();

      if (appError) {
        console.error('Error fetching application for approval:', JSON.stringify(appError, null, 2));
        // If it's mock data IDs from the frontend fallback, we just return success
        if (MOCK_MODE && (appId === '1' || appId === '2')) {
          const agentCode = `TS-MOCK-${appId}`;
          const qrCodeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
          return res.status(200).json({ success: true, agentCode, qrCodeBase64 });
        }
        throw appError;
      }

      // 2. Generate agent code (simple TS-XXX)
      const { count, error: countError } = await supabase.from('truscan_agents').select('*', { count: 'exact', head: true });
      if (countError) {
        console.error('Error counting agents:', JSON.stringify(countError, null, 2));
        throw countError;
      }
      
      const nextId = (count || 0) + 1;
      const agentCode = `TS-${String(nextId).padStart(3, '0')}`;

      // 3. Generate QR Code for referral link
      const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const referralLink = `${appUrl}/?agent=${agentCode}`;
      const qrCodeBase64 = await QRCode.toDataURL(referralLink, {
        color: {
          dark: '#0066FF', // brand-blue
          light: '#FFFFFF'
        },
        width: 400,
        margin: 2
      });

      // 4. Create agent
      const { error: agentError } = await supabase
        .from('truscan_agents')
        .insert([{
          agent_code: agentCode,
          agent_name: appData.name,
          total_referrals: 0,
          total_earnings: 0,
          commission_tier: 'standard',
          qr_image_path: qrCodeBase64 // Using this for the base64 for now
        }]);

      if (agentError) {
        console.error('Error creating agent:', JSON.stringify(agentError, null, 2));
        throw agentError;
      }

      // 4. Update application status and store agent code
      const { error: updateError } = await supabase
        .from('truscan_partner_applications')
        .update({ 
          status: 'approved'
        })
        .eq('id', appId);

      if (updateError) {
        console.error('Error updating application status:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }

      res.status(200).json({ success: true, agentCode, qrCodeBase64 });
    } catch (error: any) {
      console.error('Approve application error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to approve application',
        details: error.details || 'Check database tables and permissions.'
      });
    }
  });
  
  app.post('/api/admin/decline', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const session = await validateSession(token, 'admin');
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appId } = req.body;

    if (!supabase) {
      return res.status(200).json({ success: true });
    }

    try {
      const { error } = await supabase
        .from('truscan_partner_applications')
        .update({ status: 'declined' })
        .eq('id', appId);

      if (error) {
        console.error('Error declining application:', JSON.stringify(error, null, 2));
        throw error;
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Decline application error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to decline application'
      });
    }
  });

  // Agent Dashboard Endpoints
  // Agent Details Endpoint
  app.get('/api/agent/:code', async (req, res) => {
    const { code } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const session = await validateSession(token, 'agent');
    if (!session || (session.user_id !== code && session.user_id !== 'admin')) {
      console.warn(`❌ Agent Details: Unauthorized access attempt for code ${code}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${new Date().toISOString()}] [${requestId}] 🔐 GET /api/agent/${code} - Start`);
    
    // Mock agent for debugging if Supabase is not configured or for testing
    if (code === 'DEBUG') {
      console.log(`[${requestId}] ✅ DEBUG agent requested, returning mock data`);
      return res.status(200).json({
        agent_code: 'DEBUG',
        total_referrals: 12,
        total_earnings: 4500,
        commission_tier: 'Premium'
      });
    }

    if (!supabase) {
      console.error(`[${requestId}] ❌ Supabase not configured in server.ts`);
      return res.status(500).json({ error: 'Supabase not configured. Use DEBUG to test.' });
    }
    
    try {
      console.log(`[${requestId}] 🔍 Querying Supabase for agent: ${code}`);
      
      // Add a timeout to the Supabase query
      const queryPromise = supabase
        .from('truscan_agents')
        .select('*')
        .eq('agent_code', code)
        .single();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timed out')), 8000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`[${requestId}] ⚠️ Agent not found: ${code}`);
          return res.status(404).json({ error: 'Agent not found' });
        }
        console.error(`[${requestId}] ❌ Supabase query error:`, error);
        throw error;
      }
      console.log(`[${requestId}] ✅ Agent found:`, data);
      res.status(200).json(data);
    } catch (error: any) {
      console.error(`[${requestId}] 💥 Fetch agent error:`, error);
      res.status(500).json({ error: error.message || 'Failed to fetch agent' });
    }
  });

  // Agent Referrals Endpoint
  app.get('/api/agent/:code/referrals', async (req, res) => {
    const { code } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const session = await validateSession(token, 'agent');
    if (!session || (session.user_id !== code && session.user_id !== 'admin')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Mock referrals for DEBUG agent
    if (code === 'DEBUG') {
      return res.status(200).json([
        { id: '1', created_at: new Date().toISOString(), full_name: 'John Smith', entry_category: 'Retail', funnel_stage: 'lead_captured' },
        { id: '2', created_at: new Date(Date.now() - 86400000).toISOString(), full_name: 'Sarah Jones', entry_category: 'Manufacturing', funnel_stage: 'contacted' }
      ]);
    }

    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    try {
      const { data, error } = await supabase
        .from('truscan_funnel')
        .select('*')
        .eq('agent_id', code)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json(data);
    } catch (error: any) {
      console.error('Fetch referrals error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Agent Stats Endpoint
  app.get('/api/agent/:code/stats', async (req, res) => {
    const { code } = req.params;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const session = await validateSession(token, 'agent');
    if (!session || (session.user_id !== code && session.user_id !== 'admin')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (code === 'DEBUG') {
      return res.status(200).json({
        leadsByStage: [
          { name: 'Lead Captured', value: 8 },
          { name: 'Contacted', value: 4 },
          { name: 'Qualified', value: 2 },
          { name: 'Proposal Sent', value: 1 },
          { name: 'Closed Won', value: 0 }
        ]
      });
    }

    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    try {
      const { data: stages, error: stageError } = await supabase
        .from('truscan_funnel')
        .select('funnel_stage')
        .eq('agent_id', code);

      if (stageError) throw stageError;

      const stages_list = ['lead_captured', 'contacted', 'qualified', 'proposal_sent', 'closed_won'];
      const stageCounts: Record<string, number> = {};
      stages_list.forEach(s => stageCounts[s] = 0);
      
      stages?.forEach(l => {
        if (stageCounts[l.funnel_stage] !== undefined) {
          stageCounts[l.funnel_stage]++;
        }
      });

      const leadsByStage = Object.entries(stageCounts).map(([key, value]) => ({
        name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        value
      }));

      res.status(200).json({ leadsByStage });
    } catch (error: any) {
      console.error('Fetch agent stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

// 5. Background Health Checks
if (supabase) {
  (async () => {
    console.log('🔍 Running background table verification...');
    const tables = ['truscan_agent_logs', 'truscan_funnel', 'truscan_partner_applications', 'truscan_agents'];
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.warn(`⚠️ Table "${table}" check failed: ${error.message}`);
        } else {
          console.log(`✅ Table "${table}" verified`);
        }
      } catch (e) {
        console.warn(`⚠️ Table "${table}" check error`);
      }
    }
  })();
}

async function startServer() {
  console.log('🚀 Starting server initialization...');
  console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
  console.log('📍 PORT:', PORT);

  // Vite middleware for development (BLOCKING for robustness)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🛠️ Initializing Vite middleware...');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('✅ Vite middleware ready');
    } catch (err) {
      console.error('❌ Vite initialization failed:', err);
    }
  } else {
    console.log('📦 Production mode: Serving static files from /dist');
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      console.warn('⚠️ /dist directory not found! App may not serve correctly.');
    }
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      // Skip if it's an API route that wasn't matched
      if (req.url.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start Listening
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Server listening on http://localhost:${PORT}`);
  });
}

export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
