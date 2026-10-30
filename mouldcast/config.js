/* MouldCast - configuration shared by the resident app (app/), its service worker, the housing team view (staff/)
 * and the digital twin engine (twin.js).
 *
 * MouldCast is the occupant- and provider-facing application of the PhD "AI-integrated Digital Twins for early
 * detection of damp and mould in UK social housing" (London South Bank University), Objective 5 of the RES3 report.
 *
 * mode "demo": there is no backend yet. twin.js simulates the home, its sensors and the forecasts on the device,
 * and photos and reports stay in the browser they were made in (the housing team view reads that same browser).
 * mode "live" (later): the pages read the Digital Twin platform at apiUrl instead (see README.md, "Going live").
 *
 * appName is the app's name everywhere the JavaScript shows it, so it can be changed here in one place; the
 * manifest, the page titles and the README say it too.
 */
self.MC_CONFIG = {
  appName: "MouldCast",
  tagline: "See mould coming before it shows",
  project: "Damp and mould digital twin · LSBU",
  mode: "demo",
  apiUrl: "",
  timeZone: "Europe/London",
  team: "info@mehraban.uk",
  appVersion: "0.1.0"
};
