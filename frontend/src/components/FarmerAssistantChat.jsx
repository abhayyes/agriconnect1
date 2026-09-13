import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Send,
  Sprout,
  Bot,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ *
 *  Kisan Assistant — a comprehensive farmer-query knowledge base.
 *  Intent matching is keyword/score based and fully on-device so it works
 *  offline. To later back this with a real LLM, swap `answer` to call an
 *  endpoint (e.g. an OpenAI/Vertex/AI-service /chat route) and keep the
 *  same UI contract: answerText + optional { label, path } quick links.
 * ------------------------------------------------------------------ */

const GREETING =
  'Namaste! 🙏 I am your **Kisan Assistant**. I can help with mandi prices, ' +
  'government schemes (PM Kisan, crop insurance, KCC), sowing guidance, ' +
  'fertilizers, pest control, irrigation, selling on AgriConnect and much more. ' +
  'Ask me anything about farming!';

// Each intent: keywords are lower-cased fragments; response may include
// "**bold**" markers and a list of { label, path } quick links.
const INTENTS = [
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'good morning', 'good evening', 'how are you'],
    response: 'Hello! 😊 I\'m here to help your farm grow. Ask me about mandi prices, ' +
      'PM Kisan, crop insurance, fertilizers, pest control, or selling your harvest on AgriConnect.'
  },
  {
    id: 'help',
    keywords: ['help', 'options', 'what can you', 'what do you', 'capabilities', 'menu', 'how do you work'],
    response: 'I can answer questions about:\n' +
      '• **Mandi / crop prices** — type e.g. "tomato price today"\n' +
      '• **Government schemes** — PM Kisan, crop insurance, KCC\n' +
      '• **Farming guidance** — sowing, irrigation, fertilizer, pests\n' +
      '• **Selling on AgriConnect** — listing a crop, tracking orders\n\n' +
      'Just ask in plain words — try the quick tips below! 👇'
  },
  {
    id: 'pmkisan',
    keywords: ['pm kisan', 'pmkisan', 'samman nidhi', 'fm 6000', '6,000', '6000', 'pmkisan credits', 'direct benefit'],
    response: '**PM Kisan Samman Nidhi** gives eligible farmers ₹6,000/year, paid as ₹2,000 every 4 months directly via UPI/bank Aadhaar-linked account.\n\n' +
      'Eligibility: small & marginal farmers (~₹2 lakh income). Registration: **pmkisan.gov.in** with your Aadhaar + land records + bank details. Check beneficiary status on the portal or via the PM Kisan mobile app.'
  },
  {
    id: 'cropinsurance',
    keywords: ['crop insurance', 'pmfby', 'fasal bima', 'insurance', 'pradhan mantri fasal', 'claim', 'compensation crop'],
    response: 'PM Fasal Bima Yojana (PMFBY) insures your crop against natural calamities, pests & diseases.\n\n' +
      '• **Premium**: ~2% (Kharif), ~1.5% (Rabi) of sum insured; commercial/horticultural crops ~5%.\n' +
      '• **Where**: buy through the PMFBY portal, your bank, cooperative, or common service centre (CSC) before the notified cut-off.\n' +
      '• **Claim**: notify the bank/CSC within 72 hours of an event; appraisers assess losses and compensation is routed to your bank.'
  },
  {
    id: 'kcc',
    keywords: ['kisan credit card', 'kcc', 'credit card kisan', 'farm loan', 'agriculture loan', 'crop loan', 'finance'],
    response: '**Kisan Credit Card (KCC)** gives you a flexible loan for seeds, fertilizer, equipment and crop expenses.\n\n' +
      '• **Limit**: often up to ₹3 lakh (Kharif + Rabi needs) at subsidised interest; ₹4 lakh+ with collateral for bigger needs.\n' +
      '• **Apply**: any nationalised/cooperative/RRB bank or PACS with land records, valid ID, and crop plan. Recent schemes also extend KCC to farmers who rear cattle, poultry & fisheries.'
  },
  {
    id: 'msclp',
    keywords: ['earth loan', 'msp compensation', 'pradhan mantri, pratham', 'loan waiver', 'debt relief', 'short-term crop loan'],
    response: '**Interest Subvention / short-term crop loan** — farmers get crop loans up to ₹3 lakh at **4% interest** (7% - 3% prompt-repayment incentive from the govt). Borrowers who repay on time also get additional interest subvention under the Modified Interest Subvention Scheme (MIS). If you miss a payment, talk to your bank branch about restructuring options.'
  },
  {
    id: 'mandi',
    keywords: ['mandi price', 'market price', 'price today', 'rate today', 'mandi rate', 'price of', 'price of tomato', 'crop price', 'selling price', 'khaderi', 'pic niece'],
    response: 'Mandi prices move with district demand, season and quality grade.\n\n' +
      '• On **AgriConnect**, live listings show buyer-side prices — compare them with your local APMC before selling.\n' +
      '• For real-time APMC rates, check **eNAM (enam.gov.in)** or your state agri-marketing portal.\n' +
      '• Tip: selling directly to buyers here removes the middleman margin, so you often net a higher per-kg price than the mandi.'
  },
  {
    id: 'mandi_tomato',
    keywords: ['tomato'],
    response: 'For the latest **tomato** rates: check **eNAM (enam.gov.in)** for your district APMC or view open buyer bids under the Marketplace on AgriConnect. Tomato prices swing fast with supply — consider grading (A+/Prime) to fetch a better rate and listing in the Farmer Studio dashboard.'
  },
  {
    id: 'mandi_wheat',
    keywords: ['wheat', 'gehu', 'ganhu'],
    response: '**Wheat** quality & grade decide the rate: bold, clean grain at ~15% moisture fetches the best price. Across AgriConnect you can list and compare buyer prices directly. Many farmers also check the announced **MSP** for Rabi wheat APMC procurement before selling.'
  },
  {
    id: 'mandi_rice',
    keywords: ['rice', 'paddy', 'dhan', 'chawal'],
    response: '**Paddy/rice**: common grades are FAQ and I-grade; moisture under 17% is key. Sell paddy through procurement centres to get MSP + bonus, OR dry, mill and sell directly on AgriConnect for a higher margin.'
  },
  {
    id: 'msp',
    keywords: ['msp', 'minimum support price', 'support price', 'procurement price'],
    response: '**MSP (Minimum Support Price)** is the govt-guaranteed floor price set for ~22 notified crops (paddy, wheat, pulses, oilseeds…) announced before each season.\n\n' +
      '• The govt buys at MSP through agencies (NAFED, FCI, PACS) when market price is below it.\n' +
      '• Scheme: 2023-24 Guaranteed MSP at **at least 50% above the cost of production**.\n' +
      '• You can sell above MSP in open/mandi markets if prices are higher — and on AgriConnect you compare real buyer prices.'
  },
  {
    id: 'kharif',
    keywords: ['kharif', 'monsoon crop', 'first season', 'rainy season crop'],
    response: '**Kharif** — sown with the onset of monsoon (June–July, harvested Sep–Oct). Main crops: paddy, cotton, maize, jowar/bajra, pulses (moong, arhar), groundnut, soybean, sugarcane, vegetables.\n\n' +
      'Start land prep and seed/fertilizer arrangements before the first rains start.'
  },
  {
    id: 'rabi',
    keywords: ['rabi', 'winter crop', 'second season'],
    response: '**Rabi** — sown Oct–Dec after the monsoon, harvested March–April with winter moisture or irrigation. Main crops: wheat, barley, mustard, gram (chana), peas, potato.\n\n' +
      'Ensure residual moisture or irrigation scheduling for a good rabi.'
  },
  {
    id: 'sowing',
    keywords: ['sowing', 'planting', 'when to sow', 'when to plant', 'seed rate', 'crop season', 'what to grow'],
    response: 'Choose a season, then a crop matched to your soil, water and market:\n\n' +
      '• **Kharif (Jun–Jul)**: paddy, maize, cotton, pulses, soybean.\n' +
      '• **Rabi (Oct–Dec)**: wheat, mustard, gram, potato.\n' +
      '• Use treated, certified seed at the recommended seed rate for your crop, and do a **soil test** before deciding fertilizer.\n\n' +
      'Tip: crops with steady local demand and short cycles (onion, tomato, leafy greens) rotate well and keep cash flowing.'
  },
  {
    id: 'seed',
    keywords: ['seed', 'seeds', 'seed treatment', 'certified seed', 'sowing seed', 'bech'],
    response: 'Use **certified/quality seeds** from authorized agencies or the state seed corporation. Treat seeds before sowing (fungicide/insecticide as per crop) to prevent soil-borne disease. Store seeds in cool, dry, rodent-proof containers. For hybrids, always follow the recommended seed rate — using too much raises cost without raising yield.'
  },
  {
    id: 'fertilizer',
    keywords: ['fertilizer', 'fertiliser', 'urea', 'dap', 'npk', 'manure', 'khad', 'potash', 'phosphorus', 'nutrient'],
    response: 'Apply fertilizer **based on a soil test**, not habit:\n\n' +
      '• **Urea (N)** — leafy growth; apply in splits to reduce losses.\n' +
      '• **DAP (P)** — root & seed/energy; apply at sowing.\n' +
      '• **Potash (K)/MOP** — fruit quality, drought & cold tolerance.\n\n' +
      'Subsidised **urea** is sold via PDS with a registered retailer/KCC-linked purchase on the DBT portal. Balance NPK with compost/vermicompost to keep the soil alive.'
  },
  {
    id: 'urea',
    keywords: ['urea', 'urea subsidy', 'neem coated urea'],
    response: '**Urea** is subsidised and sold under the DBT — buy through a registered retailer with your Aadhaar/POS (limit ~16 bags/farmer per season).\n\n' +
      '**Neem-coated urea** (mandatory) releases nitrogen slowly and improves efficiency. Use split doses and combine with organic manure to avoid leaching and soil hardening.'
  },
  {
    id: 'pest',
    keywords: ['pest', 'pesticide', 'insecticide', 'bugs', 'insect', 'attack', 'borer', 'aphid', 'caterpillar', 'spray'],
    response: 'Pest control 101:\n\n' +
      '• **Identify first** — confirm the pest/disease before spraying; wrong sprays waste money and kill beneficial insects.\n' +
      '• **IPM**: use resistant/tolerant varieties, trap crops, sticky traps, neem-based sprays, and biocontrol (Trichogramma) before reaching for chemicals.\n' +
      '• If chemicals are needed, use the **recommended dose** at the right stage (not close to harvest), wear protective gear, and respect the pre-harvest interval.\n\n' +
      'For exact sprays, contact your state agriculture department or Krishi Vigyan Kendra (KVK).'
  },
  {
    id: 'disease',
    keywords: ['disease', 'leaf yellow', 'rust', 'blight', 'mildew', 'rot', 'crop disease', 'wilt', 'virus plant'],
    response: 'Common crop diseases: come from fungi, bacteria or viruses.\n\n' +
      '• **Fungus**: powdery mildew, rust, blight — apply recommended fungicide, improve air flow, avoid overhead watering late.\n' +
      '• **Bacteria/viruses**: often carried by pests — control the vector (aphids/hoppers) and remove infected plants.\n\n' +
      'Practice crop rotation, clean tools, and buy disease-free seed. For a precise diagnosis, reach your **KVK / state agriculture helpline** with a photo of the affected plant.'
  },
  {
    id: 'irrigation',
    keywords: ['irrigation', 'watering', 'water', 'drip', 'sprinkler', 'borewell', 'water shortage', 'micro irrigation', 'save water'],
    response: 'Irrigation tips:\n\n' +
      '• **Drip irrigation** + mulching saves 30–50% water and raises yield — you can get a **subsidy (~40–90%)** under PM Krishi Sinchayee Yojana’s micro-irrigation stream.\n' +
      '• Irrigate in morning/evening to cut evaporation; schedule by crop stage (critical stages: flowering, grain filling) rather than a fixed calendar.\n' +
      '• Rainwater harvesting / check dams help recharge groundwater for dry spells.'
  },
  {
    id: 'pmksy',
    keywords: ['pmksy', 'krishi sinchayee', 'micro irrigation subsidy', 'drip subsidy', 'sprinkler subsidy'],
    response: '**PM Krishi Sinchayee Yojana (PMKSY)** promotes "Per Drop More Crop".\n\n' +
      '• Micro-irrigation (drip/sprinkler) subsidies are state-wise, typically **40–90%** of system cost.\n' +
      '• Apply at your state agriculture department / local agricultural engineering office with land & bank documents.\n' +
      '• Also look for state schemes supporting farm ponds, water channels and solar pump sets.'
  },
  {
    id: 'weather',
    keywords: ['weather', 'rain', 'forecast', 'rainfall', 'climate', 'monsoon', 'temperature', 'humidity'],
    response: 'Plan with the season (Kharif/Rabi) and monitor forecasts during critical stages:\n\n' +
      '• Use **IMD / Meghdoot app** and district agromet advisories (AMS) for sowing and spray windows.\n' +
      '• Time sowing so flowering doesn\'t collide with peak rain.\n' +
      '• Excessive / deficit rain — adjust irrigation, drainage and pest control accordingly.\n' +
      '• For insured crops, a notified weather event helps you claim under PMFBY.'
  },
  {
    id: 'soil',
    keywords: ['soil test', 'soil testing', 'soil health card', 'ph soil', 'soil testing lab', 'soil nutrient'],
    response: '**Soil Health Card (SHC)** — free soil testing for farmers, issued every ~2 years by the state soil lab.\n\n' +
      '• Print a **soil health card** and see soil pH, NPK, micronutrients and the recommended fertilizer dose.\n' +
      '• Take samples before fertilizing, from multiple spots, and submit to your KVK / soil testing lab.\n' +
      '• Correct pH (lime/sulfur), add organic matter, and balance NPK to fix nutrient deficiencies rather than over-applying urea.'
  },
  {
    id: 'organic',
    keywords: ['organic', 'organic farming', 'chemical free', 'organic certification', 'np bizarre', 'vermicompost', 'natural farming'],
    response: 'Organic farming keeps soil and food chemical-free:\n\n' +
      '• Use compost, vermicompost, green manures (dhaincha, sunn hemp) and bio-fertilizers (rhizobium, Azotobacter, PSB).\n' +
      '• Natural pest control: neem, trap crops, Trichoderma, beneficial insects.\n' +
      '• **Certification**: through APEDA/NPOP or a licensed certification body (3-year transition). Organic produce often sells at a premium — list it as "Certified Organic" on AgriConnect.\n\n' +
      'For large scale, consider **drought/natural farming (prakritik kheti)** state schemes too.'
  },
  {
    id: 'storage',
    keywords: ['storage', 'cold storage', 'warehouse', 'godown', 'silo', 'storage subsidy', 'store crop', 'post harvest'],
    response: 'Post-harvest storage protects your price:\n\n' +
      '• Dry grain to safe moisture, clean, and store in airtight silos/gunny bags on pallets.\n' +
      '• **Warehouse receipts** (via CWC/state warehousing corporations) let you hold produce and borrow ~80% against the receipt.\n' +
      '• Cold storage suits horticulture — subsidies exist under RKVY / cold chain schemes; check your state for a facility.'
  },
  {
    id: 'wheater_postharvest',
    keywords: ['post harvest', 'harvesting', 'threshing', 'grading', 'processing', 'drying'],
    response: 'Good post-harvest = better money:\n\n' +
      '• Harvest at the right stage, avoid moisture/mud, dry and clean before weighing.\n' +
      '• **Grade & sort** — graded lots fetch higher prices; on AgriConnect you mark a quality grade.\n' +
      '• Quick dispatch after harvest reduces shrink and lets you sell when demand is strong.'
  },
  {
    id: 'sell',
    keywords: ['sell', 'selling', 'how to sell', 'list crop', 'listing', 'marketplace', 'sell my crop', 'market', 'buyer'],
    response: 'You can sell directly to buyers on **AgriConnect** — no middleman:\n\n' +
      '1. Keep your login as **Farmer** and open the **Farmer Studio (dashboard)**.\n' +
      '2. Tap **"List New Crop"** → enter name, quantity, price per kg and quality grade.\n' +
      '3. Buyers see it in the Marketplace and place orders; you confirm, itinerary-optimised delivery is dispatched.\n' +
      '4. Payment is settled **directly to your bank via UPI**.',
    links: [{ label: 'Open Farmer Studio', path: '/dashboard' }]
  },
  {
    id: 'track',
    keywords: ['track order', 'track', 'delivery', 'order status', 'shipment', 'where is my order', 'tracking', 'delivered'],
    response: 'Track any order from the **Orders** page — you\'ll see the live status (Placed → Confirmed → Shipped → Delivered) and the AI-optimised delivery route with ETA.\n\n' +
      'Open **Track Order** on any order to see the dispatch timeline and route details in real time.',
    links: [{ label: 'View Orders', path: '/orders' }]
  },
  {
    id: 'payment',
    keywords: ['payment', 'upi', 'settlement', 'money', 'earn', 'receive payment', 'paid', 'bank settlement'],
    response: 'When an order is delivered, the payment is settled **directly to your linked bank account via UPI** — transparent, no broker fee. You can watch your total earned revenue and the settlement log from the Farmer Studio dashboard. Keep your bank/UPI details updated in your profile to avoid delays.'
  },
  {
    id: 'logistics',
    keywords: ['logistics', 'transport', 'shipping', 'delivery partner', 'dispatch', 'freight', 'route', 'pickup'],
    response: 'AgriConnect plans **optimised delivery routes** for each dispatch:\n\n' +
      '• The AI service computes the shortest multi-stop route, distance, and ~ETA between the farm and buyers.\n' +
      '• You get a recommended route and cost before dispatch.\n' +
      '• **Subsidised cold-chain/logistics** support is available under Ministry of Food Processing schemes — ask your state NPC for cold storage & reefer assistance for perishables.'
  },
  {
    id: 'fpo',
    keywords: ['fpo', 'farmer producer', 'producer company', 'fpc', 'cooperative', 'group farming', 'fpo registration'],
    response: 'An **FPO (Farmer Producer Organisation)** is a collective of farmers that buys inputs, pools and sells produce, and accesses credit/insurance collectively.\n\n' +
      '• Govt promotes FPOs under **Formation & Promotion of 10,000 FPOs** — ₹18–25 lakh seed capital + handholding.\n' +
      '• You can register an FPO as a Producer Company (MCA) or Cooperative with a cluster of ~300+ member farmers.\n' +
      '• On AgriConnect, FPO accounts can also list produce at the producer level.'
  },
  {
    id: 'market_link',
    keywords: ['link market', 'sell online', 'e nam', 'enam', 'apmc', 'mandi', 'online selling', 'agri market'],
    response: 'Connect to wider markets:\n\n' +
      '• **eNAM** links APMC mandis online — register your profile & bid on notified lots for online price discovery.\n' +
      '• **AgriConnect** lets you bypass the mandi entirely and sell directly to buyers at transparent prices.\n' +
      '• Combine both: compare eNAM floor vs AgriConnect buyer bids and pick the best net price.'
  },
  {
    id: 'labour',
    keywords: ['labour', 'workers', 'hiring', 'farm labour', 'manpower', 'machinery', 'rent tractor', 'custom hiring'],
    response: 'For labour & machinery:\n\n' +
      '• **Custom Hiring Centres (CHC)** offer tractor, rice transplanter, harvester, and sprayer on rent at subsidy rates — check your KVK/ag state dept.\n' +
      '• Seasonal labour: plan needs before sowing/harvest; group FPOs can bargain better rates and insure periodic labour.\n' +
      '• Look into **Drone & machinery** subsidy schemes under sub-missions of the ag ministry for large holdings.'
  },
  {
    id: 'cow_dairy',
    keywords: ['cow', 'dairy', 'milk', 'cattle', 'livestock', 'animal', 'poultry', 'goat'],
    response: 'Livestock & allied income:\n\n' +
      '• Sell milk/buffalo directly via dairy cooperatives (like Amul) or federations — they fix transparent monthly procurement prices.\n' +
      '• **NABARD & state** offer loans for dairy, poultry, goatery & beekeeping; KCC now also covers livestock.\n' +
      '• Keep vaccination records and feed balanced ration; insurance for cattle is available under state livestock schemes.'
  },
  {
    id: 'default',
    keywords: ['default'],
    response: 'Hmm, that\'s outside my farm-knowledge base for now. 🤔 Try asking about:\n\n' +
      '• **PM Kisan** (₹6000/year scheme)\n' +
      '• **Crop insurance** / PMFBY\n' +
      '• **Mandi crop prices** (e.g. "tomato price")\n' +
      '• **Fertilizer / urea / DAP**\n' +
      '• **Pest & disease control**\n' +
      '• **Selling on AgriConnect** or **tracking an order**\n\n' +
      'Or type **"help"** to see everything I answer.'
  }
];

