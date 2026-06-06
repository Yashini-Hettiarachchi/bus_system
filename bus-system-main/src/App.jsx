// BusSync — main React component.
// Contains the full application UI: language switcher, tab bar, news feed,
// movie listing, PWA install prompt, and the bus passenger feedback game.
import { useEffect, useRef, useState } from "react";

import "./App.css"; // All component styles (gq-* game classes, layout, cards)

// ─── Static data ──────────────────────────────────────────────────────────────

// Language choices shown as tab buttons at the top of the page
const LANGUAGE_OPTIONS = [
  { id: "en", label: "English" },
  { id: "si", label: "සිංහල" },
];

// Main content tabs: News feed and Movie listing
const TAB_OPTIONS = [
  { id: "news", label: "News" },
  { id: "movie", label: "Movie" },
  { id: "category", label: "Category" }, // Added category tab
];

// 10 bilingual feedback questions about the bus entertainment system.
// Each question has an id (1–10), bilingual question text, and 4 bilingual
// answers. The id is also used as the sheet column key (q1–q10).
const BUS_GAME_QUESTIONS = [
  {
    id: 1,
    question: {
      en: "How would you rate your overall experience with the new bus entertainment system today?",
      si: "අද නව බස් විනෝදාස්වාද පද්ධතිය සමඟ ඔබගේ සමස්ත අත්දැකීම ඔබ කෙසේ මැප්පිලි කරන්නේද?",
    },
    answers: {
      en: ["Excellent", "Good", "Average", "Needs improvement"],
      si: ["විශිෂ්ටයි", "හොඳයි", "සාමාන්‍යයි", "වැඩිදියුණු කළ යුතුයි"],
    },
  },
  {
    id: 2,
    question: {
      en: "What is your current mood during this trip?",
      si: "මෙම ගමන අතරතුර ඔබගේ දැන් මනෝභාවය කෙසේද?",
    },
    answers: {
      en: ["Relaxed", "Excited", "Tired", "A bit bored"],
      si: ["සන්සුන්", "උද්යෝගිමත්", "වෙහෙසී", "ටිකක් බෝරින්"],
    },
  },
  {
    id: 3,
    question: {
      en: "Which feature of the entertainment system are you using the most right now?",
      si: "දැන් ඔබ වැඩිපුරම භාවිතා කරන්නේ විනෝදාස්වාද පද්ධතියේ කුමන විශේෂාංගයද?",
    },
    answers: {
      en: ["Movies", "Videos", "News updates", "Other"],
      si: ["චිත්‍රපට", "වීඩියෝ", "පුවත් යාවත්කාලීන", "වෙනත්"],
    },
  },
  {
    id: 4,
    question: {
      en: "Are you traveling alone or with someone today?",
      si: "අද ඔබ තනිවමද, නැත්නම් කෙනෙකු සමඟද ගමන් කරන්නේ?",
    },
    answers: {
      en: ["Alone", "With family", "With friends", "Others"],
      si: ["තනිවම", "පවුල සමඟ", "මිතුරන් සමඟ", "වෙනත්"],
    },
  },
  {
    id: 5,
    question: {
      en: "Did the new system make this journey feel more enjoyable for you?",
      si: "නව පද්ධතිය මෙම ගමන ඔබට තවත් විනෝදජනක බවක් දැනෙන්න උදව් කළාද?",
    },
    answers: {
      en: ["Yes, definitely", "A little", "Not much", "Not at all"],
      si: ["ඔව්, අනිවාර්යයෙන්", "ටිකක්", "ගොඩක් නැහැ", "කිසිසේත් නැහැ"],
    },
  },
  {
    id: 6,
    question: {
      en: "Was it easy to understand and use the entertainment screen or controls?",
      si: "විනෝදාස්වාද තිරය හෝ පාලක භාවිතා කිරීම තේරුම් ගැනීමට සහ භාවිතා කිරීමට පහසුද?",
    },
    answers: {
      en: ["Very easy", "Mostly easy", "A bit confusing", "Difficult"],
      si: ["ඉතා පහසුයි", "බොහෝවිට පහසුයි", "ටිකක් ගැටලුකාරීයි", "අමාරුයි"],
    },
  },
  {
    id: 7,
    question: {
      en: "What kind of content would you like to see more of on the bus system?",
      si: "බස් පද්ධතිය තුළ ඔබට වැඩිපුර දැකීමට අවශ්‍ය අන්තර්ගත වර්ගය කුමක්ද?",
    },
    answers: {
      en: ["Movies", "Music playlists", "Local news", "Travel tips"],
      si: ["චිත්‍රපට", "සංගීත ලැයිස්තු", "දේශීය පුවත්", "ගමන් උපදෙස්"],
    },
  },
  {
    id: 8,
    question: {
      en: "Did the audio, display, and connection quality feel good enough during the ride?",
      si: "ගමන අතරතුර ශබ්දය, තිරය සහ සම්බන්ධතා ගුණාත්මකභාවය ප්‍රමාණවත් ලෙස හොඳ බව දැනුණාද?",
    },
    answers: {
      en: ["All were good", "Display was best", "Audio needs work", "Connection needs work"],
      si: ["සියල්ල හොඳයි", "තිරය හොඳම", "ශබ්දය වැඩිදියුණු විය යුතුයි", "සම්බන්ධතාව වැඩිදියුණු විය යුතුයි"],
    },
  },
  {
    id: 9,
    question: {
      en: "What one improvement would make the entertainment system better for future trips?",
      si: "ඉදිරි ගමන් සඳහා විනෝදාස්වාද පද්ධතිය වඩා හොඳ කිරීමට එක් වැඩිදියුණු කිරීමක් කුමක්ද?",
    },
    answers: {
      en: ["Faster response", "More content", "Better sound", "Simpler controls"],
      si: ["වේගවත් ප්‍රතිචාර", "වැඩි අන්තර්ගත", "වඩා හොඳ ශබ්දය", "සරල පාලක"],
    },
  },
  {
    id: 10,
    question: {
      en: "Would you want to use this entertainment system again on your next bus ride?",
      si: "ඔබගේ ඊළඟ බස් ගමනේදී මෙම විනෝදාස්වාද පද්ධතිය නැවත භාවිතා කිරීමට ඔබ කැමතිද?",
    },
    answers: {
      en: ["Yes", "Maybe", "Only with improvements", "No"],
      si: ["ඔව්", "සමහරවිට", "වැඩිදියුණු කළහොත් පමණයි", "නැහැ"],
    },
  },
];

