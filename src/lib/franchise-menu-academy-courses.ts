export type FranchiseAcademyCourseStatus =
  | "mandatory"
  | "in_progress"
  | "not_started";

export type FranchiseAcademyLifecycleStatus = "live" | "draft";

export type FranchiseAcademyModuleStatus =
  | "in_progress"
  | "not_started"
  | "completed";

export type FranchiseAcademyCourseModule = {
  id: string;
  title: string;
  subtitle: string;
  status?: FranchiseAcademyModuleStatus;
};

export type FranchiseAcademyCourse = {
  id: string;
  title: string;
  category: string;
  image: string;
  gradient: string;
  status: FranchiseAcademyCourseStatus;
  progress?: number;
  description: string;
  lifecycleStatus: FranchiseAcademyLifecycleStatus;
  enrolledAt?: string;
  tags: string[];
  modules: FranchiseAcademyCourseModule[];
};

function buildDefaultModules(title: string): FranchiseAcademyCourseModule[] {
  return [
    {
      id: "recipe",
      title: `Recipe - ${title}`,
      subtitle: `Recipe - ${title}`,
    },
    {
      id: "video",
      title: `Recipe Video - ${title}`,
      subtitle: `Recipe Video - ${title}`,
      status: "in_progress",
    },
  ];
}

function buildCourse(
  course: Omit<FranchiseAcademyCourse, "description" | "lifecycleStatus" | "tags" | "modules"> & {
    description?: string;
    lifecycleStatus?: FranchiseAcademyLifecycleStatus;
    enrolledAt?: string;
    tags?: string[];
    modules?: FranchiseAcademyCourseModule[];
  },
): FranchiseAcademyCourse {
  return {
    description: `Training module for ${course.title} covering preparation standards and quality checks.`,
    lifecycleStatus: "live",
    tags: [],
    modules: buildDefaultModules(course.title),
    ...course,
  };
}

export const FRANCHISE_MENU_ACADEMY_COURSES: FranchiseAcademyCourse[] = [
  buildCourse({
    id: "1",
    title: "Crispy Chicken Preparation",
    category: "01 FRIED CHICKEN",
    image: "/manus-storage/crispyroastporkbanhmi_ce355122.jpg",
    gradient: "from-primary/10 to-card",
    status: "in_progress",
    progress: 72,
    enrolledAt: "18-06-2026 09:42",
    tags: ["CHICKEN", "FRIED"],
  }),
  buildCourse({
    id: "2",
    title: "Grilled Lemongrass Chicken",
    category: "02 GRILLED CHICKEN",
    image: "/manus-storage/banh-mi-2_7d02846f.jpg",
    gradient: "from-brand-amber/20 to-card",
    status: "mandatory",
    progress: 35,
    enrolledAt: "20-06-2026 14:05",
    tags: ["GRILLED", "CHICKEN"],
  }),
  buildCourse({
    id: "3",
    title: "Korean BBQ Bowl Assembly",
    category: "03 KOREAN CLASSICS",
    image: "/manus-storage/pho-2_4fc44f9f.jpg",
    gradient: "from-primary/5 to-secondary",
    status: "in_progress",
    progress: 58,
    enrolledAt: "22-06-2026 11:20",
    tags: ["KOREAN", "BOWL"],
  }),
  buildCourse({
    id: "4",
    title: "Delights Combo Standards",
    category: "04 DELIGHTS",
    image: "/manus-storage/spring-rolls-1_02f22814.jpg",
    gradient: "from-brand-amber/15 to-card",
    status: "mandatory",
    progress: 12,
    enrolledAt: "23-06-2026 08:15",
    tags: ["DELIGHTS", "COMBO"],
  }),
  buildCourse({
    id: "5",
    title: "Signature Burger Build",
    category: "05 BURGERS",
    image: "/manus-storage/catering-hero-counter_71eb7271.jpg",
    gradient: "from-primary/8 to-brand-cream",
    status: "in_progress",
    progress: 90,
    enrolledAt: "21-06-2026 16:30",
    tags: ["BURGERS", "SIGNATURE"],
  }),
  buildCourse({
    id: "6",
    title: "Kids Meal Portion Guide",
    category: "06 KID'S",
    image: "/manus-storage/SaigonFeastBox_6c26a5d8.jpg",
    gradient: "from-secondary to-card",
    status: "not_started",
    tags: ["KIDS"],
  }),
  {
    id: "7",
    title: "GBM015 Lemonade",
    category: "07 BEVERAGE",
    image: "/manus-storage/wholesale-restaurant-counter_2d79d665.jpg",
    gradient: "from-brand-amber/10 to-card",
    status: "mandatory",
    progress: 44,
    description:
      "Lemon Juice, Sugar Syrup, and soda water with a slice of lemon and lime as a finish.",
    lifecycleStatus: "live",
    enrolledAt: "24-06-2026 12:18",
    tags: ["DRINKS", "BEVERAGE"],
    modules: [
      {
        id: "recipe",
        title: "Recipe - GBM015 Lemonade",
        subtitle: "Recipe - GBM015 Lemonade",
      },
      {
        id: "video",
        title: "Recipe Video - GBM015 Lemonade",
        subtitle: "Recipe Video - GBM015 Lemonade",
        status: "in_progress",
      },
    ],
  },
  buildCourse({
    id: "8",
    title: "Q1 2025 Menu Rollout",
    category: "*New Menu - Q1 2025*",
    image:
      "/manus-storage/saigo_express__Vietnamese_Roasted_pork_baguette_Native_81be063f.jpg",
    gradient: "from-primary/12 to-card",
    status: "mandatory",
    progress: 8,
    enrolledAt: "15-06-2026 10:00",
    tags: ["NEW MENU"],
  }),
  buildCourse({
    id: "9",
    title: "Pho Broth Fundamentals",
    category: "03 KOREAN CLASSICS",
    image: "/manus-storage/pho-2_4fc44f9f.jpg",
    gradient: "from-brand-amber/18 to-secondary",
    status: "in_progress",
    progress: 66,
    enrolledAt: "19-06-2026 13:45",
    tags: ["PHO", "BROTH"],
  }),
  buildCourse({
    id: "10",
    title: "Spring Roll Plating",
    category: "04 DELIGHTS",
    image: "/manus-storage/spring-rolls-1_02f22814.jpg",
    gradient: "from-primary/6 to-brand-cream",
    status: "in_progress",
    progress: 51,
    enrolledAt: "17-06-2026 15:22",
    tags: ["SPRING ROLLS", "PLATING"],
  }),
];

export function getFranchiseMenuAcademyCourse(
  courseId: string,
): FranchiseAcademyCourse | undefined {
  return FRANCHISE_MENU_ACADEMY_COURSES.find((course) => course.id === courseId);
}