// Reply text for mobile/JSX rendering with lines & bold markers.
function renderRich(reply) {
  // Split on \n; each line becomes a <p>. Convert **bold** to <strong>.
  return reply.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    const node = parts.map((part, idx) =>
      idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part
    );
    return (
      <p key={i} className="text-sm leading-relaxed text-[#3A4036] first:mt-0">
        {node}
      </p>
    );
  });
}

function matchIntent(raw) {
  const q = raw.toLowerCase().trim();
  if (!q) return INTENTS[INTENTS.length - 1]; // default
  let best = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (q.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return best || INTENTS[INTENTS.length - 1];
}

const QUICK_TIPS = [
  'PM Kisan scheme',
  'Crop insurance',
  'Tomato mandi price',
  'Urea subsidy',
  'Pest control',
  'How to sell on AgriConnect',
  'Track my order'
];

export default function FarmerAssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: GREETING, links: [] }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  const send = (text) => {
    const q = (text ?? '').trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q, links: [] }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const intent = matchIntent(q);
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: intent.response, links: intent.links || [] }
      ]);
      setTyping(false);
    }, 650);
  };

  return (
    <>
      {/* Floating chat launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open Kisan Assistant'}
        className="fixed bottom-5 right-5 z-[70] group flex items-center gap-2"
      >
        <AnimatePresence>
          {!open && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="hidden sm:inline text-xs font-semibold text-[#232921] bg-white border border-[#E5DCCF] px-3 py-1.5 rounded-full shadow-sm"
            >
              Ask Kisan Assistant
            </motion.span>
          )}
        </AnimatePresence>
        <motion.div
          whileTap={{ scale: 0.92 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-colors cursor-pointer ${
            open ? 'bg-[#991B1B]' : 'bg-[#2D5A38] hover:bg-[#1E3D27]'
          }`}
        >
          {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          {!open && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
          )}
        </motion.div>
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-[70] w-[380px] max-w-[calc(100vw-1.5rem)] h-[540px] max-h-[calc(100vh-5rem)] bg-white rounded-2xl border border-[#E5DCCF] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#2D5A38] text-[#FAF7F2] px-4 py-3 flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#2D5A38]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-sm font-heading">
                  Kisan Assistant
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <div className="text-[11px] text-[#C2D6C6]">Farmer queries · answered instantly</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-[#C2D6C6] hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF7F2]">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-[#2D5A38] text-white text-sm shadow-sm'
                        : 'max-w-[92%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-[#E5DCCF] shadow-sm'
                    }
                  >
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[#2D5A38]">
                        <Bot className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Kisan Assistant</span>
                      </div>
                    )}
                    {renderRich(m.text)}
                    {m.links && m.links.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        {m.links.map((l, i) => (
                          <button
                            key={i}
                            onClick={() => { setOpen(false); navigate(l.path); }}
                            className="flex items-center gap-1 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#2D5A38] bg-[#E8F0E9] border border-[#C2D6C6] hover:bg-[#dce9df] transition-colors cursor-pointer"
                          >
                            {l.label}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-[#E5DCCF] shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C2D6C6] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C2D6C6] animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C2D6C6] animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick tips */}
            <div className="px-3 pt-2 pb-1 bg-[#FAF7F2] border-t border-[#E5DCCF]">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TIPS.map((tip) => (
                  <button
                    key={tip}
                    onClick={() => send(tip)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium text-[#2D5A38] bg-[#E8F0E9] border border-[#C2D6C6] hover:bg-[#dce9df] transition-colors cursor-pointer"
                  >
                    {tip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-[#E5DCCF] flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
                placeholder="Ask about mandi, schemes, pests…"
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DCCF] text-sm text-[#232921] placeholder-[#8E9687] focus:outline-none focus:border-[#2D5A38] focus:bg-white transition-colors"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-[#2D5A38] hover:bg-[#1E3D27] text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}