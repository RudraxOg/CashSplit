const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const config = require('../config');

const supabase = config.SUPABASE_ENABLED
  ? createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket },
  })
  : null;

async function health() {
  if (!supabase) return { mode: 'memory', connected: false };
  const { error } = await supabase.from('groups').select('id').limit(1);
  return { mode: 'supabase', connected: !error, error: error?.message };
}

module.exports = { supabase, health };
