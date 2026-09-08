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
  supabaseUrl: "",       // e.g. "https://abcdefghijklmnop.supabase.co"  (Settings > Data API > Project URL)
  supabaseAnonKey: "",   // Settings > API Keys > Publishable key (sb_publishable_...); a legacy "anon" key also works
  table: "comfort_votes",
  pushTable: "push_subscriptions",
  vapidPublicKey: "BAtT_sPFKWVz0SlKv_T4PbD2yv4EqpGCrXNZfHX23RQnJuQQZ2qCcHWifbEQfjKz2H7wc88wcMSS18MxyrxUTnw",
  reminderIntervalMin: 30,
  studyName: "SWITCH personal comfort study",
  appVersion: "0.2.0"
};
