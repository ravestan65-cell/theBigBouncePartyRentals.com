export interface Product {
  id: string;
  slug: string;
  name: string;
  category: "bounce-houses" | "water-slides" | "party-accessories";
  categoryLabel: string;
  dailyPrice: number;
  buyPrice: number;
  description: string;
  shortDescription: string;
  dimensions: string;
  length: string;
  width: string;
  height: string;
  ageRange: string;
  capacity: string;
  sku: string;
  features: string[];
  included: string[];
  image: string;
  badge?: string;
}

export const products: Product[] = [
  {
    id: "big-water-slide",
    slug: "big-water-slide-kids-adults",
    name: "Big Water Slide for Kids and Adults",
    category: "water-slides",
    categoryLabel: "Water Slides",
    dailyPrice: 199,
    buyPrice: 899,
    description:
      "Our commercial-grade 21ft inflatable water slide is the ultimate summer party centerpiece! This towering slide combines thrilling heights with safe, splash-landing fun. Perfect for backyard birthday parties, neighborhood cookouts, and summer celebrations. The freestanding design means easy setup on any flat surface, and the durable PVC construction ensures years of reliable fun.",
    shortDescription:
      "Commercial-grade 21ft inflatable water slide — the ultimate summer splash for backyard parties and events.",
    dimensions: "L9 x W21 x H12 ft",
    length: "9 ft",
    width: "21 ft",
    height: "12 ft",
    ageRange: "3–9 years",
    capacity: "8 kids",
    sku: "BIG-34E4B153",
    features: [
      "Commercial-grade PVC material",
      "21 ft tall for maximum thrills",
      "Built-in splash pool at the bottom",
      "Reinforced seams for durability",
      "Freestanding design — no extra support needed",
      "Includes blower for continuous inflation",
    ],
    included: [
      "Inflatable water slide",
      "Commercial air blower",
      "Ground stakes & tie-downs",
      "Repair kit",
      "Setup instructions",
    ],
    image: "/images/water-slide.svg",
    badge: "Popular",
  },
  {
    id: "bounce-house-slide-big-kids",
    slug: "bounce-house-with-slide-big-kids",
    name: "Bounce House with Slide for Big Kids",
    category: "bounce-houses",
    categoryLabel: "Bounce Houses",
    dailyPrice: 199,
    buyPrice: 849,
    description:
      "This tropical-themed inflatable castle is a dream come true for active kids! Featuring a spacious jumping area plus an integrated slide, it delivers double the fun in one amazing unit. The vibrant tropical design adds a festive atmosphere to any event, while commercial-grade construction keeps everyone safe. Ideal for backyard parties, school events, and community celebrations.",
    shortDescription:
      "Tropical-themed inflatable castle with spacious jumping area and integrated slide — double the fun!",
    dimensions: "L17 x W13 x H9 ft",
    length: "17 ft",
    width: "13 ft",
    height: "9 ft",
    ageRange: "3–9 years",
    capacity: "8 kids",
    sku: "BOU-4A9DB0EB",
    features: [
      "Tropical-themed vibrant design",
      "Large bounce area + slide combo",
      "Safety mesh walls for visibility",
      "Commercial-grade materials",
      "Easy entry/exit ramp",
      "Indoor & outdoor use",
    ],
    included: [
      "Bounce house with slide",
      "Commercial air blower",
      "Ground stakes & tie-downs",
      "Repair kit",
      "Setup instructions",
    ],
    image: "/images/bounce-house-slide.svg",
    badge: "Best Seller",
  },
  {
    id: "bubble-house",
    slug: "bubble-house",
    name: "Bubble House",
    category: "bounce-houses",
    categoryLabel: "Bounce Houses",
    dailyPrice: 150,
    buyPrice: 699,
    description:
      "Create a magical see-through party space with our stunning Bubble House! This inflatable transparent tent is perfect for photo ops, themed parties, and creating an unforgettable atmosphere. Made from thickened commercial-grade PVC, it's durable enough for public exhibitions while elegant enough for private celebrations. The clear design lets natural light in while providing a cozy, enclosed space.",
    shortDescription:
      "Transparent inflatable bubble tent — magical see-through party space for unforgettable celebrations.",
    dimensions: "L15 x W10 x H8 ft",
    length: "15 ft",
    width: "10 ft",
    height: "8 ft",
    ageRange: "4–15 years",
    capacity: "8 kids",
    sku: "BUB-91596CF2",
    features: [
      "Transparent PVC design",
      "Thickened commercial-grade material",
      "Perfect for photo opportunities",
      "Indoor & outdoor use",
      "Continuous inflation blower included",
      "Weather-resistant construction",
    ],
    included: [
      "Bubble house tent",
      "Air blower",
      "Ground anchoring kit",
      "Repair kit",
      "Setup instructions",
    ],
    image: "/images/bubble-house.svg",
    badge: "Unique",
  },
  {
    id: "building-blocks-bounce-house",
    slug: "building-blocks-theme-bounce-house",
    name: "Building Blocks Theme Bounce House",
    category: "bounce-houses",
    categoryLabel: "Bounce Houses",
    dailyPrice: 199,
    buyPrice: 799,
    description:
      "Let your little builders bounce their hearts out in this colorful construction-themed bounce house! Inspired by classic building blocks, this inflatable features bright primary colors and a playful design that kids absolutely love. Commercial-grade construction ensures safe, worry-free fun at birthday parties, school events, and backyard playdates.",
    shortDescription:
      "Colorful construction-themed bounce house inspired by building blocks — a hit at every party!",
    dimensions: "L12 x W12 x H10 ft",
    length: "12 ft",
    width: "12 ft",
    height: "10 ft",
    ageRange: "3–9 years",
    capacity: "8 kids",
    sku: "BUI-1245F312",
    features: [
      "Fun building-block theme kids love",
      "Bright primary color design",
      "Extra-tall 10 ft height",
      "Safety mesh windows",
      "Commercial-grade PVC",
      "Easy setup in minutes",
    ],
    included: [
      "Themed bounce house",
      "Commercial air blower",
      "Ground stakes & tie-downs",
      "Repair kit",
      "Setup instructions",
    ],
    image: "/images/blocks-bounce.svg",
  },
  {
    id: "obstacle-bounce-house",
    slug: "inflatable-bounce-house-with-obstacles",
    name: "Inflatable Bounce House with Obstacles",
    category: "bounce-houses",
    categoryLabel: "Bounce Houses",
    dailyPrice: 150,
    buyPrice: 749,
    description:
      "Take playtime to the next level with this action-packed obstacle course bounce house! Featuring tunnels, climbing walls, a slide, and a spacious jumping zone, this multi-feature inflatable castle keeps kids entertained for hours. The obstacle elements encourage active play and friendly competition, making it perfect for energetic birthday parties and backyard adventures.",
    shortDescription:
      "Action-packed obstacle course with tunnels, climbing walls, slide, and jumping zone all in one!",
    dimensions: "L18 x W8 x H7 ft",
    length: "18 ft",
    width: "8 ft",
    height: "7 ft",
    ageRange: "3–9 years",
    capacity: "8 kids",
    sku: "INF-028C7C32",
    features: [
      "Built-in obstacle course",
      "Tunnels & climbing walls",
      "Integrated slide",
      "Spacious jumping zone",
      "Safety mesh enclosure",
      "Commercial-grade materials",
    ],
    included: [
      "Obstacle bounce house",
      "Commercial air blower",
      "Ground stakes & tie-downs",
      "Repair kit",
      "Setup instructions",
    ],
    image: "/images/obstacle-bounce.svg",
  },
  {
    id: "obstacle-course-racing",
    slug: "inflatable-obstacle-course-bounce-house",
    name: "Inflatable Obstacle Course Bounce House",
    category: "bounce-houses",
    categoryLabel: "Bounce Houses",
    dailyPrice: 150,
    buyPrice: 729,
    description:
      "Ready, set, race! This racing-themed inflatable obstacle course features dual slides, tunnels, and climbing sections that let kids compete head-to-head. Perfect for field days, birthday party competitions, and high-energy events where kids want to burn off steam. The dual-lane design means twice the fun and friendly rivalry!",
    shortDescription:
      "Racing-themed dual-lane obstacle course with slides, tunnels, and climbing sections for competitive fun!",
    dimensions: "L18 x W8 x H6 ft",
    length: "18 ft",
    width: "8 ft",
    height: "6 ft",
    ageRange: "3–9 years",
    capacity: "8 kids",
    sku: "INF-C9C3D494",
    features: [
      "Dual racing lanes",
      "Slides, tunnels & climbing walls",
      "Head-to-head competition design",
      "Commercial-grade construction",
      "Safety mesh panels",
      "Quick inflation setup",
    ],
    included: [
      "Obstacle course bounce house",
      "Commercial air blower",
      "Ground stakes & tie-downs",
      "Repair kit",
      "Setup instructions",
    ],
    image: "/images/racing-obstacle.svg",
  },
  {
    id: "foam-machine",
    slug: "foam-machine",
    name: "Foam Machine",
    category: "party-accessories",
    categoryLabel: "Party Accessories",
    dailyPrice: 70,
    buyPrice: 299,
    description:
      "Turn any party into a foam frenzy with our powerful 180W party foam cannon! Mounted on a sturdy tripod stand, this portable foam maker creates mountains of fluffy, kid-safe foam that transforms outdoor spaces into a magical foam wonderland. Comes with a submersible pump for continuous foam production — perfect for birthdays, pool parties, and summer events.",
    shortDescription:
      "Powerful 180W foam cannon on tripod — transforms any party into a magical foam wonderland!",
    dimensions: "L14 x W11 x H38 in",
    length: "14 in",
    width: "11 in",
    height: "38 in",
    ageRange: "All ages",
    capacity: "100 people",
    sku: "FOA-E74BF916",
    features: [
      "180W powerful foam output",
      "Tripod stand included",
      "Submersible pump for continuous foam",
      "Kid-safe foam solution compatible",
      "Portable & easy to transport",
      "Indoor & outdoor use",
    ],
    included: [
      "Foam machine",
      "Tripod stand",
      "Submersible pump",
      "Foam solution sample",
      "Setup instructions",
    ],
    image: "/images/foam-machine.svg",
    badge: "Fun Add-on",
  },
  {
    id: "folding-table",
    slug: "heavy-duty-folding-table",
    name: "Heavy Duty Folding Table",
    category: "party-accessories",
    categoryLabel: "Party Accessories",
    dailyPrice: 10,
    buyPrice: 59,
    description:
      "Sturdy and reliable, our heavy-duty folding tables are essential for any event setup. Perfect for serving food, displaying party favors, or creating activity stations. The durable plastic construction is easy to clean and weather-resistant, while the folding design makes transport and storage a breeze. Seats up to 6 people comfortably.",
    shortDescription:
      "Sturdy, weather-resistant folding table — essential for food, activities, and event setups.",
    dimensions: "L48 x W24 x H29 in",
    length: "48 in",
    width: "24 in",
    height: "29 in",
    ageRange: "All ages",
    capacity: "6 people",
    sku: "HEA-1956A572",
    features: [
      "Heavy-duty plastic top",
      "Folds flat for easy storage",
      "Weather-resistant materials",
      "Seats up to 6 people",
      "Lightweight yet sturdy",
      "Easy to clean surface",
    ],
    included: ["Folding table", "Non-slip feet pads"],
    image: "/images/folding-table.svg",
  },
  {
    id: "popcorn-machine",
    slug: "popcorn-machine-with-cart",
    name: "Popcorn Machine with Cart & Wheels",
    category: "party-accessories",
    categoryLabel: "Party Accessories",
    dailyPrice: 70,
    buyPrice: 349,
    description:
      "Nothing says 'party time' like the smell of fresh popcorn! Our vintage-style 850W popcorn machine with wheeled cart brings the movie theater experience right to your event. The 8oz kettle pops perfect batches every time, and the charming cart design adds a nostalgic touch that guests love. Comes with scoops, oil spoon, and serving cups to get you started.",
    shortDescription:
      "Vintage-style 850W popcorn machine on wheeled cart — bring the movie theater to your party!",
    dimensions: "L18 x W15 x H48 in",
    length: "18 in",
    width: "15 in",
    height: "48 in",
    ageRange: "All ages",
    capacity: "Serves many",
    sku: "POP-8098F8F7",
    features: [
      "850W commercial power",
      "8oz kettle capacity",
      "Vintage cart design with wheels",
      "Tempered glass panels",
      "Built-in warming light",
      "Easy to operate & clean",
    ],
    included: [
      "Popcorn machine",
      "Wheeled cart",
      "Popcorn scoop",
      "Oil measuring spoon",
      "3 serving cups",
      "Setup instructions",
    ],
    image: "/images/popcorn-machine.svg",
    badge: "Party Favorite",
  },
  {
    id: "play-balls",
    slug: "soft-plastic-play-balls",
    name: "Soft Plastic Play Balls for Kids",
    category: "party-accessories",
    categoryLabel: "Party Accessories",
    dailyPrice: 50,
    buyPrice: 149,
    description:
      "Add a splash of color to any bounce house or play area with our premium soft play balls! These crush-proof, non-toxic sensory balls come in a vibrant mix of colors that kids can't resist. Perfect for ball pits, bounce houses, or sensory play areas. Made from durable, BPA-free plastic that's safe for even the youngest players.",
    shortDescription:
      "Colorful crush-proof, non-toxic play balls — perfect for ball pits and sensory play areas.",
    dimensions: "2.75 in diameter each",
    length: "2.75 in",
    width: "2.75 in",
    height: "2.75 in",
    ageRange: "All ages",
    capacity: "Set of 200+ balls",
    sku: "SOF-6C477001",
    features: [
      "Crush-proof durable design",
      "Non-toxic BPA-free plastic",
      "Vibrant mixed colors",
      "Perfect for ball pits & bounce houses",
      "Sensory play friendly",
      "Easy to clean & sanitize",
    ],
    included: [
      "200+ soft play balls",
      "Storage mesh bag",
    ],
    image: "/images/play-balls.svg",
  },
  {
    id: "folding-chair",
    slug: "white-folding-chair",
    name: "White Folding Chair",
    category: "party-accessories",
    categoryLabel: "Party Accessories",
    dailyPrice: 2.5,
    buyPrice: 29,
    description:
      "Complete your event setup with our sturdy white folding chairs. Rated to hold up to 350 lbs, these commercial-grade chairs feature a reinforced steel frame and comfortable contoured seat. The classic white design complements any event theme, and the stackable construction makes storage and transport effortless. Perfect for parties, ceremonies, and community events.",
    shortDescription:
      "Commercial-grade white folding chair — sturdy 350 lb rated with reinforced steel frame.",
    dimensions: "L17 x W17 x H31 in",
    length: "17 in",
    width: "17 in",
    height: "31 in",
    ageRange: "All ages",
    capacity: "1 person (350 lb rating)",
    sku: "WHI-A78428EC",
    features: [
      "350 lb weight capacity",
      "Reinforced steel frame",
      "Comfortable contoured seat",
      "Stackable design",
      "Non-scratch foot caps",
      "Easy to clean",
    ],
    included: ["Folding chair"],
    image: "/images/folding-chair.svg",
  },
];

export function getProductsByCategory(category: Product["category"]) {
  return products.filter((p) => p.category === category);
}

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}

export const categories = [
  { id: "bounce-houses" as const, label: "Bounce Houses", icon: "castle" },
  { id: "water-slides" as const, label: "Water Slides", icon: "waves" },
  { id: "party-accessories" as const, label: "Party Accessories", icon: "party" },
];
