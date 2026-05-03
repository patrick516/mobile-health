// ─── Static fake data ─────────────────────────────────────────────────────
// TODO: Replace with real API endpoints later

export type Gender = "male" | "female";
export type SmokingPref = "never" | "socially" | "regularly" | "trying_to_quit";
export type AlcoholPref = "never" | "socially" | "regularly";
export type ChildrenPref =
  | "have_and_want_more"
  | "have_dont_want_more"
  | "dont_have_want"
  | "dont_have_dont_want";
export type RelationshipGoal = "serious" | "casual" | "friendship" | "not_sure";
export type ExercisePref = "never" | "sometimes" | "often" | "daily";
export type DietPref =
  | "omnivore"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "halal"
  | "kosher";
export type ReligionPref =
  | "christian"
  | "muslim"
  | "hindu"
  | "buddhist"
  | "none"
  | "other";
export type EducationLevel =
  | "high_school"
  | "diploma"
  | "bachelors"
  | "masters"
  | "phd"
  | "other";

export interface Lifestyle {
  smoking: SmokingPref;
  alcohol: AlcoholPref;
  children: ChildrenPref;
  relationshipGoal: RelationshipGoal;
  exercise: ExercisePref;
  diet: DietPref;
  religion: ReligionPref;
  education: EducationLevel;
  height?: string;
  zodiac?: string;
}

