// Supabase connection for the DIN web app.
// The anon (public) key is designed to be public: row-level security in the
// database decides what each signed-in user can read or change.
// Never put the service_role / secret key here.
window.DIN_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
