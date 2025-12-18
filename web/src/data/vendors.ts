export type Vendor = {
  id: string;
  name: string;
  cuisine: string;
  tagline: string;
  description: string;
  city: string;
  latitude: number;
  longitude: number;
  todayHours: string;
  logoUrl?: string;
  ownerName?: string;
  website?: string;
  socials?: string;
  hours?: Record<string, string>;
  likeCount?: number;
  saveCount?: number;
  lastUpdated?: string;
};

export const vendors: Vendor[] = [
  {
    id: "la-calle-roja",
    name: "La Calle Roja",
    cuisine: "Birria tacos & street classics",
    tagline: "Slow-braised birria, crisped to perfection and dunked in consomé.",
    description:
      "La Calle Roja is a late-night birria specialist serving tacos, quesabirria, and crispy mulitas with a rich, house-made consomé. Find them near downtown nightlife and festival hubs.",
    city: "Austin, TX",
    latitude: 30.2672,
    longitude: -97.7431,
    todayHours: "Tonight · 7pm – 1am",
    ownerName: "María Ramos",
    website: "https://example.com/la-calle-roja",
    socials: "@lacallerojatacos",
    hours: {
      Monday: "Closed",
      Tuesday: "5pm – 11pm",
      Wednesday: "5pm – 11pm",
      Thursday: "5pm – 12am",
      Friday: "7pm – 1am",
      Saturday: "7pm – 1am",
      Sunday: "Closed",
    },
    likeCount: 128,
    saveCount: 64,
    lastUpdated: "Today, 8:45pm",
  },
  {
    id: "chrome-and-cheddar",
    name: "Chrome & Cheddar",
    cuisine: "Smash burgers & loaded fries",
    tagline: "Thin, craggly-edged patties with a molten cheddar crown.",
    description:
      "Chrome & Cheddar brings diner energy to the curb—smash burgers, secret sauce, and crispy shoestring fries loaded with toppings.",
    city: "Portland, OR",
    latitude: 45.5152,
    longitude: -122.6784,
    todayHours: "Today · 11am – 3pm",
    ownerName: "Dev & Nina Carter",
    website: "https://example.com/chrome-and-cheddar",
    socials: "@chromeandcheddar",
    hours: {
      Monday: "11am – 3pm",
      Tuesday: "11am – 3pm",
      Wednesday: "11am – 3pm",
      Thursday: "11am – 3pm",
      Friday: "11am – 3pm",
      Saturday: "Pop-up only",
      Sunday: "Closed",
    },
    likeCount: 212,
    saveCount: 97,
    lastUpdated: "Today, 12:10pm",
  },
  {
    id: "glow-bowl",
    name: "Glow Bowl",
    cuisine: "Plant-based bowls & comfort",
    tagline: "Colorful bowls, warm grains, and indulgent vegan comfort food.",
    description:
      "Glow Bowl focuses on vibrant, plant-forward dishes: roasted veggies, marinated tofu, and dairy-free mac & cheese with a golden cashew sauce.",
    city: "Los Angeles, CA",
    latitude: 34.0522,
    longitude: -118.2437,
    todayHours: "Today · 12pm – 9pm",
    ownerName: "Jade Kim",
    website: "https://example.com/glow-bowl",
    socials: "@eatglowbowl",
    hours: {
      Monday: "12pm – 8pm",
      Tuesday: "12pm – 8pm",
      Wednesday: "12pm – 8pm",
      Thursday: "12pm – 9pm",
      Friday: "12pm – 9pm",
      Saturday: "12pm – 9pm",
      Sunday: "Closed",
    },
    likeCount: 341,
    saveCount: 182,
    lastUpdated: "Yesterday, 6:25pm",
  },
];
