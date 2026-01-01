export const AVATARS = [
  {
    id: "avatar-1",
    name: "Cheerful Man",
    image: "/avatars/cheerful_man_with_curly_black_hair_avatar.png",
  },
  {
    id: "avatar-2",
    name: "Confident Woman",
    image: "/avatars/confident_woman_with_long_black_hair_avatar.png",
  },
  {
    id: "avatar-3",
    name: "Creative Man",
    image: "/avatars/creative_man_with_dyed_hair_avatar.png",
  },
  {
    id: "avatar-4",
    name: "Friendly Bearded Man",
    image: "/avatars/friendly_bearded_man_with_red_hair_avatar.png",
  },
  {
    id: "avatar-5",
    name: "Warm Older Woman",
    image: "/avatars/warm_older_woman_with_grey_hair_avatar.png",
  },
  {
    id: "avatar-6",
    name: "Woman with Glasses",
    image: "/avatars/woman_with_short_blonde_hair_and_glasses_avatar.png",
  },
  {
    id: "avatar-7",
    name: "Young Man",
    image: "/avatars/young_man_with_brown_hair_avatar.png",
  },
  {
    id: "avatar-8",
    name: "Young Woman",
    image: "/avatars/young_woman_with_curly_dark_hair_avatar.png",
  },
];

export function getAvatarImage(avatarId: string): string {
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar?.image || AVATARS[0].image;
}

export function getAvatarName(avatarId: string): string {
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar?.name || "Unknown";
}