const FEATURED_CATEGORY_MAP = {
  si: [
    {
      name: "ක්‍රීඩා",
      keywords: [
        "ක්‍රීඩා",
        "ක්‍රිකට්",
        "පන්දුව",
        "පාපන්දු",
        "තරඟය",
        "ඔලිම්පික්",
        "ක්‍රීඩකයා",
      ],
    },
    {
      name: "ව්‍යාපාර",
      keywords: [
        "ව්‍යාපාර",
        "වෙළඳපොළ",
        "කොටස්",
        "මුදල්",
        "ආර්ථිකය",
        "වෙළඳාම",
        "සමාගම",
        "ආයෝජනය",
      ],
    },
    {
      name: "කෘෂිකර්මය",
      keywords: [
        "කෘෂිකර්මය",
        "ගොවිතැන",
        "ගොවියා",
        "බෝග",
        "අස්වනු",
        "වගා",
        "තේ",
        "රබර්",
      ],
    },
    {
      name: "දේශපාලන",
      keywords: [
        "දේශපාලන",
        "රජය",
        "අමාත්‍ය",
        "පාර්ලිමේන්තුව",
        "මැතිවරණය",
        "නීති",
        "ජනාධිපති",
        "අග්‍රාමාත්‍ය",
      ],
    },
    {
      name: "සෞඛ්‍ය",
      keywords: [
        "සෞඛ්‍ය",
        "රෝහල",
        "වෛද්‍ය",
        "කොවිඩ්",
        "රෝගය",
        "ඖෂධ",
        "ටිකා",
      ],
    },
    {
      name: "අධ්‍යාපනය",
      keywords: [
        "අධ්‍යාපනය",
        "පාසල",
        "විශ්වවිද්‍යාලය",
        "ශිෂ්‍යයා",
        "පරීක්ෂණය",
        "ගුරු",
        "උපාධිය",
      ],
    },
    {
      name: "තාක්ෂණය",
      keywords: [
        "තාක්ෂණය",
        "සොෆ්ට්වෙයාර්",
        "හාර්ඩ්වෙයාර්",
        "අන්තර්ජාලය",
        "ඉන්ටර්නෙට්",
        "රොබෝ",
        "පරිගණකය",
        "යෙදුම",
      ],
    },
    {
      name: "පරිසරය",
      keywords: [
        "පරිසරය",
        "කාලගුණය",
        "වර්ෂාව",
        "පිටාර",
        "වනාන්තරය",
        "දූෂණය",
        "වනජීවී",
      ],
    },
    {
      name: "අපරාධ",
      keywords: [
        "අපරාධ",
        "පොලිසිය",
        "අත්අඩංගුව",
        "අධිකරණය",
        "ඝාතනය",
        "මංකොල්ලය",
        "වංචාව",
        "පරීක්ෂණය",
      ],
    },
  ],
  en: [
    {
      name: "Sports",
      keywords: [
        "sport",
        "cricket",
        "football",
        "match",
        "tournament",
        "olympic",
        "athlete",
      ],
    },
    {
      name: "Business",
      keywords: [
        "business",
        "market",
        "stock",
        "finance",
        "economy",
        "trade",
        "company",
        "shares",
        "investment",
      ],
    },
    {
      name: "Agriculture",
      keywords: [
        "agriculture",
        "farming",
        "farmer",
        "crop",
        "harvest",
        "plantation",
        "paddy",
        "tea",
        "rubber",
      ],
    },
    {
      name: "Politics",
      keywords: [
        "politic",
        "government",
        "minister",
        "parliament",
        "election",
        "policy",
        "president",
        "prime minister",
      ],
    },
    {
      name: "Health",
      keywords: [
        "health",
        "hospital",
        "doctor",
        "covid",
        "disease",
        "medicine",
        "vaccine",
        "medical",
      ],
    },
    {
      name: "Education",
      keywords: [
        "education",
        "school",
        "university",
        "student",
        "exam",
        "teacher",
        "degree",
      ],
    },
    {
      name: "Technology",
      keywords: [
        "tech",
        "technology",
        "software",
        "hardware",
        "internet",
        "ai",
        "robot",
        "computer",
        "app",
      ],
    },
    {
      name: "Environment",
      keywords: [
        "environment",
        "climate",
        "weather",
        "rain",
        "flood",
        "drought",
        "wildlife",
        "forest",
        "pollution",
      ],
    },
    {
      name: "Crime",
      keywords: [
        "crime",
        "police",
        "arrest",
        "court",
        "murder",
        "theft",
        "fraud",
        "investigation",
      ],
    },
  ],
};

const buildFeaturedCategoryEntries = (articleList, language) => {
  const categoryMap =
    language === "si" ? FEATURED_CATEGORY_MAP.si : FEATURED_CATEGORY_MAP.en;
  const categorized = {};

  articleList.forEach((article) => {
    const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();
    for (const category of categoryMap) {
      if (category.keywords.some((keyword) => text.includes(keyword))) {
        if (!categorized[category.name]) {
          categorized[category.name] = [];
        }
        categorized[category.name].push(article);
        break;
      }
    }
  });

  const entries = Object.entries(categorized);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries;
};

const getCleanSourceName = (sourceName) => {
  const normalized = (sourceName || "").trim();
  if (!normalized) {
    return "";
  }

  // Hide machine-like producer IDs (hex/UUID-ish tokens) from UI.
  const isHexLike = /^[a-f0-9]{8,}$/i.test(normalized);
  const isUuidLike = /^[a-f0-9]{8}-[a-f0-9-]{8,}$/i.test(normalized);
  const isTokenLike = /^[a-z0-9-]{10,}$/i.test(normalized) && /\d/.test(normalized);

  if (isHexLike || isUuidLike || isTokenLike) {
    return "";
  }

  return normalized;
};

const LOCAL_TO_SHEET_KEY_MAP = {
  en: {
    "Sports": "Sports",
    "Business": "Business",
    "Agriculture": "Agriculture",
    "Politics": "Politics",
    "Health": "Health",
    "Education": "Education",
    "Technology": "Techno",
    "Environment": "Environment",
    "Crime": "Crime"
  },
  si: {
    "ක්‍රීඩා": "Sports",
    "ව්‍යාපාර": "Business",
    "කෘෂිකර්මය": "Agriculture",
    "දේශපාලන": "Politics",
    "සෞඛ්‍ය": "Health",
    "අධ්‍යාපනය": "Education",
    "තාක්ෂණය": "Techno",
    "පරිසරය": "Environment",
    "අපරාධ": "Crime"
  }
};

const SHEET_KEY_TO_LOCAL_MAP = {
  en: {
    Sports: "Sports",
    Business: "Business",
    Agriculture: "Agriculture",
    Politics: "Politics",
    Health: "Health",
    Education: "Education",
    Techno: "Technology",
    Environment: "Environment",
    Crime: "Crime"
  },
  si: {
    Sports: "ක්‍රීඩා",
    Business: "ව්‍යාපාර",
    Agriculture: "කෘෂිකර්මය",
    Politics: "දේශපාලන",
    Health: "සෞඛ්‍ය",
    Education: "අධ්‍යාපනය",
    Techno: "තාක්ෂණය",
    Environment: "පරිසරය",
    Crime: "අපරාධ"
  }
};

