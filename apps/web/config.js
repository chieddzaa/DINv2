// Supabase connection for the DIN web app.
// The anon (public) key is designed to be public: row-level security in the
// database decides what each signed-in user can read or change.
// Never put the service_role / secret key here.
window.DIN_CONFIG = {
  supabaseUrl: "https://rcakhqznnqphhvxandmc.supabase.co",
  // Web push public key (VAPID). Public by design; the private key lives only in Supabase secrets.
  vapidPublicKey: "",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjYWtocXpubnFwaGh2eGFuZG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTgyMTcsImV4cCI6MjA4ODk3NDIxN30.5MBxD2N_rlaWvVrJCrNyHCtBHnRsygVS787JS340siU"
};
