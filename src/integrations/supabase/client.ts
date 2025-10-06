import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jofdcpvrzqkdstfmfpee.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZmRjcHZyenFrZHN0Zm1mcGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzIzNTUsImV4cCI6MjA3NTE0ODM1NX0.lOmooYHQu1z1LVSoz3ukrd2gxUdw-D9iYx3edITlnXI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);