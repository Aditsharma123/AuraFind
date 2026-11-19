/* ==========================================================================
   AuraFind — Apple Liquid Application Logic & AI Semantic Matching Engine
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. ADVANCED DATA SANITY & ANTI-GIBBERISH VALIDATION ENGINE
// Stops random keyboard mashing (e.g. gwbduygc, cgbdfd, dgjhcgcfjgcn, 5647)
// --------------------------------------------------------------------------
const SanityEngine = {
  // Known disposable / temporary email domains
  susDomains: [
    'tnjhg.com', 'tempmail.com', '10minutemail.com', 'mailinator.com',
    'guerrillamail.com', 'trashmail.com', 'sharklasers.com', 'throwawaymail.com',
    'dispostable.com', 'fakeinbox.com', 'yopmail.com', 'getairmail.com', 'temp-mail.org'
  ],

  // Keyboard row walking patterns (horizontal and vertical keyboard mashing)
  keyboardWalks: [
    'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
    'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
    'zxcv', 'xcvb', 'cvbn', 'vbnm', '1234', '2345', '3456', '7890'
  ],

  // Core Gibberish / Keyboard-Mash Detector
  isGibberish(text) {
    if (!text || typeof text !== 'string') return { isBad: true, reason: 'Field cannot be empty' };
    const trimmed = text.trim();
    if (trimmed.length < 2) return { isBad: true, reason: 'Too short (minimum 2 characters)' };

    // 1. Detect 3+ repeated identical characters (e.g. 'aaaa', 'xxxx')
    if (/(.)\1{2,}/i.test(trimmed)) {
      return { isBad: true, reason: 'Contains unnatural repeated characters' };
    }

    // 2. Detect common keyboard row mashing
    const lower = trimmed.toLowerCase();
    for (const walk of this.keyboardWalks) {
      if (lower.includes(walk)) {
        return { isBad: true, reason: `Keyboard sequence detected ('${walk}')` };
      }
    }

    // 3. Word-by-word Linguistic & Consonant Cluster Analysis
    const words = trimmed.split(/[\s\-_,\.]+/).filter(w => w.length > 0);
    const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U']);

    for (const word of words) {
      const lettersOnly = word.replace(/[^a-zA-Z]/g, '');
      if (lettersOnly.length < 3) continue;

      // Rule A: 4 or more consecutive consonants without a vowel
      // Catches: gwbduygc (gwbd), cgbdfd (6), gvkgf (5), dhnhdfc (7), dgjhcgcfjgcn (12 consonants!)
      const consonantClusterMatch = lettersOnly.match(/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{4,}/);
      if (consonantClusterMatch) {
        return { 
          isBad: true, 
          reason: `Keyboard mashing detected in '${word}' (consonant cluster '${consonantClusterMatch[0]}')` 
        };
      }

      // Rule B: Vowel-to-length ratio for words >= 4 letters
      let vowelCount = 0;
      for (const ch of lettersOnly) {
        if (vowels.has(ch) || ch === 'y' || ch === 'Y') vowelCount++;
      }
      const vowelRatio = vowelCount / lettersOnly.length;
      if (vowelRatio < 0.18) {
        return { 
          isBad: true, 
          reason: `'${word}' is not a valid word (lacks vowels, ${Math.round(vowelRatio * 100)}% vowels)` 
        };
      }
    }

    return { isBad: false };
  },

  // Field Specific Validations
  validateTitle(title) {
    const check = this.isGibberish(title);
    if (check.isBad) return { valid: false, message: `Invalid Item Title: ${check.reason}` };
    if (title.trim().length < 3) return { valid: false, message: 'Item Title must be at least 3 characters.' };
    return { valid: true, sanitized: title.trim() };
  },

  validateName(name) {
    const trimmed = (name || '').trim();
    if (trimmed.length < 3) return { valid: false, message: 'Name must be at least 3 characters.' };
    if (!/^[a-zA-Z\s\.\'\-]+$/.test(trimmed)) {
      return { valid: false, message: 'Name should only contain letters and spaces (no digits or symbols).' };
    }
    const check = this.isGibberish(trimmed);
    if (check.isBad) return { valid: false, message: `Invalid Name: ${check.reason}` };
    return { valid: true, sanitized: trimmed };
  },

  validatePhone(phone) {
    const cleaned = (phone || '').replace(/[\s\-\(\)]/g, '');
    
    // Check for dummy repetitions
    const dummyPatterns = [
      /^0{10}$/, /^1{10}$/, /^9{10}$/,
      /^1234567890$/, /^0123456789$/, /^9876543210$/
    ];
    if (dummyPatterns.some(pat => pat.test(cleaned))) {
      return { valid: false, message: 'Please provide a genuine, callable phone number.' };
    }

    // Indian mobile standard (10 digits starting with 6-9) or International E.164
    const indianMobileRegex = /^[6-9]\d{9}$/;
    const internationalRegex = /^\+?[1-9]\d{9,13}$/;

    if (!indianMobileRegex.test(cleaned) && !internationalRegex.test(cleaned)) {
      return { valid: false, message: 'Invalid phone number. Must be a 10-digit callable number or international (+country).' };
    }

    return { valid: true, sanitized: cleaned };
  },

  validateEmail(email) {
    const trimmed = (email || '').trim().toLowerCase();
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(trimmed)) {
      return { valid: false, message: 'Invalid email format. Please enter a valid student or personal email.' };
    }
    const parts = trimmed.split('@');
    const userPart = parts[0];
    const domain = parts[1];

    if (this.susDomains.includes(domain)) {
      return { valid: false, message: `Disposable email domain (@${domain}) is blocked.` };
    }

    // Check if domain or username is gibberish
    const domainCheck = this.isGibberish(domain.split('.')[0]);
    if (domainCheck.isBad) {
      return { valid: false, message: `Suspicious email host (@${domain}) rejected.` };
    }

    const userCheck = this.isGibberish(userPart);
    if (userCheck.isBad && userPart.length > 5) {
      return { valid: false, message: `Suspicious email username '${userPart}': ${userCheck.reason}` };
    }

    return { valid: true, sanitized: trimmed };
  },

  validateBatch(batch) {
    const trimmed = (batch || '').trim();
    if (!trimmed) return { valid: false, message: 'Batch/Year is required.' };

    // If pure 4-digit number (e.g. 5647 vs 2024)
    if (/^\d{4}$/.test(trimmed)) {
      const year = parseInt(trimmed, 10);
      if (year < 2018 || year > 2032) {
        return { valid: false, message: `Invalid graduation year '${year}'. Must be a realistic year (e.g. 2024, 2025).` };
      }
      return { valid: true, sanitized: `${year} Batch` };
    }

    // If string description, check if it contains year/sem or realistic terms
    const lower = trimmed.toLowerCase();
    const hasBatchTerms = /year|batch|sem|class|b\.?tech|m\.?tech|mba|bca|mca|bba|phd|first|second|third|final/i.test(lower);
    const hasDigits = /\d/.test(trimmed);

    if (!hasBatchTerms && !hasDigits) {
      return { valid: false, message: 'Please specify your year/batch (e.g. 3rd Year B.Tech, 2024 Batch).' };
    }

    const check = this.isGibberish(trimmed);
    if (check.isBad) return { valid: false, message: `Invalid Batch/Year: ${check.reason}` };

    return { valid: true, sanitized: trimmed };
  },

  validateDescriptiveField(fieldName, val, minLen = 3) {
    const trimmed = (val || '').trim();
    if (!trimmed || trimmed.length < minLen) {
      return { valid: false, message: `${fieldName} must be at least ${minLen} characters.` };
    }
    const check = this.isGibberish(trimmed);
    if (check.isBad) {
      return { valid: false, message: `Invalid ${fieldName}: ${check.reason}` };
    }
    return { valid: true, sanitized: trimmed };
  }
};


// --------------------------------------------------------------------------
// 2. AI / ML SEMANTIC SIMILARITY & DISCREPANCY MATCHING ENGINE
// Handles "Mount Fuji" == "Mountain", "Aqua" == "Cyan/Blue/Green", "Type-C" == "USB C"
// --------------------------------------------------------------------------
const SemanticAiMatcher = {
  thesaurus: {
    // Nature & Wallpapers
    "mountain": ["mount fuji", "fuji", "himalayas", "everest", "snow peak", "hills", "nature", "alps", "snowy mountain", "rocky mountain"],
    "mount fuji": ["mountain", "fuji", "snow peak", "nature landscape", "japan peak"],
    "ocean": ["sea", "beach", "waves", "water", "marine"],
    "anime": ["manga", "naruto", "goku", "one piece", "demon slayer", "cartoon", "character"],
    "space": ["stars", "galaxy", "spaceman", "astronaut", "universe", "nebula", "black"],
    
    // Colors & Shades
    "aqua": ["cyan", "teal", "light blue", "turquoise", "sky blue", "blue", "greenish blue", "sea green"],
    "cyan": ["aqua", "teal", "light blue", "turquoise", "sky blue", "blue"],
    "teal": ["aqua", "cyan", "dark cyan", "greenish blue", "sea green"],
    "blue": ["aqua", "cyan", "navy", "royal blue", "sky blue", "indigo"],
    "green": ["aqua", "teal", "sea green", "mint", "emerald", "olive"],
    "purple": ["violet", "lavender", "plum", "magenta", "deep purple"],
    "black": ["midnight", "matte black", "dark", "charcoal", "pitch black", "jet black", "space grey"],
    "white": ["silver", "starlight", "pearl", "chalk", "light grey"],
    "silver": ["white", "grey", "space grey", "aluminum", "metallic"],
    
    // Ports & Tech Specs
    "type c": ["usb-c", "usbc", "type-c", "c-type", "thunderbolt", "type c cable"],
    "usb-c": ["type c", "usbc", "type-c", "thunderbolt", "c type"],
    "lightning": ["apple lightning", "iphone cable", "8 pin"],
    
    // Materials & Textures
    "matte": ["frosted", "textured", "anti-glare", "rough", "brushed"],
    "glossy": ["shiny", "reflective", "glass", "smooth"],
    "aluminum": ["metal", "metallic", "alloy", "silver body"]
  },

  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  },

  textSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    const editDist = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDist) / longer.length;
  },

  evaluatePair(reportedText, claimedText) {
    const r = (reportedText || '').toLowerCase().trim();
    const c = (claimedText || '').toLowerCase().trim();

    // 1. Direct match
    if (r === c || r.includes(c) || c.includes(r)) {
      return { score: 1.0, reason: "Direct semantic match" };
    }

    // 2. Thesaurus / Taxonomy cluster match
    const rSynonyms = this.thesaurus[r] || [];
    const cSynonyms = this.thesaurus[c] || [];

    if (rSynonyms.some(syn => c.includes(syn) || syn.includes(c))) {
      return { score: 0.94, reason: `AI mapped '${c}' as a valid semantic equivalent of '${r}'` };
    }
    if (cSynonyms.some(syn => r.includes(syn) || syn.includes(r))) {
      return { score: 0.94, reason: `AI mapped '${r}' as a valid semantic equivalent of '${c}'` };
    }

    const intersection = rSynonyms.filter(x => cSynonyms.includes(x));
    if (intersection.length > 0) {
      return { score: 0.88, reason: `Both terms map to common cluster [${intersection[0]}]` };
    }

    // 3. Typo / Levenshtein similarity
    const fuzzy = this.textSimilarity(r, c);
    if (fuzzy >= 0.70) {
      return { score: Math.round(fuzzy * 100) / 100, reason: "Fuzzy character match (typo tolerance)" };
    }

    return { score: Math.round(fuzzy * 100) / 100, reason: "No strong semantic relationship detected" };
  }
};


// --------------------------------------------------------------------------
// 3. SEEDED DATABASE & STATE
// --------------------------------------------------------------------------
let incidents = [
  {
    id: 1,
    type: "found",
    title: "iPhone 14 Pro — Deep Purple",
    category: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
    reporterName: "Rohan Sharma",
    reporterEmail: "rohan.s@campus.edu",
    reporterBatch: "2024 / Final Year",
    reporterPhone: "+91 98765 12340",
    residenceType: "hostel",
    hostelFloor: "Block C, 2nd Floor",
    hostelRoom: "Room 204",
    guardLocation: null,
    locationZone: "cafeteria",
    status: "open",
    createdAt: "2 hours ago",
    questions: [
      { q: "What is the charging cable / port type?", a: "lightning" },
      { q: "What is the lockscreen wallpaper?", a: "mount fuji" },
      { q: "What color is the silicone case?", a: "aqua" }
    ]
  },
  {
    id: 2,
    type: "found",
    title: "Dell XPS 15 (Silver Aluminum)",
    category: "Laptops",
    imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80",
    reporterName: "Priya Nair",
    reporterEmail: "priya.n@campus.edu",
    reporterBatch: "2025 / 2nd Year MBA",
    reporterPhone: "+91 91234 56789",
    residenceType: "dayscholar",
    hostelFloor: null,
    hostelRoom: null,
    guardLocation: "Central Library Security Booth",
    locationZone: "library",
    status: "open",
    createdAt: "5 hours ago",
    questions: [
      { q: "What charging adapter wattage was with it?", a: "130w type c" },
      { q: "What stickers are on the back lid?", a: "docker and github" },
      { q: "What is the laptop body texture/finish?", a: "matte silver aluminum" }
    ]
  },
  {
    id: 3,
    type: "lost",
    title: "Sony WH-1000XM4 Noise Cancelling",
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    reporterName: "Aditya Verma",
    reporterEmail: "aditya.v@campus.edu",
    reporterBatch: "2024 / 3rd Year ECE",
    reporterPhone: "+91 98111 22334",
    residenceType: "hostel",
    locationZone: "classroom",
    lostDetails: {
      brand: "Sony",
      material: "Matte black plastic with copper accents",
      observableWallpaper: "N/A (Audio gear)",
      observableColor: "Matte Black",
      lastSeenLocation: "Lecture Hall 302, 3rd row desk",
      timestampLost: "Today, ~11:30 AM"
    },
    status: "searching",
    createdAt: "1 hour ago"
  }
];

// Campus Analytics & Vulnerability Matrix Data
const campusVulnerabilityData = {
  zones: [
    {
      name: "Classrooms & Lecture Halls",
      id: "classroom",
      icon: "🏫",
      riskLevel: "High",
      topLostItems: [
        { item: "Laptop & Phone Chargers", probability: "68%" },
        { item: "Umbrellas", probability: "62%" },
        { item: "Water Bottles & Flasks", probability: "48%" },
        { item: "Jackets & Hoodies", probability: "35%" }
      ],
      insight: "Students leave chargers plugged in under wall sockets or umbrellas hooked to desk rails."
    },
    {
      name: "Campus Restrooms & Washrooms",
      id: "washroom",
      icon: "🚻",
      riskLevel: "Critical",
      topLostItems: [
        { item: "Eyeglasses & Specs", probability: "76%" },
        { item: "Smartwatches & Rings", probability: "58%" },
        { item: "Jackets & Blazers (Door hooks)", probability: "44%" }
      ],
      insight: "Items removed before washing hands are placed on sink countertops and forgotten."
    },
    {
      name: "Central Cafeteria & Food Court",
      id: "cafeteria",
      icon: "☕",
      riskLevel: "Very High",
      topLostItems: [
        { item: "Smartphones", probability: "65%" },
        { item: "Student ID Cards & Wallets", probability: "52%" },
        { item: "Earbud Cases (AirPods)", probability: "41%" }
      ],
      insight: "Phones or cards resting on food trays are discarded or left when returning trays."
    },
    {
      name: "Central Library & Silent Pods",
      id: "library",
      icon: "📚",
      riskLevel: "Moderate",
      topLostItems: [
        { item: "MacBook USB-C Hubs / Dongles", probability: "54%" },
        { item: "Wireless Mice & Stylus Pens", probability: "46%" },
        { item: "Notebooks & ID Badges", probability: "32%" }
      ],
      insight: "Items left behind during library closing announcement rush."
    }
  ]
};

let currentTab = "found"; // "found" | "lost"
let currentCategoryFilter = "all";
let activeClaimIncident = null;
let uploadedImageBase64 = null;


// --------------------------------------------------------------------------
// 4. UI INITIALIZATION & LIQUID SLIDING GLASS ENGINE
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderFeed();
  populateDefaultQuestions();
  setupLiveFormValidation();
  
  // Realignment passes ensuring sub-pixel centering across all display scalings (100%, 125%, Retina)
  requestAnimationFrame(() => refreshAllLiquidSliders(true));
  setTimeout(() => refreshAllLiquidSliders(true), 50);
  setTimeout(() => refreshAllLiquidSliders(true), 200);

  // Auto-realign on window resize or orientation shift
  window.addEventListener("resize", () => {
    refreshAllLiquidSliders(true);
  });

  // Realign once custom system fonts finish measuring typography metrics
  if (document.fonts) {
    document.fonts.ready.then(() => {
      refreshAllLiquidSliders(true);
    });
  }

  // Observe dock elements directly with ResizeObserver for responsive flex/grid adaptations
  if (window.ResizeObserver) {
    const dockObserver = new ResizeObserver(() => {
      refreshAllLiquidSliders(true);
    });
    document.querySelectorAll(".apple-liquid-dock").forEach(dock => {
      dockObserver.observe(dock);
    });
  }
});

// The Apple Liquid Sliding Pill Controller (100% Centered Sub-Pixel Accuracy)
function updateLiquidSlider(dock, activeBtn, immediate = false) {
  if (!dock || !activeBtn) return;

  let pill = dock.querySelector(".liquid-slider-pill");
  if (!pill) {
    pill = document.createElement("div");
    pill.className = "liquid-slider-pill";
    dock.appendChild(pill);
  }

  // Use exact offsetLeft/offsetTop relative to the dock container
  const left = activeBtn.offsetLeft;
  const top = activeBtn.offsetTop;
  const width = activeBtn.offsetWidth;
  const height = activeBtn.offsetHeight;

  if (immediate) {
    pill.style.transition = "none";
  } else {
    pill.style.transition = "transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), width 0.38s cubic-bezier(0.16, 1, 0.3, 1), height 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease";
  }

  pill.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  pill.style.width = `${width}px`;
  pill.style.height = `${height}px`;
  pill.style.opacity = "1";

  if (immediate) {
    pill.offsetHeight; // Force reflow
    pill.style.transition = "";
  }
}

function refreshAllLiquidSliders(immediate = false) {
  const mainDock = document.getElementById("mainTabDock");
  if (mainDock) {
    const active = mainDock.querySelector(".apple-segment-btn.active");
    if (active) updateLiquidSlider(mainDock, active, immediate);
  }

  const mobileDock = document.getElementById("mobileTabDock");
  if (mobileDock) {
    const active = mobileDock.querySelector(".apple-segment-btn.active");
    if (active) updateLiquidSlider(mobileDock, active, immediate);
  }

  const catDock = document.getElementById("catFilterDock");
  if (catDock) {
    const active = catDock.querySelector(".apple-segment-btn.active");
    if (active) updateLiquidSlider(catDock, active, immediate);
  }

  const reportDock = document.getElementById("reportModeDock");
  if (reportDock) {
    const active = reportDock.querySelector(".apple-segment-btn.active");
    if (active) updateLiquidSlider(reportDock, active, immediate);
  }
}

function switchMainTab(tab) {
  currentTab = tab;
  
  // Desktop header dock
  const btnFound = document.getElementById("tabBtnFound");
  const btnLost = document.getElementById("tabBtnLost");
  if (btnFound && btnLost) {
    btnFound.classList.toggle("active", tab === "found");
    btnLost.classList.toggle("active", tab === "lost");
    updateLiquidSlider(document.getElementById("mainTabDock"), tab === "found" ? btnFound : btnLost);
  }

  // Mobile dock
  const mobileDock = document.getElementById("mobileTabDock");
  if (mobileDock) {
    const btns = mobileDock.querySelectorAll(".apple-segment-btn");
    btns.forEach((b, idx) => {
      const isTarget = (tab === "found" && idx === 0) || (tab === "lost" && idx === 1);
      b.classList.toggle("active", isTarget);
      if (isTarget) updateLiquidSlider(mobileDock, b);
    });
  }

  const heading = document.getElementById("feedHeading");
  const subHeading = document.getElementById("feedSubHeading");
  if (heading && subHeading) {
    if (tab === "found") {
      heading.innerText = "Recovered Items Grid";
      subHeading.innerText = "Items found across campus protected by 3-stage security questions";
    } else {
      heading.innerText = "Missing Device Broadcasts";
      subHeading.innerText = "Owner reports seeking lost items before anyone reports them found";
    }
  }

  renderFeed();
}

function filterCategory(cat) {
  currentCategoryFilter = cat;
  const catDock = document.getElementById("catFilterDock");
  if (catDock) {
    let targetBtn = null;
    catDock.querySelectorAll(".apple-segment-btn").forEach(b => {
      const match = b.getAttribute("data-cat") === cat;
      b.classList.toggle("active", match);
      if (match) targetBtn = b;
    });
    if (targetBtn) updateLiquidSlider(catDock, targetBtn);
  }
  renderFeed();
}

// Staggered Feed Renderer (Dissolves previous cards, smoothly reveals new ones)
function renderFeed() {
  const container = document.getElementById("incidentsFeed");
  if (!container) return;

  // Gentle fade out
  container.classList.add("feed-transitioning");

  setTimeout(() => {
    container.innerHTML = "";

    const filtered = incidents.filter(item => {
      const matchesTab = (currentTab === "found" && item.type === "found") ||
                         (currentTab === "lost" && item.type === "lost");
      const matchesCat = currentCategoryFilter === "all" || item.category.toLowerCase() === currentCategoryFilter.toLowerCase();
      return matchesTab && matchesCat;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center apple-liquid-card apple-card-enter rounded-3xl p-8">
          <p class="text-sm text-slate-400">No ${currentTab} items currently listed under this category.</p>
        </div>
      `;
      container.classList.remove("feed-transitioning");
      return;
    }

    filtered.forEach((item, index) => {
      const card = createIncidentCard(item, index);
      container.appendChild(card);
    });

    container.classList.remove("feed-transitioning");
  }, 120);
}

function createIncidentCard(item, index) {
  const card = document.createElement("div");
  card.className = "apple-liquid-card apple-card-enter rounded-3xl overflow-hidden flex flex-col justify-between group";
  card.style.animationDelay = `${index * 45}ms`;

  if (item.type === "found") {
    const isHostel = item.residenceType === "hostel";
    const custodyBadge = isHostel
      ? `<span class="apple-capsule text-indigo-300 border-indigo-500/40 bg-indigo-900/30">🏢 Hostel Room</span>`
      : `<span class="apple-capsule text-emerald-300 border-emerald-500/40 bg-emerald-900/30">🏛️ At Guard Desk</span>`;

    card.innerHTML = `
      <div>
        <div class="relative w-full h-48 sm:h-52 bg-slate-900 overflow-hidden">
          <img src="${item.imageUrl}" alt="${item.title}" class="w-full h-full object-cover transition duration-700 ease-out group-hover:scale-105" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#04060d] via-transparent to-transparent"></div>
          <div class="absolute top-3 left-3">${custodyBadge}</div>
          <div class="absolute top-3 right-3">
            <span class="apple-capsule text-cyan-300 border-cyan-400/30 bg-black/50">
              🔒 3 Questions Lock
            </span>
          </div>
        </div>

        <div class="p-5">
          <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span>${item.category}</span>
            <span>${item.createdAt}</span>
          </div>
          <h3 class="text-base sm:text-lg font-bold text-white mb-2 leading-snug group-hover:text-cyan-300 transition duration-200">
            ${item.title}
          </h3>

          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs space-y-1.5 mb-3 shadow-inner">
            <div class="text-[11px] text-slate-400">Current Custodian:</div>
            <div class="text-white font-medium">${item.reporterName} • <span class="text-slate-400">${item.reporterBatch}</span></div>
            <div class="text-[11px] text-slate-400">
              Location: ${isHostel ? `${item.hostelFloor}, ${item.hostelRoom}` : item.guardLocation}
            </div>
          </div>

          <div class="flex items-center gap-1.5 text-[11px] text-amber-300">
            <svg class="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Owner must pass AI semantic verification</span>
          </div>
        </div>
      </div>

      <div class="p-5 pt-0">
        <button onclick="openClaimModal(${item.id})" class="pixel-tap apple-liquid-btn w-full py-2.5 text-xs flex items-center justify-center gap-2">
          <span>Claim & Verify Ownership</span>
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    `;
  } else {
    const ld = item.lostDetails;
    card.innerHTML = `
      <div>
        <div class="relative w-full h-44 bg-slate-900 overflow-hidden">
          <img src="${item.imageUrl}" alt="${item.title}" class="w-full h-full object-cover transition duration-700 ease-out group-hover:scale-105" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#04060d] via-transparent to-transparent"></div>
          <div class="absolute top-3 left-3">
            <span class="apple-capsule text-rose-300 border-rose-500/40 bg-rose-950/40">
              🚨 Missing Item Broadcast
            </span>
          </div>
        </div>

        <div class="p-5">
          <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span>${item.category}</span>
            <span>${item.createdAt}</span>
          </div>
          <h3 class="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
            ${item.title}
          </h3>

          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs space-y-1 mb-3 shadow-inner">
            <div class="text-[11px] text-slate-400">Identifiable Traits (Non-sensitive):</div>
            <div class="text-slate-200"><strong>Brand:</strong> ${ld.brand} • <strong>Finish:</strong> ${ld.material}</div>
            <div class="text-slate-200"><strong>Color/Case:</strong> ${ld.observableColor}</div>
            <div class="text-slate-200"><strong>Wallpaper:</strong> ${ld.observableWallpaper}</div>
            <div class="text-[11px] text-cyan-300/90 pt-1 border-t border-white/10">
              📍 Last Seen: ${ld.lastSeenLocation}
            </div>
          </div>

          <div class="text-[11px] text-slate-400">
            Reported by: <strong class="text-white">${item.reporterName}</strong> (${item.reporterBatch})
          </div>
        </div>
      </div>

      <div class="p-5 pt-0">
        <a href="tel:${item.reporterPhone}" class="pixel-tap w-full py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 border border-white/30 transition">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>I Found This (Call Owner)</span>
        </a>
      </div>
    `;
  }

  return card;
}


// --------------------------------------------------------------------------
// 5. LIVE REAL-TIME DATA SANITY LISTENERS & FEEDBACK
// --------------------------------------------------------------------------
function setupLiveFormValidation() {
  const watchInput = (id, validateFn) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => {
      const res = validateFn(el.value);
      toggleInputVisualState(el, `${id}Error`, res);
    };
    el.addEventListener("blur", handler);
    el.addEventListener("input", () => {
      // Clear error immediately when user begins correcting
      if (el.classList.contains("input-error")) handler();
    });
  };

  watchInput("itemTitle", v => SanityEngine.validateTitle(v));
  watchInput("reporterName", v => SanityEngine.validateName(v));
  watchInput("reporterEmail", v => SanityEngine.validateEmail(v));
  watchInput("reporterPhone", v => SanityEngine.validatePhone(v));
  watchInput("reporterBatch", v => SanityEngine.validateBatch(v));
  
  // Lost specific fields
  watchInput("lostBrand", v => SanityEngine.validateDescriptiveField("Brand", v, 2));
  watchInput("lostMaterial", v => SanityEngine.validateDescriptiveField("Material/Finish", v, 3));
  watchInput("lostWallpaper", v => SanityEngine.validateDescriptiveField("Wallpaper", v, 3));
  watchInput("lostColor", v => SanityEngine.validateDescriptiveField("Color", v, 3));
  watchInput("lostLastSeen", v => SanityEngine.validateDescriptiveField("Last Seen Location", v, 4));
}

function toggleInputVisualState(inputEl, errorId, result) {
  let errEl = document.getElementById(errorId);
  if (!errEl) {
    errEl = document.createElement("div");
    errEl.id = errorId;
    errEl.className = "text-[11px] text-rose-400 mt-1 font-medium transition-all duration-200";
    inputEl.parentElement.appendChild(errEl);
  }

  if (!result.valid) {
    inputEl.classList.add("input-error");
    inputEl.classList.remove("input-valid");
    errEl.innerText = `⚠️ ${result.message}`;
  } else {
    inputEl.classList.remove("input-error");
    inputEl.classList.add("input-valid");
    errEl.innerText = "";
  }
}

function showSanityAlertBanner(message) {
  let banner = document.getElementById("sanityAlertBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "sanityAlertBanner";
    banner.className = "p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs mb-4 shadow-lg";
    const form = document.getElementById("reportForm");
    form.insertBefore(banner, form.firstChild);
  }
  banner.innerHTML = `
    <div class="flex items-center gap-2 font-bold text-rose-300 mb-1">
      <svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>Input Sanity Check Failed</span>
    </div>
    <p>${message}</p>
  `;
  banner.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearSanityAlertBanner() {
  const banner = document.getElementById("sanityAlertBanner");
  if (banner) banner.remove();
}


// --------------------------------------------------------------------------
// 6. REPORT INCIDENT MODAL (FOUND VS LOST TOGGLE)
// --------------------------------------------------------------------------
let reportMode = "found";

function openReportModal() {
  clearSanityAlertBanner();
  const modal = document.getElementById("reportModal");
  modal.classList.add("active");
  switchReportMode("found");
  setTimeout(() => {
    const dock = document.getElementById("reportModeDock");
    const active = dock ? dock.querySelector(".apple-segment-btn.active") : null;
    if (dock && active) updateLiquidSlider(dock, active, true);
  }, 60);
}

function closeReportModal() {
  const modal = document.getElementById("reportModal");
  modal.classList.remove("active");
  clearSanityAlertBanner();
}

function switchReportMode(mode) {
  reportMode = mode;
  const btnFound = document.getElementById("modeBtnFound");
  const btnLost = document.getElementById("modeBtnLost");
  const dock = document.getElementById("reportModeDock");

  if (btnFound && btnLost) {
    btnFound.classList.toggle("active", mode === "found");
    btnLost.classList.toggle("active", mode === "lost");
    if (dock) {
      updateLiquidSlider(dock, mode === "found" ? btnFound : btnLost);
    }
  }

  const foundFields = document.getElementById("foundSpecificFields");
  const lostFields = document.getElementById("lostSpecificFields");

  if (mode === "found") {
    foundFields.classList.remove("hidden");
    lostFields.classList.add("hidden");
  } else {
    foundFields.classList.add("hidden");
    lostFields.classList.remove("hidden");
  }
}

function toggleResidenceUI() {
  const type = document.querySelector('input[name="residenceType"]:checked').value;
  const hostelFields = document.getElementById("hostelFields");
  const guardFields = document.getElementById("guardFields");

  if (type === "hostel") {
    hostelFields.classList.remove("hidden");
    guardFields.classList.add("hidden");
  } else {
    hostelFields.classList.add("hidden");
    guardFields.classList.remove("hidden");
  }
}

function previewIncidentImage(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      uploadedImageBase64 = evt.target.result;
      const img = document.getElementById("previewImg");
      img.src = uploadedImageBase64;
      img.classList.remove("hidden");
      document.getElementById("previewPlaceholder").classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }
}

function populateDefaultQuestions() {
  const container = document.getElementById("securityQuestionsList");
  container.innerHTML = "";
  const presets = [
    { q: "What is the charging cable / port type?", a: "Type-C" },
    { q: "What is the lockscreen wallpaper / screen image?", a: "Mount Fuji" },
    { q: "What is the phone case / body finish color?", a: "Aqua Blue" }
  ];
  presets.forEach((p, idx) => {
    appendQuestionField(idx + 1, p.q, p.a);
  });
}

function appendQuestionField(num, questionText = "", expectedAnswer = "") {
  const container = document.getElementById("securityQuestionsList");
  const div = document.createElement("div");
  div.className = "p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 question-row";
  div.innerHTML = `
    <div class="flex items-center justify-between">
      <label class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
        <span class="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center text-[9px] font-mono">${num}</span>
        Security Question ${num}
      </label>
      ${num > 3 ? `<button type="button" onclick="this.closest('.question-row').remove();" class="text-[10px] text-rose-400">Remove</button>` : ""}
    </div>
    <input type="text" class="question-input apple-input !py-1.5 text-xs" value="${questionText}" placeholder="e.g. Wallpaper type or cable port" required />
    <input type="text" class="answer-input apple-input !py-1.5 text-xs" value="${expectedAnswer}" placeholder="Expected secret answer (used for AI verification)" required />
  `;
  container.appendChild(div);
}

function addCustomQuestion() {
  const count = document.querySelectorAll(".question-row").length;
  appendQuestionField(count + 1, "", "");
}

// Comprehensive Form Submission Validator
function handleReportSubmit(e) {
  e.preventDefault();
  clearSanityAlertBanner();

  // 1. Validate Core Identity Fields
  const titleVal = SanityEngine.validateTitle(document.getElementById("itemTitle").value);
  const nameVal = SanityEngine.validateName(document.getElementById("reporterName").value);
  const emailVal = SanityEngine.validateEmail(document.getElementById("reporterEmail").value);
  const phoneVal = SanityEngine.validatePhone(document.getElementById("reporterPhone").value);
  const batchVal = SanityEngine.validateBatch(document.getElementById("reporterBatch").value);

  const errors = [];
  if (!titleVal.valid) errors.push(titleVal.message);
  if (!nameVal.valid) errors.push(nameVal.message);
  if (!emailVal.valid) errors.push(emailVal.message);
  if (!phoneVal.valid) errors.push(phoneVal.message);
  if (!batchVal.valid) errors.push(batchVal.message);

  const title = titleVal.valid ? titleVal.sanitized : "";
  const category = document.getElementById("itemCategory").value;
  const zone = document.getElementById("locationZoneSelect").value;

  if (reportMode === "found") {
    // Validate Security Questions
    const questions = [];
    const rows = document.querySelectorAll(".question-row");
    rows.forEach((row, i) => {
      const q = row.querySelector(".question-input").value.trim();
      const a = row.querySelector(".answer-input").value.trim();
      const qCheck = SanityEngine.isGibberish(q);
      const aCheck = SanityEngine.isGibberish(a);
      if (qCheck.isBad) errors.push(`Question ${i + 1}: ${qCheck.reason}`);
      if (aCheck.isBad) errors.push(`Answer ${i + 1}: ${aCheck.reason}`);
      if (q && a) questions.push({ q, a });
    });

    if (questions.length < 3) {
      errors.push("At least 3 valid security questions are required.");
    }

    if (errors.length > 0) {
      showSanityAlertBanner(errors.join("<br>"));
      return;
    }

    const resType = document.querySelector('input[name="residenceType"]:checked').value;
    const isHostel = resType === "hostel";

    const newItem = {
      id: Date.now(),
      type: "found",
      title: title,
      category: category,
      imageUrl: uploadedImageBase64 || "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
      reporterName: nameVal.sanitized,
      reporterEmail: emailVal.sanitized,
      reporterBatch: batchVal.sanitized,
      reporterPhone: phoneVal.sanitized,
      residenceType: resType,
      hostelFloor: isHostel ? document.getElementById("hostelFloor").value : null,
      hostelRoom: isHostel ? document.getElementById("hostelRoom").value : null,
      guardLocation: !isHostel ? document.getElementById("guardLocation").value : null,
      locationZone: zone,
      status: "open",
      createdAt: "Just now",
      questions: questions
    };

    incidents.unshift(newItem);
    alert("🎉 Incident posted! Locked behind 3 AI-evaluated security questions.");
  } else {
    // Mode: Lost Broadcast -> Validate all observable traits against gibberish
    const brandVal = SanityEngine.validateDescriptiveField("Brand / Company", document.getElementById("lostBrand").value, 2);
    const matVal = SanityEngine.validateDescriptiveField("Build Material", document.getElementById("lostMaterial").value, 3);
    const wallVal = SanityEngine.validateDescriptiveField("Observable Wallpaper", document.getElementById("lostWallpaper").value, 3);
    const colVal = SanityEngine.validateDescriptiveField("Color / Case", document.getElementById("lostColor").value, 3);
    const lastSeenVal = SanityEngine.validateDescriptiveField("Last Seen Location", document.getElementById("lostLastSeen").value, 4);

    if (!brandVal.valid) errors.push(brandVal.message);
    if (!matVal.valid) errors.push(matVal.message);
    if (!wallVal.valid) errors.push(wallVal.message);
    if (!colVal.valid) errors.push(colVal.message);
    if (!lastSeenVal.valid) errors.push(lastSeenVal.message);

    if (errors.length > 0) {
      showSanityAlertBanner(errors.join("<br>"));
      return;
    }

    const newItem = {
      id: Date.now(),
      type: "lost",
      title: `${title} (Lost Broadcast)`,
      category: category,
      imageUrl: uploadedImageBase64 || "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80",
      reporterName: nameVal.sanitized,
      reporterEmail: emailVal.sanitized,
      reporterBatch: batchVal.sanitized,
      reporterPhone: phoneVal.sanitized,
      locationZone: zone,
      lostDetails: {
        brand: brandVal.sanitized,
        material: matVal.sanitized,
        observableWallpaper: wallVal.sanitized,
        observableColor: colVal.sanitized,
        lastSeenLocation: lastSeenVal.sanitized,
        timestampLost: "Recently"
      },
      status: "searching",
      createdAt: "Just now"
    };

    incidents.unshift(newItem);
    alert("📢 Missing device broadcast published! Protected by Data Sanity.");
  }

  closeReportModal();
  renderFeed();
}


// --------------------------------------------------------------------------
// 7. CLAIM & AI SEMANTIC VERIFICATION MODAL
// --------------------------------------------------------------------------
function openClaimModal(id) {
  activeClaimIncident = incidents.find(i => i.id === id);
  if (!activeClaimIncident) return;

  document.getElementById("claimModalTitle").innerText = `Claiming: ${activeClaimIncident.title}`;
  const container = document.getElementById("claimQuestionsList");
  container.innerHTML = "";

  activeClaimIncident.questions.forEach((qObj, idx) => {
    const div = document.createElement("div");
    div.className = "p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1.5";
    div.innerHTML = `
      <label class="block text-xs font-semibold text-white">
        Q${idx + 1}: ${qObj.q}
      </label>
      <input type="text" data-q-idx="${idx}" class="apple-input claim-answer-input" placeholder="Type your answer (e.g. Mount Fuji, Aqua Blue, Type-C)..." required />
    `;
    container.appendChild(div);
  });

  document.getElementById("aiVerificationBox").classList.add("hidden");
  document.getElementById("claimSubmitBtn").classList.remove("hidden");
  document.getElementById("claimModal").classList.add("active");
}

function closeClaimModal() {
  document.getElementById("claimModal").classList.remove("active");
  activeClaimIncident = null;
}

function handleClaimSubmit(e) {
  e.preventDefault();
  if (!activeClaimIncident) return;

  // Validate Claimer Sanity
  const nameVal = SanityEngine.validateName(document.getElementById("claimerName").value);
  const emailVal = SanityEngine.validateEmail(document.getElementById("claimerEmail").value);
  const phoneVal = SanityEngine.validatePhone(document.getElementById("claimerPhone").value);

  if (!nameVal.valid) { alert(nameVal.message); return; }
  if (!emailVal.valid) { alert(emailVal.message); return; }
  if (!phoneVal.valid) { alert(phoneVal.message); return; }

  const inputs = document.querySelectorAll(".claim-answer-input");
  let totalScore = 0;
  const evaluations = [];

  inputs.forEach(input => {
    const idx = parseInt(input.getAttribute("data-q-idx"));
    const claimAns = input.value.trim();
    const expectedAns = activeClaimIncident.questions[idx].a.trim();

    // Run AI Semantic Evaluation
    const evalRes = SemanticAiMatcher.evaluatePair(expectedAns, claimAns);
    totalScore += evalRes.score;
    evaluations.push({
      question: activeClaimIncident.questions[idx].q,
      expected: expectedAns,
      claimed: claimAns,
      score: evalRes.score,
      reason: evalRes.reason
    });
  });

  const averageConfidence = Math.round((totalScore / inputs.length) * 100);
  const isMatch = averageConfidence >= 75; // Tolerates slight discrepancies (e.g. Mount Fuji vs Mountain, Aqua vs Cyan/Blue)

  const resultBox = document.getElementById("aiVerificationBox");
  resultBox.classList.remove("hidden");

  let evalDetailsHtml = evaluations.map(ev => `
    <div class="text-[11px] p-2 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
      <div class="text-slate-400"><strong>${ev.question}</strong></div>
      <div class="text-slate-200">Your answer: "<span class="text-white font-medium">${ev.claimed}</span>" • Match: <span class="text-cyan-400 font-bold">${Math.round(ev.score * 100)}%</span></div>
      <div class="text-[10px] text-slate-400 italic">${ev.reason}</div>
    </div>
  `).join("");

  if (isMatch) {
    const isHostel = activeClaimIncident.residenceType === "hostel";
    const custodyLoc = isHostel
      ? `Hostel: ${activeClaimIncident.hostelFloor}, ${activeClaimIncident.hostelRoom}`
      : `Campus Desk: ${activeClaimIncident.guardLocation}`;

    resultBox.className = "p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 space-y-3";
    resultBox.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 font-bold text-sm text-emerald-400">
          <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>AI Ownership Verification Passed! (${averageConfidence}% Confidence)</span>
        </div>
      </div>

      <div class="ai-confidence-bar">
        <div class="ai-confidence-fill" style="width: ${averageConfidence}%"></div>
      </div>

      <p class="text-xs text-slate-300">
        The AI resolved minor discrepancies (e.g. Mountain ↔ Mount Fuji / Aqua ↔ Cyan/Blue) and authenticated you as the genuine owner.
      </p>

      <div class="space-y-1.5">${evalDetailsHtml}</div>

      <!-- REVEAL ROOM NO & CALLABLE PHONE (EMAIL STRICTLY SUPPRESSED FOR PRIVACY) -->
      <div class="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-1.5 text-xs">
        <div class="text-white font-medium">📍 Custody Location: <strong class="text-emerald-300">${custodyLoc}</strong></div>
        <div class="text-white font-medium">👤 Custodian: <span class="text-slate-300">${activeClaimIncident.reporterName} (${activeClaimIncident.reporterBatch})</span></div>
        <div class="text-white font-medium">📞 Direct Phone: <a href="tel:${activeClaimIncident.reporterPhone}" class="text-cyan-400 underline font-bold">${activeClaimIncident.reporterPhone}</a></div>
        <div class="text-[10px] text-slate-400 italic">Custodian email has been masked to protect student privacy.</div>
      </div>

      <a href="tel:${activeClaimIncident.reporterPhone}" class="pixel-tap inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition shadow-lg shadow-emerald-500/30">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <span>Call Custodian Now</span>
      </a>
    `;
    document.getElementById("claimSubmitBtn").classList.add("hidden");
  } else {
    resultBox.className = "p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 space-y-2";
    resultBox.innerHTML = `
      <div class="font-bold text-sm text-rose-400 flex items-center gap-2">
        <svg class="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Verification Mismatch (${averageConfidence}% Confidence)</span>
      </div>
      <div class="ai-confidence-bar">
        <div class="ai-confidence-fill !bg-rose-500" style="width: ${averageConfidence}%"></div>
      </div>
      <p class="text-xs text-slate-300">The provided answers differed too significantly from the finder's security parameters.</p>
      <div class="space-y-1.5">${evalDetailsHtml}</div>
    `;
  }
}


// --------------------------------------------------------------------------
// 8. CAMPUS VULNERABILITY ANALYTICS HEATMAP MODAL
// --------------------------------------------------------------------------
function openAnalyticsModal() {
  const container = document.getElementById("analyticsZonesList");
  container.innerHTML = "";

  campusVulnerabilityData.zones.forEach(zone => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-inner";
    
    let itemsList = zone.topLostItems.map(it => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-white/5">
        <span class="text-slate-200">${it.item}</span>
        <span class="font-mono text-cyan-300 font-bold">${it.probability} risk</span>
      </div>
    `).join("");

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl">${zone.icon}</span>
          <h4 class="text-sm font-bold text-white">${zone.name}</h4>
        </div>
        <span class="apple-capsule ${zone.riskLevel === 'Critical' ? 'text-rose-300 border-rose-500/40 bg-rose-950/40' : 'text-amber-300 border-amber-500/40 bg-amber-950/40'}">
          ${zone.riskLevel} Risk
        </span>
      </div>

      <div class="space-y-1">${itemsList}</div>

      <div class="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-400">
        💡 <strong class="text-slate-300">Campus Insight:</strong> ${zone.insight}
      </div>
    `;
    container.appendChild(card);
  });

  document.getElementById("analyticsModal").classList.add("active");
}

function closeAnalyticsModal() {
  document.getElementById("analyticsModal").classList.remove("active");
}
