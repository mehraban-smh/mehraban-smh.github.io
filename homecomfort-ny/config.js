/* Home Comfort NY (SUNY ESF) - configuration shared by the check-in app, its service worker, the dashboard
 * and the reminder scripts. This study has its own Supabase project: nothing here is shared with any
 * other study on this site.
 *
 * Until the two Supabase values below are filled in (homecomfort-ny/README.md, "One-time setup"), the app
 * and the dashboard run in "local mode": check-ins stay in the participant's own browser and the
 * dashboard shows only what is stored in the browser it is opened in.
 *
 * The publishable key and the VAPID public key are designed to be public. What the publishable key may do
 * is limited by the row-level security policies and functions in supabase-setup.sql (register and check
 * approval; for an approved participant code insert check-ins and register a phone for reminders; change
 * the reminder row of the push endpoint it names, and no other row; nothing else). The matching VAPID
 * private key lives only in the GitHub secret NY_VAPID_PRIVATE_KEY.
 */
self.HC_CONFIG = {
  supabaseUrl: "",          // Settings > Data API > Project URL, e.g. "https://abcdefghijklmnop.supabase.co"
  supabaseAnonKey: "",      // Settings > API Keys > Publishable key (sb_publishable_...)
  table: "comfort_votes",
  pushTable: "push_subscriptions",
  vapidPublicKey: "BDqHJMzCcb8e8NZLfcw0mAyV2C9ouZvzrlAyil3MzaC9ZYUGYhroQTWMZBTUHvH5-uoyLAT88W1-jA-0B2e7IY4",
  reminderIntervalMin: 60,
  dailyGoal: 3,             // check-ins a day the app's goal ring counts towards (the weekly goal is 7 times this)
  timeZone: "America/New_York",   // the sender reads home hours in this zone for phones that have not reported their own
  studyName: "Home Comfort NY",
  appVersion: "1.0.0"
};
