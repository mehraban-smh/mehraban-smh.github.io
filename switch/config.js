/* SWITCH comfort study - configuration shared by the check-in app and the dashboard.
 *
 * Until the two Supabase values below are filled in, both pages run in "local mode":
 * check-ins are kept in the participant's own browser and the dashboard shows only
 * what is stored in the browser it is opened in.
 *
 * The anon key is designed to be public. What it may do is limited by the row-level
 * security policies in supabase-setup.sql (insert check-ins, nothing else).
 */
window.SWITCH_CONFIG = {
  supabaseUrl: "",       // e.g. "https://abcdefghijklmnop.supabase.co"  (Project Settings > API > Project URL)
  supabaseAnonKey: "",   // Project Settings > API > Project API keys > anon public
  table: "comfort_votes",
  studyName: "SWITCH personal comfort study",
  appVersion: "0.1.0"
};
