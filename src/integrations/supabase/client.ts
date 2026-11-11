import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const env = import.meta.env as any;
const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = env['VITE_SUPABASE_PUBLISHABLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);