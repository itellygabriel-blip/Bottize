import { createClient } from ' @supabase/supabase-js'

// É seguro expor estas variáveis no cliente, pois o acesso
// aos dados é controlado pelas Row Level Security (RLS) policies do Supabase.
const supabaseUrl = 'https://bohoarfbdfvlmbzkzmvk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaG9hcmZiZGZ2bG1iemt6bXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Nzg3NDcsImV4cCI6MjA3NDI1NDc0N30.8_JJJ8VJ9-Xxf5fXZbpAMkgQr7J6iUw4broBj4sgvyY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)