function App() {
  // Stable session id so multiple answer updates can target the same sheet row.
  // Persisted in localStorage to survive refreshes while the user is mid-survey.
  const getOrCreateSessionId = () => {
    const key = "bus_feedback_session_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, generated);
    return generated;
  };

  const [latestNewsOpen, setLatestNewsOpen] = useState(false);
  const [featuredNewsOpen, setFeaturedNewsOpen] = useState(false); // Expand/collapse Featured News card
  // ─── State ──────────────────────────────────────────────────────────────────
  const [language, setLanguage] = useState("en");   // Active language: "en" | "si"
  const [tab, setTab] = useState("news");           // Active main tab: "news" | "movie"
  const [articles, setArticles] = useState([]);     // News articles loaded from /api/news
  const [movies, setMovies] = useState([]);         // Movies loaded from /api/movies
  const [loading, setLoading] = useState(true);     // True while news fetch is in flight
  const [error, setError] = useState("");           // Error message string for the news feed
  const [moviesLoading, setMoviesLoading] = useState(false);  // True while movies fetch is in flight
  const [moviesError, setMoviesError] = useState("");         // Error message string for movies
  const [installEvent, setInstallEvent] = useState(null);          // Stored beforeinstallprompt event
  const [showInstallPrompt, setShowInstallPrompt] = useState(false); // Show/hide PWA install banner
  const [showGameName, setShowGameName] = useState(false); // Show game icon after user scrolls news
  const [showBus, setShowBus] = useState(false);           // Open/close the bus feedback modal
  const [activeBusQuestion, setActiveBusQuestion] = useState(null); // Currently open question id (1–10)
  const [busAnswers, setBusAnswers] = useState({});    // Map of questionId → selected answer string
  const [submitStatus, setSubmitStatus] = useState("idle"); // "idle" | "sending" | "done" | "error"
  const [feedbackSessionId] = useState(() => getOrCreateSessionId());
  const [categoryPrompt, setCategoryPrompt] = useState(null);
  const [categoryAsked, setCategoryAsked] = useState({});
  const [categoryInterest, setCategoryInterest] = useState({});
  const [prefsDb, setPrefsDb] = useState({});
  const categoryBlockRefs = useRef({});

  // Ref for the scrollable news section — used to detect scroll position
  const newsSectionRef = useRef(null);

  // ─── Google Sheet submission ──────────────────────────────────────────────────
  // Builds a plain payload with stable columns q1..q10 so each answer lands
  // in a dedicated Google Sheet column.
  const buildFeedbackPayload = (answersMap) => {
    const payload = {
      language,
      sessionId: feedbackSessionId,
      gasUrl: import.meta.env.VITE_GAS_URL || "",
    };

    BUS_GAME_QUESTIONS.forEach((q) => {
      payload[`q${q.id}`] = answersMap[q.id] || "";
    });

    return payload;
  };

  // Sends feedback payload to our own API route, which then forwards it to GAS.
  // This avoids browser no-cors blind spots and lets us detect failures.
  const postFeedback = async (payload) => {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Feedback save failed");
    }
  };

  // Sends all current answers to the Google Sheet endpoint.
  // Called on each answer selection so values are saved one-by-one.
  const saveProgress = async (answersMap) => {
    const payload = buildFeedbackPayload(answersMap);
    await postFeedback(payload);
  };

  // Sends the full answer set to the same API route as a final explicit submit.
  const submitFeedback = async () => {
    setSubmitStatus("sending");
    try {
      // Final save of the complete answer map before showing success state.
      const payload = buildFeedbackPayload(busAnswers);
      await postFeedback(payload);
      setSubmitStatus("done"); // Treat resolved fetch as success
    } catch {
      setSubmitStatus("error"); // Network-level failure (offline, DNS error, etc.)
    }
  };

  const saveCategoryInterest = async (categoryName, value) => {
    const reverseMap = LOCAL_TO_SHEET_KEY_MAP[language];
    const sheetKey = reverseMap ? reverseMap[categoryName] : null;

    if (sheetKey) {
      const updatedPrefs = {
        ...prefsDb,
        [sheetKey]: value,
      };
      setPrefsDb(updatedPrefs);

      try {
        await fetch("/api/category-prefs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedPrefs),
        });
      } catch (err) {
        console.error("Failed to save category preference:", err);
      }
    } else {
      setCategoryInterest((current) => ({
        ...current,
        [categoryName]: value,
      }));
    }
  };

  // ─── Derived state ───────────────────────────────────────────────────────────
  // Full question object for the currently active question id (or undefined)
  const selectedBusQuestion = BUS_GAME_QUESTIONS.find(
    (item) => item.id === activeBusQuestion,
  );
  // 0-based index of the active question — used for Previous/Next boundary checks
  const activeQuestionIndex = BUS_GAME_QUESTIONS.findIndex(
    (item) => item.id === activeBusQuestion,
  );
  // Highlight the next expected number on the bus (first unanswered question).
  const nextBusQuestionId =
    BUS_GAME_QUESTIONS.find((item) => !busAnswers[item.id])?.id ?? null;
  const getBusButtonClassName = (baseClassName, questionId) =>
    `gq-number-button ${baseClassName}${
      nextBusQuestionId === questionId ? " gq-number-button-active" : ""
    }`;
  const featuredCategoryEntries = buildFeaturedCategoryEntries(articles, language);
  const hasInterestedCategories = Object.values(categoryInterest).some(
    (value) => value === true,
  );
  const visibleFeaturedCategoryEntries = featuredCategoryEntries.filter(
    ([category]) =>
      hasInterestedCategories
        ? categoryInterest[category] === true
        : categoryInterest[category] !== false,
  );

  const createCategoryPromptState = (category, categoryArticles) => ({
    category,
    latestArticle: categoryArticles[0],
    suggestedArticle: categoryArticles[1] || categoryArticles[0],
    step: "viewed",
  });

  const openCategoryBusPrompt = (category = null, categoryArticles = null) => {
    setCategoryPrompt({
      category,
      latestArticle: categoryArticles?.[0] || null,
      suggestedArticle: categoryArticles?.[1] || categoryArticles?.[0] || null,
      step: "bus",
    });
  };

  const setCategoryBlockRef = (category, node) => {
    if (node) {
      categoryBlockRefs.current[category] = node;
      return;
    }

    delete categoryBlockRefs.current[category];
  };

  const openCategoryPrompt = (category, categoryArticles) => {
    if (!categoryArticles || categoryArticles.length === 0) {
      return;
    }

    setCategoryAsked((current) => ({
      ...current,
      [category]: true,
    }));
    setCategoryPrompt(createCategoryPromptState(category, categoryArticles));
  };

  const openNextCategoryPrompt = (currentCategory) => {
    const currentIndex = visibleFeaturedCategoryEntries.findIndex(
      ([category]) => category === currentCategory,
    );

    if (currentIndex === -1) {
      setCategoryPrompt(null);
      return;
    }

    const nextEntry = visibleFeaturedCategoryEntries[currentIndex + 1];
    if (!nextEntry) {
      setCategoryPrompt(null);
      return;
    }

    const [nextCategory, nextArticles] = nextEntry;
    setCategoryPrompt(createCategoryPromptState(nextCategory, nextArticles));
  };

  const categoryPromptCopy = {
    title: language === "si" ? "ඉක්මන් ප්‍රශ්නයක්" : "Quick Question",
    chooseCategory:
      language === "si"
        ? "බස් මත කාණ්ඩයක් තෝරා ඉක්මනින් මාරු වන්න"
        : "Pick a category on the bus to switch quickly",
    questionPrefix:
      language === "si"
        ? "ඔබ"
        : "Have you viewed the latest",
    questionSuffix:
      language === "si"
        ? "කාණ්ඩයේ නවතම පුවත බැලුවාද?"
        : "news?",
    yesViewed: language === "si" ? "ඔව්, බැලුවා" : "Yes, I viewed it",
    noViewed: language === "si" ? "නැහැ, තවම නැහැ" : "Not yet",
    interestQuestion:
      language === "si"
        ? "ඔබ මෙම කාණ්ඩයට ඇත්තටම උනන්දුවක් දක්වන්නේද?"
        : "Are you interested in this category?",
    interestedYes: language === "si" ? "ඔව්, උනන්දුව ඇත" : "Yes, interested",
    interestedNo: language === "si" ? "නැහැ, ඉවත් කරන්න" : "No, hide this category",
    nextCategory: language === "si" ? "ඊළඟ කාණ්ඩය" : "Next category",
    noCategoryLeft:
      language === "si"
        ? "ඔබගේ තේරීම් අනුව පෙන්වීමට කාණ්ඩ නැත."
        : "No categories left based on your interests.",
    selectCategoryFirst:
      language === "si"
        ? "පළමුව බස් එකෙන් කාණ්ඩයක් තෝරන්න."
        : "First, choose a category from the bus.",
    backToBus: language === "si" ? "බස් එකට ආපසු" : "Back to bus",
    close: language === "si" ? "වසන්න" : "Close",
  };
