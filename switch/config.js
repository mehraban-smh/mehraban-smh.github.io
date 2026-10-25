/* HomePulse, the SWITCH home comfort study (Swansea) - configuration shared by the check-in app, its service
 * worker, the dashboard and the reminder sender.
 *
 * Until the two Supabase values below are filled in, both pages run in "local mode":
 * check-ins are kept in the participant's own browser and the dashboard shows only
 * what is stored in the browser it is opened in.
 *
 * The publishable key and the VAPID public key are designed to be public. What the publishable key may do is
 * limited by the row-level security policies and functions in supabase-setup.sql (join, sign in with email
 * and PIN, check approval; with a device key: send check-ins, read the participant's own check-ins, profile,
 * points and the anonymous race, register a phone for reminders; change the reminder row of the push
 * endpoint it names, and no other row; nothing else). The matching VAPID *private* key lives only in the
 * GitHub secret VAPID_PRIVATE_KEY.
 *
 * appName is the app's name everywhere the JavaScript shows it (app, notifications, sender), so it can be
 * changed here in one place; the manifest, the page titles and the READMEs say it too.
 */
self.SWITCH_CONFIG = {
  supabaseUrl: "https://kysovekezjdoxerykkmj.supabase.co",        // unchanged
  supabaseAnonKey: "sb_publishable_cz0_-SSTWy6KkwFjj4jEXQ_YSJJZMh8", // unchanged
  table: "comfort_votes", pushTable: "push_subscriptions",
  vapidPublicKey: "BONtfcqHLMr-1AEFJ9RN9ImsM4nsfJZNTvDrkfLE2htSmt5FUZGzZqa09n6VH6z8JK9DlgsvCtDSHsbXyO5OV6g",
  reminderIntervalMin: 60,
  checkinGapMin: 45,     // a check-in opens 45 min after the last one (all devices); no reminder sooner
  dailyGoal: 4,          // check-ins a day; the weekly goal is 7 days that reach it
  points: { checkin: 10, goalDay: 20, fullWeek: 50, dailyCap: 15 },  // must match supabase-setup.sql
  timeZone: "Europe/London",
  appName: "HomePulse",
  studyName: "SWITCH home comfort study",
  studyStart: null, studyEnd: null,  // optional "YYYY-MM-DD"; when studyEnd is set, reminders stop after it (UK time)
  appVersion: "1.0.0"
};
