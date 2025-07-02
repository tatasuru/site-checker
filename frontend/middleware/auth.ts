export default defineNuxtRouteMiddleware(async (to, _from) => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const store = useStore();

  interface Profile {
    id: string;
    name: string;
    avatar_url: string;
  }

  // Check if the user is not authenticated and trying to access the dashboard
  if (to.path === "/login" && user.value) {
    return await navigateTo("/dashboard");
  }

  // Handle profile setup for authenticated users
  if (user.value) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.value.id)
        .single();

      if (error || !data) {
        console.error("Error fetching profile:", error);
        return await navigateTo("/login");
      }

      const profile = data as Profile;
      store.setProfile({
        id: profile.id,
        name: profile.name || "",
        avatar_url: profile.avatar_url || "",
      });
    } catch (err) {
      console.error("Exception in auth middleware:", err);
    }
  } else {
    // Clear store when user is not authenticated
    store.clearProfile();
  }
});
