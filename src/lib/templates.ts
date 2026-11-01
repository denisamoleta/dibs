export type Template = {
  id: string
  emoji: string
  name: string
  blurb: string
  titlePlaceholder: string
  descriptionPlaceholder: string
  allowWriteIns: boolean
  items: { title: string; slots: number; note?: string }[]
}

export const TEMPLATES: Template[] = [
  {
    id: "potluck",
    emoji: "🥘",
    name: "Potluck",
    blurb: "Mains, sides, desserts — no five bowls of pasta salad.",
    titlePlaceholder: "Friendsgiving at Maya's",
    descriptionPlaceholder: "Bring your dish ready to serve. We have an oven if you need to reheat!",
    allowWriteIns: true,
    items: [
      { title: "Main dish", slots: 3 },
      { title: "Side dish", slots: 3 },
      { title: "Salad", slots: 2 },
      { title: "Dessert", slots: 3 },
      { title: "Drinks", slots: 2 },
      { title: "Plates, cups & napkins", slots: 1 },
      { title: "Ice", slots: 1 },
    ],
  },
  {
    id: "volunteers",
    emoji: "🙋",
    name: "Volunteer shifts",
    blurb: "Fill every shift for the fair, drive or cleanup day.",
    titlePlaceholder: "Spring Fair volunteers",
    descriptionPlaceholder: "Check in at the welcome tent 10 minutes before your shift. Thank you!",
    allowWriteIns: false,
    items: [
      { title: "Setup · 8–9 AM", slots: 4 },
      { title: "Morning shift · 9 AM–12 PM", slots: 5 },
      { title: "Afternoon shift · 12–3 PM", slots: 5 },
      { title: "Cleanup · 3–4 PM", slots: 4 },
    ],
  },
  {
    id: "meal-train",
    emoji: "🍲",
    name: "Meal train",
    blurb: "Feed a friend after a new baby, surgery or a hard week.",
    titlePlaceholder: "Meals for the Garcia family",
    descriptionPlaceholder:
      "Drop-off 5–6 PM at the front porch cooler. Family of 4, no nuts please. Disposable containers are perfect!",
    allowWriteIns: false,
    items: [
      { title: "Dinner · Monday", slots: 1 },
      { title: "Dinner · Tuesday", slots: 1 },
      { title: "Dinner · Wednesday", slots: 1 },
      { title: "Dinner · Thursday", slots: 1 },
      { title: "Dinner · Friday", slots: 1 },
      { title: "Groceries run", slots: 1 },
    ],
  },
  {
    id: "team-snacks",
    emoji: "⚽",
    name: "Team snacks",
    blurb: "One family per game. Done for the whole season.",
    titlePlaceholder: "Tigers U10 snack schedule",
    descriptionPlaceholder: "Orange slices + water are always a win. Please check the allergy list!",
    allowWriteIns: false,
    items: Array.from({ length: 8 }, (_, i) => ({ title: `Game ${i + 1}`, slots: 1 })),
  },
  {
    id: "class-party",
    emoji: "🎉",
    name: "Class party",
    blurb: "Supplies, treats and helpers for the classroom.",
    titlePlaceholder: "Room 12 winter party",
    descriptionPlaceholder: "Party starts at 2 PM. Store-bought treats only, please.",
    allowWriteIns: true,
    items: [
      { title: "Cups, plates & napkins", slots: 1 },
      { title: "Juice boxes", slots: 2 },
      { title: "Fruit tray", slots: 1 },
      { title: "Cookies or cupcakes", slots: 2 },
      { title: "Craft supplies", slots: 1 },
      { title: "Party helpers", slots: 3 },
    ],
  },
  {
    id: "moving-day",
    emoji: "📦",
    name: "Moving day",
    blurb: "Friends, a van and pizza — coordinated.",
    titlePlaceholder: "Help Sam move!",
    descriptionPlaceholder: "Starting at 9 AM. Wear comfy shoes — pizza and drinks on me.",
    allowWriteIns: true,
    items: [
      { title: "Lifting help · morning", slots: 4 },
      { title: "Lifting help · afternoon", slots: 3 },
      { title: "Van or truck", slots: 1 },
      { title: "Boxes & tape", slots: 1 },
      { title: "Cleaning crew", slots: 2 },
    ],
  },
]

export const BLANK_TEMPLATE: Template = {
  id: "blank",
  emoji: "✏️",
  name: "Start from scratch",
  blurb: "Your list, your rules.",
  titlePlaceholder: "What are we organizing?",
  descriptionPlaceholder: "Anything people should know?",
  allowWriteIns: false,
  items: [{ title: "", slots: 1 }],
}

export function getTemplate(id: string | null | undefined): Template {
  return TEMPLATES.find((t) => t.id === id) ?? BLANK_TEMPLATE
}
