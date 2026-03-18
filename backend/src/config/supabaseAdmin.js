import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Service role client bypasses RLS and allows backend scripts to insert/update rows
// safely for things like OAuth callbacks where the user may not have an active session
// on the backend itself.
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default supabaseAdmin;