export interface User {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  verified: boolean;
  profession: string;
  country: string;
  district: string;
  town: string;
  bio: string;
  interests: string[];
  lifestyle: Lifestyle;
  photo: string;
  photoColor?: string;
  online: boolean;
  isPremium?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

const baseLifestyle = (overrides: Partial<Lifestyle> = {}): Lifestyle => ({
  smoking: "never",
  alcohol: "socially",
  children: "dont_have_want",
  relationshipGoal: "serious",
  exercise: "sometimes",
  diet: "omnivore",
  religion: "christian",
  education: "bachelors",
  ...overrides,
});

export const FAKE_USERS: User[] = [
  // ── Females ────────────────────────────────────────────────────────────────
  {
    id: "1",
    name: "Naya",
    age: 24,
    gender: "female",
    verified: true,
    profession: "Designer",
    country: "Malawi",
    district: "Blantyre",
    town: "Limbe",
    bio: "I love traveling, photography and discovering new cafes ☕✨",
    interests: ["Travel", "Photography", "Coffee", "Movies", "Hiking", "Music"],
    lifestyle: baseLifestyle({
      exercise: "often",
      height: "5'5\"",
      zodiac: "Libra",
    }),
    photo: "https://i.pravatar.cc/500?img=47",
    photoColor: "#C2856A",
    online: true,
    lastMessage: "Hey! How are you? 🙂",
    lastMessageTime: "2m",
    unreadCount: 2,
  },
  {
    id: "2",
    name: "Sahana",
    age: 26,
    gender: "female",
    verified: true,
    profession: "Teacher",
    country: "Malawi",
    district: "Lilongwe",
    town: "Area 3",
    bio: "Books, chai and long walks on weekends. Let's explore together!",
    interests: ["Reading", "Fitness", "Coffee", "Travel", "Music"],
    lifestyle: baseLifestyle({
      alcohol: "never",
      diet: "vegetarian",
      education: "masters",
      height: "5'4\"",
      zodiac: "Virgo",
    }),
    photo: "https://i.pravatar.cc/500?img=48",
    photoColor: "#A07850",
    online: true,
    lastMessage: "That sounds great!",
    lastMessageTime: "1h",
    unreadCount: 1,
  },
  {
    id: "3",
    name: "Thara",
    age: 22,
    gender: "female",
    verified: false,
    profession: "Nurse",
    country: "Malawi",
    district: "Zomba",
    town: "Chinamwali",
    bio: "Caring for others is my passion. Love cooking and dancing 💃",
    interests: ["Cooking", "Dancing", "Fitness", "Travel"],
    lifestyle: baseLifestyle({
      children: "dont_have_dont_want",
      relationshipGoal: "casual",
      exercise: "often",
      education: "diploma",
      height: "5'3\"",
      zodiac: "Pisces",
    }),
    photo: "https://i.pravatar.cc/500?img=49",
    photoColor: "#8B6060",
    online: false,
    lastMessage: "Nice to meet you 😊",
    lastMessageTime: "3h",
    unreadCount: 0,
  },
  {
    id: "4",
    name: "Ishara",
    age: 28,
    gender: "female",
    verified: true,
    profession: "Engineer",
    country: "Malawi",
    district: "Blantyre",
    town: "Ndirande",
    bio: "Problem solver by day, foodie by night. Let's grab coffee!",
    interests: ["Technology", "Coffee", "Hiking", "Photography"],
    lifestyle: baseLifestyle({
      children: "have_dont_want_more",
      religion: "muslim",
      height: "5'6\"",
      zodiac: "Scorpio",
    }),
    photo: "https://i.pravatar.cc/500?img=50",
    photoColor: "#6B7E8B",
    online: true,
    lastMessage: "Where are you from?",
    lastMessageTime: "5h",
    unreadCount: 0,
  },
  {
    id: "5",
    name: "Minsara",
    age: 25,
    gender: "female",
    verified: false,
    profession: "Artist",
    country: "Malawi",
    district: "Mzuzu",
    town: "Luwinga",
    bio: "Painting my world with colours. Art is life 🎨",
    interests: ["Art", "Travel", "Music", "Photography", "Coffee"],
    lifestyle: baseLifestyle({
      smoking: "socially",
      children: "dont_have_dont_want",
      relationshipGoal: "not_sure",
      religion: "none",
      height: "5'7\"",
      zodiac: "Gemini",
    }),
    photo: "https://i.pravatar.cc/500?img=51",
    photoColor: "#9B7BA0",
    online: false,
    lastMessage: "Wow! I love travel too 🌍",
    lastMessageTime: "1d",
    unreadCount: 0,
  },
  {
    id: "6",
    name: "Amara",
    age: 23,
    gender: "female",
    verified: true,
    profession: "Marketing",
    country: "Malawi",
    district: "Blantyre",
    town: "Chileka",
    bio: "Social butterfly who loves brunch, sunsets and good vibes ✨",
    interests: ["Travel", "Fitness", "Coffee", "Dancing", "Music"],
    lifestyle: baseLifestyle({
      exercise: "daily",
      height: "5'4\"",
      zodiac: "Aries",
    }),
    photo: "https://i.pravatar.cc/500?img=52",
    photoColor: "#C29070",
    online: true,
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  },
  {
    id: "11",
    name: "Zara",
    age: 27,
    gender: "female",
    verified: true,
    profession: "Accountant",
    country: "Zambia",
    district: "Lusaka",
    town: "Chilanga",
    bio: "Numbers by day, salsa dancing by night 💃 Looking for my partner in crime!",
    interests: ["Dancing", "Fitness", "Travel", "Reading", "Coffee"],
    lifestyle: baseLifestyle({
      exercise: "daily",
      education: "masters",
      height: "5'6\"",
      zodiac: "Aquarius",
    }),
    photo: "https://i.pravatar.cc/500?img=44",
    photoColor: "#B07060",
    online: true,
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  },
  {
    id: "12",
    name: "Lola",
    age: 21,
    gender: "female",
    verified: false,
    profession: "Student",
    country: "Tanzania",
    district: "Dar es Salaam",
    town: "Ilala",
    bio: "Final year med student. Coffee is my love language ☕",
    interests: ["Coffee", "Music", "Hiking", "Photography"],
    lifestyle: baseLifestyle({
      alcohol: "never",
      exercise: "often",
      height: "5'2\"",
      zodiac: "Cancer",
    }),
    photo: "https://i.pravatar.cc/500?img=45",
    photoColor: "#D09090",
    online: false,
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  },
  // ── Males ──────────────────────────────────────────────────────────────────
  {
    id: "7",
    name: "Kofi",
    age: 27,
    gender: "male",
    verified: true,
    profession: "Doctor",
    country: "Malawi",
    district: "Blantyre",
    town: "Sunnyside",
    bio: "Healing hearts, literally 🩺 Love hiking and jazz music on weekends.",
    interests: ["Hiking", "Music", "Travel", "Fitness"],
    lifestyle: baseLifestyle({
      alcohol: "never",
      exercise: "daily",
      education: "masters",
      height: "6'0\"",
      zodiac: "Taurus",
    }),
    photo: "https://i.pravatar.cc/500?img=11",
    photoColor: "#7B6B5B",
    online: true,
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  },
  {
    id: "8",
    name: "Tunde",
    age: 29,
    gender: "male",
    verified: true,
    profession: "Lawyer",
    country: "Zambia",
    district: "Lusaka",
    town: "Lusaka City",
    bio: "Passionate about justice and good food 🍜 Let's debate over dinner!",
    interests: ["Reading", "Cooking", "Travel", "Technology"],
    lifestyle: baseLifestyle({
      education: "masters",
      height: "5'11\"",
      zodiac: "Capricorn",
    }),
    photo: "https://i.pravatar.cc/500?img=13",
    photoColor: "#5B4B3B",
    online: false,
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  },
  {
    id: "9",
    name: "Chidi",
    age: 25,
    gender: "male",
    verified: false,
    profession: "Photographer",
    country: "Tanzania",
    district: "Dar es Salaam",
    town: "Kinondoni",
    bio: "Capturing moments that last forever 📸 Based in Dar, travelling always.",
    interests: ["Photography", "Travel", "Art", "Music"],
    lifestyle: baseLifestyle({
      smoking: "socially",
      children: "dont_have_dont_want",
      relationshipGoal: "casual",
      religion: "none",
      height: "5'9\"",
      zodiac: "Leo",
    }),
    photo: "https://i.pravatar.cc/500?img=14",
    photoColor: "#6B5B4B",
    online: true,
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  },
  {
    id: "10",
    name: "Emeka",
    age: 31,
    gender: "male",
    verified: true,
    isPremium: true,
    profession: "Entrepreneur",
    country: "South Africa",
    district: "Gauteng",
    town: "Sandton",
    bio: "Building businesses and building myself 💼 Gym + good music = my therapy.",
    interests: ["Fitness", "Technology", "Travel", "Coffee"],
    lifestyle: baseLifestyle({
      children: "have_and_want_more",
      exercise: "daily",
      height: "6'1\"",
      zodiac: "Sagittarius",
    }),
    photo: "https://i.pravatar.cc/500?img=15",
    photoColor: "#4B3B2B",
    online: false,
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  },
  {
    id: "13",
    name: "Jamal",
    age: 26,
    gender: "male",
    verified: true,
    profession: "Architect",
    country: "Zimbabwe",
    district: "Harare",
    town: "Borrowdale",
    bio: "Designing spaces and dreaming big 🏗️ Basketball & cooking on weekends.",
    interests: ["Art", "Technology", "Fitness", "Cooking"],
    lifestyle: baseLifestyle({
      exercise: "often",
      education: "masters",
      height: "6'2\"",
      zodiac: "Scorpio",
    }),
    photo: "https://i.pravatar.cc/500?img=16",
    photoColor: "#5B6B7B",
    online: true,
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  },
  {
    id: "14",
    name: "Seun",
    age: 30,
    gender: "male",
    verified: false,
    profession: "Chef",
    country: "Malawi",
    district: "Lilongwe",
    town: "Kawale",
    bio: "I cook, therefore I am 🍳 Food brings people together — let me cook for you!",
    interests: ["Cooking", "Music", "Travel", "Fitness"],
    lifestyle: baseLifestyle({
      alcohol: "regularly",
      exercise: "sometimes",
      height: "5'10\"",
      zodiac: "Aries",
    }),
    photo: "https://i.pravatar.cc/500?img=17",
    photoColor: "#7B5B4B",
    online: true,
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  },
];

export interface ChatMessage {
  id: string;
  senderId: string;
  type: "text" | "voice";
  text?: string;
  voiceUri?: string;
  voiceDuration?: number;
  time: string;
  read: boolean;
}

export const FAKE_MESSAGES: Record<string, ChatMessage[]> = {
  "1": [
    {
      id: "m1",
      senderId: "1",
      type: "text",
      text: "Hey! How are you? 🙂",
      time: "10:30 AM",
      read: true,
    },
    {
      id: "m2",
      senderId: "me",
      type: "text",
      text: "I'm good! How about you?",
      time: "10:31 AM",
      read: true,
    },
    {
      id: "m3",
      senderId: "1",
      type: "text",
      text: "I'm great 😊",
      time: "10:32 AM",
      read: true,
    },
    {
      id: "m4",
      senderId: "me",
      type: "text",
      text: "What are you up to tonight?",
      time: "10:33 AM",
      read: true,
    },
    {
      id: "m5",
      senderId: "1",
      type: "text",
      text: "Just watching a movie. You?",
      time: "10:34 AM",
      read: true,
    },
    {
      id: "m6",
      senderId: "me",
      type: "text",
      text: "Same here! Anything good?",
      time: "10:35 AM",
      read: true,
    },
  ],
  "2": [
    {
      id: "m1",
      senderId: "2",
      type: "text",
      text: "Hi there! 😊",
      time: "9:00 AM",
      read: true,
    },
    {
      id: "m2",
      senderId: "me",
      type: "text",
      text: "Hey Sahana!",
      time: "9:02 AM",
      read: true,
    },
    {
      id: "m3",
      senderId: "2",
      type: "text",
      text: "That sounds great!",
      time: "1h ago",
      read: false,
    },
  ],
};

// ── Label helpers ────────────────────────────────────────────────────────────
export const LIFESTYLE_LABELS: Record<string, Record<string, string>> = {
  smoking: {
    never: "Non-smoker 🚭",
    socially: "Social smoker 🚬",
    regularly: "Smoker 🚬",
    trying_to_quit: "Quitting smoking",
  },
  alcohol: {
    never: "Doesn't drink 🚫",
    socially: "Social drinker 🥂",
    regularly: "Drinks regularly 🍺",
  },
  children: {
    have_and_want_more: "Has kids, wants more 👶",
    have_dont_want_more: "Has kids",
    dont_have_want: "Wants kids someday 👶",
    dont_have_dont_want: "Childfree 🚫",
  },
  relationshipGoal: {
    serious: "Serious relationship 💍",
    casual: "Casual dating",
    friendship: "Friendship first 🤝",
    not_sure: "Still figuring it out",
  },
  exercise: {
    never: "Not into gym",
    sometimes: "Exercises sometimes 🏃",
    often: "Gym regular 💪",
    daily: "Fitness freak 🏋️",
  },
  diet: {
    omnivore: "Eats everything 🍗",
    vegetarian: "Vegetarian 🥦",
    vegan: "Vegan 🌱",
    pescatarian: "Pescatarian 🐟",
    halal: "Halal 🕌",
    kosher: "Kosher ✡️",
  },
  religion: {
    christian: "Christian ✝️",
    muslim: "Muslim ☪️",
    hindu: "Hindu 🕉️",
    buddhist: "Buddhist ☸️",
    none: "Not religious",
    other: "Spiritual ✨",
  },
  education: {
    high_school: "High School",
    diploma: "Diploma 📄",
    bachelors: "Bachelor's 🎓",
    masters: "Master's 🎓",
    phd: "PhD 🎓",
    other: "Other",
  },
};

export const addFakeUser = (user: User) => {
  FAKE_USERS.unshift(user);
};