// quickCategoryBusSlots will be defined later to align with ALL_CATEGORIES

  const formatQuickCategoryLabel = (category) => {
    if (!category) {
      return "";
    }
    return category.length > 16 ? `${category.slice(0, 15)}…` : category;
  };
  const quickBusFillerItems =
    language === "si"
      ? [
          "✨ ඉදිරියට යමු",
          "😊 සුබ දවසක්",
          "🌈 හොඳ අදහස්",
          "🚀 ශක්තිමත් වන්න",
          "🎯 ඉලක්කයට",
          "💡 නව අදහසක්",
        ]
      : [
          "✨ Keep going",
          "😊 Have a great day",
          "🌈 Stay positive",
          "🚀 Keep moving",
          "🎯 Focus mode",
          "💡 Fresh idea",
        ];

  const getQuickBusFiller = (index) =>
    quickBusFillerItems[index % quickBusFillerItems.length];

  const categoryChartPalette = [
    "#0d6fb4",
    "#1ca07f",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#f97316",
    "#22c55e",
    "#3b82f6",
    "#e11d48",
  ];

  // Define all categories that should appear in the chart
  const ALL_CATEGORIES = ["Crime", "Health", "Sports", "Techno"]; 

  // Build quickCategoryBusSlots using visibleFeaturedCategoryEntries to match Category News
  const quickCategoryBusSlots = visibleFeaturedCategoryEntries.map(([category, categoryArticles]) => ({ category, categoryArticles }));

  const getQuickCategorySlot = (index) => quickCategoryBusSlots[index] || null;

  // Build chart data for every category, using stored preferences if available.
  const categoryPreferenceChartData = ALL_CATEGORIES.map((category, index) => {
    const preference = categoryInterest[category];
    // Score is 1 for interested (true), 0 otherwise (including false, null, undefined)
    const score = preference === true ? 1 : 0;
    return {
      category,
      score,
      color: categoryChartPalette[index % categoryChartPalette.length],
    };
  });

  // Total score across all categories (may be 0 if no interests selected)
  const categoryPreferenceTotalScore = categoryPreferenceChartData.reduce(
    (sum, item) => sum + item.score,
    0,
  );

  // Convert scores to percentages; if totalScore is 0, all percentages become 0
  const categoryPreferencePercentages = categoryPreferenceChartData.map((item) => ({
    ...item,
    percentage: categoryPreferenceTotalScore > 0 ? (item.score / categoryPreferenceTotalScore) * 100 : 0,
  }));

  const categoryTabCopy = {
    title: language === "si" ? "කාණ්ඩ කැමතිකම් සාරාංශය" : "Category Preference Summary",
    subtitle:
      language === "si"
        ? "ප්‍රතිශතය ඔබ තෝරාගත් කාණ්ඩ කැමතිකම් අනුව ස්වයංක්‍රීයව යාවත්කාලීන වේ."
        : "Percentages update automatically based on your selected category preferences.",
    noData: language === "si" ? "චාට් එක සෑදීමට කාණ්ඩ දත්ත නොමැත." : "No category data available for chart.",
  };
  // All localised UI strings for the bus game, recomputed whenever language changes
  const busGameCopy = {
    headerLabel: language === "si" ? "බස් ප්‍රතිචාර ක්‍රීඩාව" : "Bus Feedback Game",
    headerSub:
      language === "si"
        ? activeBusQuestion
          ? "ප්‍රශ්නයට ගැලපෙන පිළිතුරක් තෝරන්න, ඊළඟට යන්න."
          : "අංකයක් තෝරා සම්පූර්ණ ප්‍රතිචාර කාඩ්පත විවෘත කරන්න."
        : activeBusQuestion
          ? "Choose the best answer, then move to the next or previous question."
          : "Tap a number to open that question in a full feedback card.",
    openQuestion: language === "si" ? "ප්‍රශ්නය විවෘත කරන්න" : "Open question",
    chooseAnswer: language === "si" ? "ඔබට ගැලපෙන පිළිතුර තෝරන්න" : "Choose the answer that fits you best",
    selectAnswer: language === "si" ? "පිළිතුර තෝරන්න" : "Select your answer",
    selectedPrefix: language === "si" ? "තෝරාගෙන ඇත්තේ:" : "Selected:",
    previous: language === "si" ? "← පෙර" : "← Previous",
    next: language === "si" ? "ඊළඟ →" : "Next →",
    backToNumbers: language === "si" ? "අංක වලට ආපසු" : "Back to numbers",
    submit: language === "si" ? "ප්‍රතිචාර ඉදිරිපත් කරන්න ✓" : "Submit Feedback ✓",
    submitting: language === "si" ? "යවමින්…" : "Sending…",
    doneTitle: language === "si" ? "ස්තූතියි! 🎉" : "Thank you! 🎉",
    doneMessage: language === "si" ? "ඔබේ ප්‍රතිචාර සාර්ථකව ලැබුණි. බස් සේවාව වැඩිදියුණු කිරීමට ඒවා භාවිතා කෙරේ." : "Your feedback has been recorded and will help improve the bus experience.",
    errorMessage: language === "si" ? "යැවීම අසාර්ථකයි. කරුණාකර නැවත උත්සාහ කරන්න." : "Could not save your feedback. Please try again.",
    retry: language === "si" ? "නැවත උත්සාහ කරන්න" : "Retry",
    close: language === "si" ? "වසන්න" : "Close",
  };
  // ─── Effects ─────────────────────────────────────────────────────────────────

  // Show the game icon only after the user has scrolled in the news section.
  // Hides again if the user switches away from the news tab.
  useEffect(() => {
    if (tab !== "news") return;
    const section = newsSectionRef.current;
    if (!section) return;
    const handleScroll = () => {
      setShowGameName(section.scrollTop > 0);
    };
    section.addEventListener("scroll", handleScroll);
    // Check initial position
    setShowGameName(section.scrollTop > 0);
    return () => { // Cleanup: remove listener on tab change or unmount
      section.removeEventListener("scroll", handleScroll);
    };
  }, [tab]);

  useEffect(() => {
    if (!featuredNewsOpen) {
      setCategoryPrompt(null);
      setCategoryAsked({});
      return;
    }

    // Once user has selected interested categories, stop auto-prompting.
    // Manual Next category flow should remain fully visible.
    if (hasInterestedCategories) {
      return;
    }

    if (visibleFeaturedCategoryEntries.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (categoryPrompt) {
          return;
        }

        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const category = entry.target.getAttribute("data-category");
          if (!category || categoryAsked[category] || categoryInterest[category] === false) {
            continue;
          }

          const matched = visibleFeaturedCategoryEntries.find(
            ([currentCategory]) => currentCategory === category,
          );

          if (!matched) {
            continue;
          }

          const [, categoryArticles] = matched;
          setCategoryAsked((current) => ({ ...current, [category]: true }));
          openCategoryBusPrompt(category, categoryArticles);
          break;
        }
      },
      {
        threshold: 0.65,
      },
    );

    visibleFeaturedCategoryEntries.forEach(([category]) => {
      const node = categoryBlockRefs.current[category];
      if (node) {
        observer.observe(node);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [
    featuredNewsOpen,
    visibleFeaturedCategoryEntries,
    categoryPrompt,
    categoryAsked,
    categoryInterest,
    hasInterestedCategories,
  ]);

  useEffect(() => {
    setCategoryPrompt(null);
    setCategoryAsked({});
  }, [language]);

  // Load category preferences from Google Sheets on mount
  useEffect(() => {
    async function loadCategoryPrefs() {
      try {
        const response = await fetch("/api/category-prefs");
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data === "object") {
            setPrefsDb(data);
          }
        }
      } catch (err) {
        console.error("Failed to load category preferences:", err);
      }
    }
    loadCategoryPrefs();
  }, []);

  // Sync prefsDb to categoryInterest whenever prefsDb or language changes
  useEffect(() => {
    const localizedInterest = {};
    const keyMap = SHEET_KEY_TO_LOCAL_MAP[language];
    if (keyMap) {
      Object.entries(prefsDb).forEach(([sheetKey, value]) => {
        const localName = keyMap[sheetKey];
        if (localName) {
          if (value === true || value === "true" || value === "Yes") {
            localizedInterest[localName] = true;
          } else if (value === false || value === "false" || value === "No") {
            localizedInterest[localName] = false;
          }
        }
      });
    }
    setCategoryInterest(localizedInterest);
  }, [prefsDb, language]);

  useEffect(() => {
    if (tab === "category") {
      setFeaturedNewsOpen(true);
      setLatestNewsOpen(false);
    }
  }, [tab]);

  // Capture the browser's PWA install prompt so we can show it at the right time.
  // preventDefault() suppresses the automatic mini-infobar on mobile Chrome.
  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();       // Prevent default mini-infobar
      setInstallEvent(event);       // Save the event for later use in installApp()
      setShowInstallPrompt(true);   // Show our custom install banner
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => { // Cleanup on unmount
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  // Fetch news articles whenever the active language changes.
  // Uses AbortController so in-flight requests are cancelled on quick language switches.
  useEffect(() => {
    const controller = new AbortController();

    async function loadNews() {
      setLoading(true);  // Show loading spinner
      setError("");      // Clear any previous error

      try {
        const response = await fetch(`/api/news?lang=${language}`, {
          signal: controller.signal, // Tie request to this controller so it can be aborted
        });

        const contentType = response.headers.get("content-type") || "";
        const bodyText = await response.text();

        // Reject non-JSON responses (e.g. Vercel HTML error pages)
        if (!contentType.includes("application/json")) {
          throw new Error("News API returned an invalid response. Please try again shortly.");
        }

        let payload;
        try {
          payload = JSON.parse(bodyText);
        } catch { // Malformed JSON — surface a friendly error
          throw new Error("News API returned malformed JSON. Please try again shortly.");
        }

        if (!response.ok) { // API-level error (4xx/5xx with JSON body)
          throw new Error(payload.error || "Failed to load headlines.");
        }

        setArticles(Array.isArray(payload.articles) ? payload.articles : []); // Guard against missing array
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") { // Ignore cancellations from language-switch
          setError(fetchError.message || "Unable to load headlines.");
          setArticles([]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadNews();

    return () => {
      controller.abort();
    };
  }, [language]);

  // Fetch movies when the user switches to the Movie tab (lazy load).
  // Also re-fetches when language changes so TMDB locale is updated.
  useEffect(() => {
    if (tab !== "movie") {
      return; // Do nothing while the Movie tab is not active
    }

    const controller = new AbortController();

    async function loadMovies() {
      setMoviesLoading(true);
      setMoviesError("");

      try {
        const response = await fetch(`/api/movies?lang=${language}`, {
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";
        const bodyText = await response.text();

        if (!contentType.includes("application/json")) {
          throw new Error("Movies API returned an invalid response. Please try again shortly.");
        }

        let payload;
        try {
          payload = JSON.parse(bodyText);
        } catch {
          throw new Error("Movies API returned malformed JSON. Please try again shortly.");
        }

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load movies.");
        }

        setMovies(Array.isArray(payload.movies) ? payload.movies : []);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setMoviesError(fetchError.message || "Unable to load movies.");
          setMovies([]);
        }
      } finally {
        setMoviesLoading(false);
      }
    }

    loadMovies();

    return () => {
      controller.abort();
    };
  }, [tab, language]);

  // ─── PWA install handler ──────────────────────────────────────────────────────
  // Triggers the browser's native "Add to Home Screen" prompt.
  async function installApp() {
    if (!installEvent) {
      setShowInstallPrompt(false); // Dismiss banner if event was already consumed
      return;
    }

    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch {
      // Ignore install prompt errors and keep app responsive.
    } finally {
      setInstallEvent(null);
      setShowInstallPrompt(false);
    }
  }

  return (
    <div className="page">
      <main className="website-view">
        <p className="label">BusSync</p>
        <h1>Sri Lanka Daily News</h1>
        <p className="message">
          Stay updated with public interest stories from Sri Lanka and switch
          languages instantly.
        </p>

        {/* Language switcher — EN / සිංහල */}
        <div className="language-tabs" aria-label="Select language">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`lang-tab ${language === option.id ? "active" : ""}`}
              onClick={() => setLanguage(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div
          className="tab-row"
          style={{
            display: "flex",
            gap: 8,
            margin: "16px 0",
            alignItems: "center",
          }}
        >
          {TAB_OPTIONS.map((option, idx) => (
            <>
              <button
                key={option.id}
                type="button"
                className={`tab-btn ${tab === option.id ? "active" : ""}`}
                onClick={() => setTab(option.id)}
              >
                {option.label}
              </button>
                {/* Game icon appears after the Movie tab once the news list is scrolled.
                  Tapping it opens the bus feedback modal. */}
              {option.id === "movie" &&
                tab === "news" &&
                showGameName &&
                (!showBus ? (
                  <span
                    role="button"
                    aria-label="Open bus survey game"
                    className="game-trigger-icon"
                    style={{ marginLeft: 10, verticalAlign: "middle" }}
                    onClick={() => setShowBus(true)}
                  >
                    🎮
                  </span>
                ) : null)}
            </>
          ))}
        </div>
      </main>

      {(tab === "news" || tab === "category") && (
        <section
          className="news-section"
          aria-live="polite"
          ref={newsSectionRef}
          style={{ overflowY: "auto", maxHeight: "70vh" }}
        >
          {/* ── Bus feedback game modal ─────────────────────────────── */}
          {tab === "news" && showBus && (
            <div className="gq-backdrop">
              <div className="gq-card">
                <button
                  className="gq-close"
                  aria-label="Close"
                  onClick={() => {
                    setShowBus(false);
                    setActiveBusQuestion(null);
                    setBusAnswers({});
                    setSubmitStatus("idle");
                  }}
                >✕</button>

                <div className="gq-header">
                  <span className="gq-header-emoji">🚌</span>
                  <div>
                    <div className="gq-header-label">{busGameCopy.headerLabel}</div>
                    <div className="gq-header-sub">{busGameCopy.headerSub}</div>
                  </div>
                </div>

                {/* Board view: numbered bus layout + chip legend */}
                {!selectedBusQuestion ? (
                  <>
                    <div className="gq-board" aria-label="Numbered bus game board">
                      <div className="gq-roof">
                        {[4, 5, 7, 8].map((id) => (
                          <button
                            key={id}
                            type="button"
                            className={getBusButtonClassName("gq-window-button", id)}
                            onClick={() => setActiveBusQuestion(id)}
                          >
                            <span className="gq-number-label">{id}</span>
                          </button>
                        ))}
                      </div>

                      <div className="gq-body-row">
                        <button
                          type="button"
                          className={getBusButtonClassName("gq-front-button", 1)}
                          onClick={() => setActiveBusQuestion(1)}
                        >
                          <span className="gq-number-label">1</span>
                        </button>

                        <button
                          type="button"
                          className={getBusButtonClassName("gq-body-button", 3)}
                          onClick={() => setActiveBusQuestion(3)}
                        >
                          <span className="gq-number-label">3</span>
                        </button>

                        <button
                          type="button"
                          className={getBusButtonClassName("gq-door-button", 6)}
                          onClick={() => setActiveBusQuestion(6)}
                        >
                          <span className="gq-number-label">6</span>
                        </button>

                        <button
                          type="button"
                          className={getBusButtonClassName("gq-back-button", 9)}
                          onClick={() => setActiveBusQuestion(9)}
                        >
                          <span className="gq-number-label">9</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        className={getBusButtonClassName("gq-wheel-button gq-wheel-left", 2)}
                        onClick={() => setActiveBusQuestion(2)}
                      >
                        <span className="gq-wheel-label">2</span>
                      </button>

                      <button
                        type="button"
                        className={getBusButtonClassName("gq-wheel-button gq-wheel-right", 10)}
                        onClick={() => setActiveBusQuestion(10)}
                      >
                        <span className="gq-wheel-label">10</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="gq-question-card" aria-live="polite">
                    {/* Success screen — shown after the GAS POST resolves */}
                    {submitStatus === "done" ? (
                      <div className="gq-submit-success">
                        <div className="gq-submit-icon">🎉</div>
                        <h3 className="gq-submit-title">{busGameCopy.doneTitle}</h3>
                        <p className="gq-submit-message">{busGameCopy.doneMessage}</p>
                        <button
                          type="button"
                          className="gq-nav-btn"
                          onClick={() => {
                            setShowBus(false);
                            setActiveBusQuestion(null);
                            setBusAnswers({});
                            setSubmitStatus("idle");
                          }}
                        >
                          {busGameCopy.close}
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Active question view: title, answers, nav/submit buttons */}
                        <div className="gq-question-topline">
                          <span className="gq-question-count">{selectedBusQuestion.id} / {BUS_GAME_QUESTIONS.length}</span>
                          <button
                            type="button"
                            className="gq-back-link"
                            onClick={() => setActiveBusQuestion(null)}
                          >
                            {busGameCopy.backToNumbers}
                          </button>
                        </div>

                        <h3 className="gq-question-title">{selectedBusQuestion.question[language]}</h3>
                        <p className="gq-question-helper">{busGameCopy.chooseAnswer}</p>

                        <div className="gq-answer-list">
                          <select
                            className="gq-answer-select"
                            value={busAnswers[selectedBusQuestion.id] || ""}
                            onChange={(event) => {
                              const selectedAnswer = event.target.value;

                              if (!selectedAnswer) {
                                return;
                              }

                              setSubmitStatus("idle");
                              setBusAnswers((current) => {
                                const updatedAnswers = {
                                  ...current,
                                  [selectedBusQuestion.id]: selectedAnswer,
                                };

                                // Autosave every selection so each column q1..q10 is
                                // progressively persisted instead of waiting for final submit.
                                saveProgress(updatedAnswers).catch(() => {
                                  // Keep UI responsive, but show the inline error message.
                                  setSubmitStatus("error");
                                });

                                return updatedAnswers;
                              });
                            }}
                            aria-label={busGameCopy.selectAnswer}
                          >
                            <option value="">{busGameCopy.selectAnswer}</option>
                            {selectedBusQuestion.answers[language].map((answer) => (
                              <option key={answer} value={answer}>
                                {answer}
                              </option>
                            ))}
                          </select>

                          {busAnswers[selectedBusQuestion.id] ? (
                            <p className="gq-answer-picked">
                              {busGameCopy.selectedPrefix} {busAnswers[selectedBusQuestion.id]}
                            </p>
                          ) : null}
                        </div>

                        {/* Inline error banner when the POST to Apps Script fails */}
                        {submitStatus === "error" && (
                          <p className="gq-submit-error">{busGameCopy.errorMessage}</p>
                        )}

                        <div className="gq-nav-row">
                          <button
                            type="button"
                            className="gq-nav-btn gq-nav-btn-secondary"
                            onClick={() => setActiveBusQuestion(BUS_GAME_QUESTIONS[Math.max(activeQuestionIndex - 1, 0)].id)}
                            disabled={activeQuestionIndex <= 0}
                          >
                            {busGameCopy.previous}
                          </button>

                          {/* Show Next on questions 1–9, Show Submit only on the last question */}
                          {activeQuestionIndex < BUS_GAME_QUESTIONS.length - 1 ? (
                            <button
                              type="button"
                              className="gq-nav-btn"
                              onClick={() => setActiveBusQuestion(null)}
                            >
                              {busGameCopy.next}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="gq-nav-btn gq-nav-btn-submit"
                              onClick={submitFeedback}
                              disabled={submitStatus === "sending"}
                            >
                              {submitStatus === "sending" ? busGameCopy.submitting : busGameCopy.submit}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="news-head">
            <h2>{tab === "category" ? "Category News" : "Updated on each language change"}</h2>
            {/* <p>Updated on each language change</p> */}
          </div>

          {tab === "category" && (
            <div
              style={{
                border: "1px solid #d6e0eb",
                borderRadius: 16,
                background: "#ffffff",
                padding: 18,
              }}
            >
              <h3 style={{ margin: "0 0 6px", color: "#12324a" }}>{categoryTabCopy.title}</h3>
              <p style={{ margin: "0 0 16px", color: "#4e6377" }}>{categoryTabCopy.subtitle}</p>

              {categoryPreferencePercentages.length === 0 ? (
                <p className="news-note">{categoryTabCopy.noData}</p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 18,
                    gridTemplateColumns: "minmax(220px, 280px) 1fr",
                    alignItems: "start",
                  }}
                >
                  <svg width="260" height="260" viewBox="0 0 260 260" aria-label="Category preference pie chart">
                    <g transform="translate(130,130)">
                      {(() => {
                        const radius = 82;
                        const circumference = 2 * Math.PI * radius;
                        let offsetPercent = 0;
                        return categoryPreferencePercentages.map((item) => {
                          const dash = (item.percentage / 100) * circumference;
                          const segment = (
                            <circle
                              key={item.category}
                              r={radius}
                              cx="0"
                              cy="0"
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="30"
                              strokeDasharray={`${dash} ${Math.max(circumference - dash, 0)}`}
                              strokeDashoffset={-((offsetPercent / 100) * circumference)}
                              transform="rotate(-90)"
                            />
                          );
                          offsetPercent += item.percentage;
                          return segment;
                        });
                      })()}
                      <circle r="52" cx="0" cy="0" fill="#ffffff" />
                      <text x="0" y="-4" textAnchor="middle" fontSize="12" fill="#4e6377">Total</text>
                      <text x="0" y="15" textAnchor="middle" fontSize="16" fontWeight="700" fill="#12324a">100%</text>
                    </g>
                  </svg>

                  <div style={{ display: "grid", gap: 10 }}>
                    {categoryPreferencePercentages.map((item) => (
                      <div
                        key={item.category}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: "#f8fbff",
                          border: "1px solid #e2e9f1",
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: item.color,
                              display: "inline-block",
                            }}
                          />
                          <span style={{ color: "#12324a", fontWeight: 600 }}>{item.category}</span>
                        </span>
                        <span style={{ color: "#0d6fb4", fontWeight: 700, minWidth: 45, textAlign: "right" }}>
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && <p className="news-note">Loading headlines...</p>}
          {error && !loading && <p className="news-error">{error}</p>}

          {!loading && !error && articles.length === 0 && (
            <p className="news-note">No headlines available right now.</p>
          )}

          {/* Latest News — collapsible card listing all articles from the API */}
          {tab === "news" && !loading && !error && articles.length > 0 && (
            <div
              className="latest-news-card"
              style={{
                cursor: "pointer",
                background: "linear-gradient(90deg, #e3ffe8 0%, #b3e5fc 100%)",
                border: "2px solid #4caf50",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(44,62,80,0.10)",
                marginBottom: 24,
                padding: 18,
              }}
              onClick={() => {
                setLatestNewsOpen((open) => !open);
                setFeaturedNewsOpen(false);
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: latestNewsOpen ? 16 : 0,
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {language === "si" ? "නවතම පුවත්" : "Latest News"}
                <span style={{ fontSize: 18, marginLeft: 8 }}>
                  {latestNewsOpen ? "▲" : "▼"}
                </span>
              </h3>
              {latestNewsOpen && (
                <ul
                  className="news-list"
                  style={{
                    background: "transparent",
                    boxShadow: "none",
                    border: "none",
                    margin: 0,
                    padding: 0,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {articles.map((article) => {
                    let pubDate = "";
                    const sourceName = getCleanSourceName(article.source?.name);
                    if (article.publishedAt) {
                      const d = new Date(article.publishedAt);
                      if (!isNaN(d)) {
                        pubDate = d.toLocaleDateString("en-GB", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                      }
                    }
                    return (
                      <li
                        key={article.url}
                        style={{
                          background: "transparent",
                          border: "none",
                          boxShadow: "none",
                          padding: 0,
                          marginBottom: 18,
                        }}
                      >
                        <h4 style={{ margin: "0 0 8px", color: "#222" }}>
                          {article.title}
                        </h4>
                        <p style={{ color: "#333" }}>
                          {article.description || "Tap to read full article."}
                        </p>
                        <div
                          style={{
                            color: "#1976d2",
                            fontWeight: 600,
                            fontSize: "0.97em",
                            marginTop: 4,
                          }}
                        >
                          {sourceName ? <span>{sourceName}</span> : null}
                          {pubDate && (
                            <span
                              style={{
                                color: "#555",
                                fontWeight: 400,
                                marginLeft: 8,
                              }}
                            >
                              {sourceName ? `| ${pubDate}` : pubDate}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Featured News — articles grouped into category buckets (sport, tech, etc.) */}
          {tab === "news" && !loading && !error && articles.length > 0 && (
            <div
              className="featured-news-card"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setFeaturedNewsOpen((open) => !open);
                setLatestNewsOpen(false);
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: featuredNewsOpen ? 16 : 0,
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {language === "si"
                  ? "විශේෂ පුවත්"
                  : "Featured News (By Category)"}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {hasInterestedCategories && !categoryPrompt ? (
                    <button
                      type="button"
                      className="game-trigger-icon"
                      style={{
                        width: 34,
                        height: 34,
                        fontSize: "1.15rem",
                        margin: 0,
                      }}
                      aria-label={categoryPromptCopy.nextCategory}
                      title={categoryPromptCopy.nextCategory}
                      onClick={(event) => {
                        event.stopPropagation();
                        openCategoryBusPrompt();
                      }}
                    >
                      ❓
                    </button>
                  ) : null}
                  <span style={{ fontSize: 18, marginLeft: 8 }}>
                    {featuredNewsOpen ? "▲" : "▼"}
                  </span>
                </span>
              </h3>
              {featuredNewsOpen && (
                <div
                  style={{
                    background: "transparent",
                    boxShadow: "none",
                    border: "none",
                    margin: 0,
                    padding: 0,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                    {visibleFeaturedCategoryEntries.map(([category, catArticles]) => (
                      <div
                        key={category}
                        data-category={category}
                        ref={(node) => setCategoryBlockRef(category, node)}
                        style={{ marginBottom: 18 }}
                      >
                        <h4
                          style={{
                            margin: "0 0 8px",
                            color: "#fff",
                            textTransform: "capitalize",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          {category}
                          <button
                            type="button"
                            className="later-btn"
                            style={{
                              padding: "6px 10px",
                              fontSize: "0.82rem",
                              flex: "0 0 auto",
                            }}
                            onClick={() => openCategoryPrompt(category, catArticles)}
                          >
                            {language === "si" ? "නවතම පුවත" : "Latest?"}
                          </button>
                        </h4>
                        <div
                          className="category-cards-row"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "12px",
                            margin: 0,
                            padding: 0,
                          }}
                        >
                          {catArticles.map((article) => {
                            let pubDate = "";
                            const sourceName = getCleanSourceName(article.source?.name);
                            if (article.publishedAt) {
                              const d = new Date(article.publishedAt);
                              if (!isNaN(d)) {
                                pubDate = d.toLocaleDateString("en-GB", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                });
                              }
                            }
                            return (
                              <div
                                key={article.url}
                                className="category-news-card"
                                style={{
                                  background: "#fff",
                                  color: "#222",
                                  borderRadius: 10,
                                  boxShadow: "0 2px 8px rgba(44,62,80,0.10)",
                                  padding: 12,
                                  minWidth: 220,
                                  maxWidth: 260,
                                  flex: "1 1 220px",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: "#e74c3c",
                                    marginBottom: 4,
                                    fontSize: "0.98em",
                                  }}
                                >
                                  {category}
                                </div>
                                <div
                                  style={{ fontWeight: 700, marginBottom: 4 }}
                                >
                                  {article.title}
                                </div>
                                <div
                                  style={{
                                    color: "#555",
                                    fontSize: "0.97em",
                                    marginBottom: 6,
                                  }}
                                >
                                  {article.description ||
                                    "Tap to read full article."}
                                </div>
                                <div
                                  style={{
                                    color: "#888",
                                    fontSize: "0.92em",
                                    marginTop: "auto",
                                  }}
                                >
                                  {pubDate && (
                                    <span style={{ marginRight: 8 }}>
                                      {pubDate}
                                    </span>
                                  )}
                                  {sourceName && (
                                    <span>{sourceName}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  {visibleFeaturedCategoryEntries.length === 0 && (
                    <p className="news-note">{categoryPromptCopy.noCategoryLeft}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "news" && categoryPrompt && (
            <div className="prompt-layer" onClick={() => setCategoryPrompt(null)}>
              <div
                className="prompt-card"
                style={{ width: "min(96vw, 760px)" }}
                onClick={(event) => event.stopPropagation()}
              >
                <h2>{categoryPromptCopy.title}</h2>
                {categoryPrompt.step === "bus" && (
                  <>
                    <p>{categoryPromptCopy.chooseCategory}</p>

                    <div className="gq-board" aria-label="Category bus board">
                      <div className="gq-roof">
                        {[0, 1, 2, 3].map((slotIndex) => {
                          const slot = getQuickCategorySlot(slotIndex);
                          return (
                            <button
                              key={`quick-roof-${slotIndex}`}
                              type="button"
                              className={`gq-number-button gq-window-button${slot && categoryPrompt.category === slot.category ? " gq-number-button-active" : ""}`}
                              onClick={() => slot && openCategoryPrompt(slot.category, slot.categoryArticles)}
                              disabled={!slot}
                            >
                              <span className="gq-slot-content">
                                <span className="gq-slot-question">
                                  {slot ? formatQuickCategoryLabel(slot.category) : getQuickBusFiller(slotIndex)}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="gq-body-row">
                        {[
                          { idx: 4, cls: "gq-front-button" },
                          { idx: 5, cls: "gq-body-button" },
                          { idx: 6, cls: "gq-door-button" },
                          { idx: 7, cls: "gq-back-button" },
                        ].map((slotConfig) => {
                          const slot = getQuickCategorySlot(slotConfig.idx);
                          return (
                            <button
                              key={`quick-body-${slotConfig.idx}`}
                              type="button"
                              className={`gq-number-button ${slotConfig.cls}${slot && categoryPrompt.category === slot.category ? " gq-number-button-active" : ""}`}
                              onClick={() => slot && openCategoryPrompt(slot.category, slot.categoryArticles)}
                              disabled={!slot}
                            >
                              <span className="gq-slot-content">
                                <span className="gq-slot-question">
                                  {slot ? formatQuickCategoryLabel(slot.category) : getQuickBusFiller(slotConfig.idx)}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {[8, 9].map((slotIndex, wheelIdx) => {
                        const slot = getQuickCategorySlot(slotIndex);
                        return (
                          <button
                            key={`quick-wheel-${slotIndex}`}
                            type="button"
                            className={`gq-number-button gq-wheel-button ${wheelIdx === 0 ? "gq-wheel-left" : "gq-wheel-right"}${slot && categoryPrompt.category === slot.category ? " gq-number-button-active" : ""}`}
                            onClick={() => slot && openCategoryPrompt(slot.category, slot.categoryArticles)}
                            disabled={!slot}
                          >
                            <span className="gq-slot-content gq-slot-content-wheel">
                              <span className="gq-slot-question">
                                {slot ? formatQuickCategoryLabel(slot.category) : getQuickBusFiller(slotIndex)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {categoryPrompt.step === "bus" ? (
                  <p className="help-note">{categoryPromptCopy.selectCategoryFirst}</p>
                ) : (
                  <div className="gq-question-card" style={{ minHeight: "auto", marginTop: 10 }}>
                    <div className="gq-question-topline">
                      <span className="gq-question-count">{categoryPrompt.category}</span>
                      <button
                        type="button"
                        className="gq-back-link"
                        onClick={openCategoryBusPrompt}
                      >
                        {categoryPromptCopy.backToBus}
                      </button>
                    </div>

                    <h3 className="gq-question-title">
                      {categoryPrompt.step === "interest"
                        ? `${categoryPromptCopy.interestQuestion} (${categoryPrompt.category})`
                        : `${categoryPromptCopy.questionPrefix} ${categoryPrompt.category} ${categoryPromptCopy.questionSuffix}`}
                    </h3>

                    <div className="gq-answer-list">
                      {categoryPrompt.step === "interest" ? (
                        <>
                          <button
                            type="button"
                            className="gq-answer-option"
                            onClick={() => {
                              saveCategoryInterest(categoryPrompt.category, true);
                              setCategoryPrompt(null);
                            }}
                          >
                            {categoryPromptCopy.interestedYes}
                          </button>
                          <button
                            type="button"
                            className="gq-answer-option"
                            onClick={() => {
                              saveCategoryInterest(categoryPrompt.category, false);
                              openCategoryBusPrompt();
                            }}
                          >
                            {categoryPromptCopy.interestedNo}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="gq-answer-option"
                            onClick={() =>
                              setCategoryPrompt((current) =>
                                current ? { ...current, step: "interest" } : current,
                              )
                            }
                          >
                            {categoryPromptCopy.yesViewed}
                          </button>
                          <button
                            type="button"
                            className="gq-answer-option"
                            onClick={() =>
                              setCategoryPrompt((current) =>
                                current ? { ...current, step: "interest" } : current,
                              )
                            }
                          >
                            {categoryPromptCopy.noViewed}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="prompt-actions">
                  <button
                    type="button"
                    className="install-btn"
                    onClick={() => setCategoryPrompt(null)}
                  >
                    {categoryPromptCopy.close}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Zones Card removed */}
        </section>
      )}

      {tab === "movie" && (
        <section className="movie-section" aria-live="polite">
          <div className="movie-head">
            <h2>Movies (Powered by TMDb)</h2>
            <p>Popular picks you can watch while traveling.</p>
          </div>

          {moviesLoading && <p className="news-note">Loading movies...</p>}
          {moviesError && !moviesLoading && (
            <p className="news-error">{moviesError}</p>
          )}

          {!moviesLoading && !moviesError && movies.length === 0 && (
            <p className="news-note">No movies available right now.</p>
          )}

          {!moviesLoading && !moviesError && movies.length > 0 && (
            <div className="movie-grid">
              {movies.map((movie) => (
                <article key={movie.id} className="movie-card">
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="movie-poster"
                      loading="lazy"
                    />
                  ) : (
                    <div className="movie-poster movie-poster-fallback">No Poster</div>
                  )}
                  <div className="movie-meta">
                    <h3>{movie.title}</h3>
                    <p className="movie-rating">Rating: {movie.rating ?? "N/A"}</p>
                    <p>{movie.overview || "No description available."}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {showInstallPrompt && (
        <div className="prompt-layer" role="presentation">
          <div
            className="prompt-card"
            role="dialog"
            aria-modal="true"
            aria-label="Install BusSync"
          >
            <h2>Install BusSync</h2>
            <p>Add this app to your home screen for a faster launch.</p>
            <p className="help-note">
              If install does not appear, use your browser menu and choose
              install.
            </p>
            <div className="prompt-actions">
              <button
                type="button"
                className="install-btn"
                onClick={installApp}
              >
                Install
              </button>
              <button
                type="button"
                className="later-btn"
                onClick={() => setShowInstallPrompt(false)}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
