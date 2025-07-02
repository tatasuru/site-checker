import { defineStore } from "pinia";

type Profile = {
  id: string;
  name: string;
  avatar_url: string;
};

export const useStore = defineStore("userInfo", () => {
  const profile = ref<Profile>({
    id: "",
    name: "",
    avatar_url: "",
  });

  const setProfile = (newProfile: Profile) => {
    profile.value = { ...newProfile };
  };

  const clearProfile = () => {
    profile.value = {
      id: "",
      name: "",
      avatar_url: "",
    };
  };

  return { profile, setProfile, clearProfile };
});
