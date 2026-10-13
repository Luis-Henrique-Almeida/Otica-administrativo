import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qlomscdqtmdmjjhuhhwa.supabase.co";
console.log("https://qlomscdqtmdmjjhuhhwa.supabase.co", supabaseUrl);
const supabaseAnonKey = "sb_publishable_PH5CYiLueSeIffttPVIIGw_njvdAhff";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
