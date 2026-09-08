/* SWITCH comfort study - configuration shared by the check-in app, its service worker, the dashboard
 * and the reminder sender.
 *
 * Until the two Supabase values below are filled in, both pages run in "local mode":
 * check-ins are kept in the participant's own browser and the dashboard shows only
 * what is stored in the browser it is opened in.
 *
 * The anon key and the VAPID public key are designed to be public. What the anon key may do is
 * limited by the row-level security policies in supabase-setup.sql (insert check-ins, register a
 * phone for reminders, nothing else). The matching VAPID *private* key lives only in the GitHub
 * secret VAPID_PRIVATE_KEY.
 */
self.SWITCH_CONFIG = {
  supabaseUrl: "https://kysovekezjdoxerykkmj.supabase.co",       // e.g. "https://abcdefghijklmnop.supabase.co"  (Settings > Data API > Project URL)
  supabaseAnonKey: "sb_publishable_cz0_-SSTWy6KkwFjj4jEXQ_YSJJZMh8",   // Settings > API Keys > Publishable key (sb_publishable_...); a legacy "anon" key also works
  table: "comfort_votes",
  pushTable: "push_subscriptions",
  vapidPublicKey: "BONtfcqHLMr-1AEFJ9RN9ImsM4nsfJZNTvDrkfLE2htSmt5FUZGzZqa09n6VH6z8JK9DlgsvCtDSHsbXyO5OV6g",
  reminderIntervalMin: 30,
  studyName: "SWITCH personal comfort study",
  appVersion: "0.2.0"
};
