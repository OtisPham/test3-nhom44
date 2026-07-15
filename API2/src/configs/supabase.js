const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xvnmhvuxfurvhqgopjiz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bm1odnV4ZnVydmhxZ29waml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4ODM0MzAsImV4cCI6MjA5MTQ1OTQzMH0.qDxUutDaNBOHcI33PcNZMYlF968grY_JeJHuvfWM3O0';

// ⚠️ CHÚ Ý: Copy chính xác mã SERVICE_ROLE_KEY (Chìa khóa vạn năng) của bạn dán vào đây
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bm1odnV4ZnVydmhxZ29waml6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg4MzQzMCwiZXhwIjoyMDkxNDU5NDMwfQ.RW8vgRQJ6OPWxVH3UeRVaHCZWxZ2uiI1246sWkeD5kQ'; 

// Client thông thường
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Client Admin tối cao để giải mã token và bypass RLS
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = { supabase, supabaseAdmin };