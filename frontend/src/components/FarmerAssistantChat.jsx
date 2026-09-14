import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
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

const GREETING = {
  en:
    'Namaste! 🙏 I am your **Kisan Assistant**. I can help with mandi prices, ' +
    'government schemes (PM Kisan, crop insurance, KCC), sowing guidance, ' +
    'fertilizers, pest control, irrigation, selling on AgriConnect and much more. ' +
    'Ask me anything about farming!',
  hi:
    'नमस्ते! 🙏 मैं आपका **किसान सहायक** हूँ। मैं मंडी भाव, सरकारी योजनाएँ ' +
    '(पीएम किसान, फसल बीमा, केसीसी), बुवाई मार्गदर्शन, खाद, कीटनाशक, ' +
    'सिंचाई, एग्रीकनेक्ट पर बिक्री और बहुत कुछ में मदद कर सकता हूँ। ' +
    'खेती से जुड़ा कोई भी सवाल पूछें!',
};

// Each intent: keywords are lower-cased fragments (English + Hindi);
// response is bilingual { en, hi } and may include "**bold**" markers and
// a list of { label, path } quick links.
const INTENTS = [
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'good morning', 'good evening', 'how are you', 'नमस्ते', 'नमस्कार', 'कैसे हो', 'सहायता'],
    response: {
      en: 'Hello! 😊 I\'m here to help your farm grow. Ask me about mandi prices, ' +
        'PM Kisan, crop insurance, fertilizers, pest control, or selling your harvest on AgriConnect.',
      hi: 'नमस्ते! 😊 मैं आपकी खेती बढ़ाने में मदद के लिए हूँ। मुझसे मंडी भाव, ' +
        'पीएम किसान, फसल बीमा, खाद, कीट नियंत्रण, या एग्रीकनेक्ट पर अपनी फसल बेचने के बारे में पूछें।'
    }
  },
  {
    id: 'help',
    keywords: ['help', 'options', 'what can you', 'what do you', 'capabilities', 'menu', 'how do you work', 'मदद', 'क्या कर सकते', 'विकल्प', 'कैसे काम'],
    response: {
      en: 'I can answer questions about:\n' +
        '• **Mandi / crop prices** — type e.g. "tomato price today"\n' +
        '• **Government schemes** — PM Kisan, crop insurance, KCC\n' +
        '• **Farming guidance** — sowing, irrigation, fertilizer, pests\n' +
        '• **Selling on AgriConnect** — listing a crop, tracking orders\n\n' +
        'Just ask in plain words — try the quick tips below! 👇',
      hi: 'मैं इन सवालों के जवाब दे सकता हूँ:\n' +
        '• **मंडी / फसल भाव** — जैसे लिखें "आज टमाटर का भाव"\n' +
        '• **सरकारी योजनाएँ** — पीएम किसान, फसल बीमा, केसीसी\n' +
        '• **खेती मार्गदर्शन** — बुवाई, सिंचाई, खाद, कीट\n' +
        '• **एग्रीकनेक्ट पर बिक्री** — फसल लिस्ट करना, ऑर्डर ट्रैक करना\n\n' +
        'सीधे शब्दों में पूछें — नीचे दिए गए क्विक टिप्स आज़माएँ! 👇'
    }
  },
  {
    id: 'pmkisan',
    keywords: ['pm kisan', 'pmkisan', 'samman nidhi', 'fm 6000', '6,000', '6000', 'pmkisan credits', 'direct benefit', 'पीएम किसान', 'प्रधानमंत्री किसान', 'सम्मान निधि', 'छह हजार', '6000 रुपये'],
    response: {
      en: '**PM Kisan Samman Nidhi** gives eligible farmers ₹6,000/year, paid as ₹2,000 every 4 months directly via UPI/bank Aadhaar-linked account.\n\n' +
        'Eligibility: small & marginal farmers (~₹2 lakh income). Registration: **pmkisan.gov.in** with your Aadhaar + land records + bank details. Check beneficiary status on the portal or via the PM Kisan mobile app.',
      hi: '**पीएम किसान सम्मान निधि** पात्र किसानों को ₹6,000/वर्ष देती है, जो हर 4 महीने में ₹2,000 के रूप में सीधे यूपीआई/बैंक आधार-लिंक्ड खाते में मिलती है।\n\n' +
        'पात्रता: छोटे और सीमांत किसान (~₹2 लाख आय)। पंजीकरण: **pmkisan.gov.in** पर आधार + भूमि रिकॉर्ड + बैंक विवरण के साथ। पोर्टल या पीएम किसान मोबाइल ऐप से लाभार्थी स्थिति देखें।'
    }
  },
  {
    id: 'cropinsurance',
    keywords: ['crop insurance', 'pmfby', 'fasal bima', 'insurance', 'pradhan mantri fasal', 'claim', 'compensation crop', 'फसल बीमा', 'प्रधानमंत्री फसल बीमा', 'प्रीमियम', 'दावा'],
    response: {
      en: 'PM Fasal Bima Yojana (PMFBY) insures your crop against natural calamities, pests & diseases.\n\n' +
        '• **Premium**: ~2% (Kharif), ~1.5% (Rabi) of sum insured; commercial/horticultural crops ~5%.\n' +
        '• **Where**: buy through the PMFBY portal, your bank, cooperative, or common service centre (CSC) before the notified cut-off.\n' +
        '• **Claim**: notify the bank/CSC within 72 hours of an event; appraisers assess losses and compensation is routed to your bank.',
      hi: 'प्रधानमंत्री फसल बीमा योजना (पीएमएफबीवाई) आपकी फसल को प्राकृतिक आपदा, कीट और बीमारियों से बचाती है।\n\n' +
        '• **प्रीमियम**: बीमा राशि का ~2% (खरीफ), ~1.5% (रबी); व्यावसायिक/बागवानी फसलें ~5%।\n' +
        '• **कहाँ**: बताई गई तिथि से पहले पीएमएफबीवाई पोर्टल, अपने बैंक, सहकारी समिति या कॉमन सर्विस सेंटर (सीएससी) से खरीदें।\n' +
        '• **दावा**: घटना के 72 घंटे के भीतर बैंक/सीएससी को सूचित करें; मूल्यांकनकर्ता नुकसान आँकते हैं और मुआवज़ा आपके बैंक में पहुँचाया जाता है।'
    }
  },
  {
    id: 'kcc',
    keywords: ['kisan credit card', 'kcc', 'credit card kisan', 'farm loan', 'agriculture loan', 'crop loan', 'finance', 'किसान क्रेडिट कार्ड', 'फसल ऋण', 'कृषि ऋण', 'कर्ज'],
    response: {
      en: '**Kisan Credit Card (KCC)** gives you a flexible loan for seeds, fertilizer, equipment and crop expenses.\n\n' +
        '• **Limit**: often up to ₹3 lakh (Kharif + Rabi needs) at subsidised interest; ₹4 lakh+ with collateral for bigger needs.\n' +
        '• **Apply**: any nationalised/cooperative/RRB bank or PACS with land records, valid ID, and crop plan. Recent schemes also extend KCC to farmers who rear cattle, poultry & fisheries.',
      hi: '**किसान क्रेडिट कार्ड (केसीसी)** बीज, खाद, उपकरण और फसल खर्च के लिए लचीला ऋण देता है।\n\n' +
        '• **सीमा**: अक्सर ₹3 लाख तक (खरीफ + रबी की ज़रूरतें) सब्सिडी वाले ब्याज पर; बड़ी ज़रूरतों के लिए ₹4 लाख+ गारंटी के साथ।\n' +
        '• **आवेदन**: कोई भी राष्ट्रीयकृत/सहकारी/आरआरबी बैंक या पैक्स, भूमि रिकॉर्ड, वैध आईडी और फसल योजना के साथ। हाल की योजनाएँ पशुपालन, मुर्गीपालन और मत्स्य पालन करने वाले किसानों तक भी केसीसी बढ़ाती हैं।'
    }
  },
  {
    id: 'msclp',
    keywords: ['earth loan', 'msp compensation', 'pradhan mantri, pratham', 'loan waiver', 'debt relief', 'short-term crop loan', 'ब्याज अनुदान', 'अल्पकालिक ऋण', 'कर्ज माफी'],
    response: {
      en: '**Interest Subvention / short-term crop loan** — farmers get crop loans up to ₹3 lakh at **4% interest** (7% - 3% prompt-repayment incentive from the govt). Borrowers who repay on time also get additional interest subvention under the Modified Interest Subvention Scheme (MIS). If you miss a payment, talk to your bank branch about restructuring options.',
      hi: '**ब्याज अनुदान / अल्पकालिक फसल ऋण** — किसानों को **4% ब्याज** पर ₹3 लाख तक फसल ऋण मिलता है (7% - सरकार से समय पर चुकाने पर 3% प्रोत्साहन)। समय पर चुकाने वाले किसानों को संशोधित ब्याज अनुदान योजना (एमआईएस) के तहत अतिरिक्त ब्याज अनुदान भी मिलता है। चुकौती चूकने पर पुनर्गठन विकल्पों के लिए अपने बैंक शाखा से बात करें।'
    }
  },
  {
    id: 'mandi',
    keywords: ['mandi price', 'market price', 'price today', 'rate today', 'mandi rate', 'price of', 'price of tomato', 'crop price', 'selling price', 'khaderi', 'pic niece', 'मंडी भाव', 'बाजार भाव', 'आज का भाव', 'दाम'],
    response: {
      en: 'Mandi prices move with district demand, season and quality grade.\n\n' +
        '• On **AgriConnect**, live listings show buyer-side prices — compare them with your local APMC before selling.\n' +
        '• For real-time APMC rates, check **eNAM (enam.gov.in)** or your state agri-marketing portal.\n' +
        '• Tip: selling directly to buyers here removes the middleman margin, so you often net a higher per-kg price than the mandi.',
      hi: 'मंडी भाव जिले की माँग, मौसम और गुणवत्ता ग्रेड के साथ बदलते हैं।\n\n' +
        '• **एग्रीकनेक्ट** पर लाइव लिस्टिंग खरीदार-पक्ष के भाव दिखाती हैं — बेचने से पहले अपने स्थानीय एपीएमसी से तुलना करें।\n' +
        '• वास्तविक समय एपीएमसी भाव के लिए **ई-नाम (enam.gov.in)** या अपने राज्य के कृषि विपणन पोर्टल देखें।\n' +
        '• सुझाव: यहाँ सीधे खरीदारों को बेचने से बिचौलिए का लाभ हट जाता है, इसलिए अक्सर मंडी से ज़्यादा प्रति किलो भाव मिलता है।'
    }
  },
  {
    id: 'mandi_tomato',
    keywords: ['tomato', 'टमाटर'],
    response: {
      en: 'For the latest **tomato** rates: check **eNAM (enam.gov.in)** for your district APMC or view open buyer bids under the Marketplace on AgriConnect. Tomato prices swing fast with supply — consider grading (A+/Prime) to fetch a better rate and listing in the Farmer Studio dashboard.',
      hi: 'नवीनतम **टमाटर** भाव के लिए: अपने जिले के एपीएमसी हेतु **ई-नाम (enam.gov.in)** देखें या एग्रीकनेक्ट के मार्केटप्लेस में खुले खरीदार बोलियाँ देखें। टमाटर के भाव आपूर्ति के साथ तेज़ी से बदलते हैं — बेहतर भाव के लिए ग्रेडिंग (A+/प्राइम) पर विचार करें और फार्मर स्टूडियो डैशबोर्ड में लिस्ट करें।'
    }
  },
  {
    id: 'mandi_wheat',
    keywords: ['wheat', 'gehu', 'ganhu', 'गेहूं', 'गेहूँ'],
    response: {
      en: '**Wheat** quality & grade decide the rate: bold, clean grain at ~15% moisture fetches the best price. Across AgriConnect you can list and compare buyer prices directly. Many farmers also check the announced **MSP** for Rabi wheat APMC procurement before selling.',
      hi: '**गेहूं** की गुणवत्ता और ग्रेड भाव तय करते हैं: दाना साफ हो और ~15% नमी हो तो सबसे अच्छा भाव मिलता है। एग्रीकनेक्ट पर आप सीधे लिस्ट कर सकते हैं और खरीदार के भाव तुलना कर सकते हैं। कई किसान बेचने से पहले रबी गेहूं एपीएमसी खरीद के लिए घोषित **एमएसपी** भी देखते हैं।'
    }
  },
  {
    id: 'mandi_rice',
    keywords: ['rice', 'paddy', 'dhan', 'chawal', 'चावल', 'धान'],
    response: {
      en: '**Paddy/rice**: common grades are FAQ and I-grade; moisture under 17% is key. Sell paddy through procurement centres to get MSP + bonus, OR dry, mill and sell directly on AgriConnect for a higher margin.',
      hi: '**धान/चावल**: सामान्य ग्रेड एफएक्यू और आई-ग्रेड हैं; 17% से कम नमी ज़रूरी है। एमएसपी + बोनस के लिए धान क्रय केंद्रों पर बेचें, या सुखाकर, मिल कर एग्रीकनेक्ट पर सीधे ज़्यादा मार्जिन पर बेचें।'
    }
  },
  {
    id: 'msp',
    keywords: ['msp', 'minimum support price', 'support price', 'procurement price', 'एमएसपी', 'न्यूनतम समर्थन मूल्य'],
    response: {
      en: '**MSP (Minimum Support Price)** is the govt-guaranteed floor price set for ~22 notified crops (paddy, wheat, pulses, oilseeds…) announced before each season.\n\n' +
        '• The govt buys at MSP through agencies (NAFED, FCI, PACS) when market price is below it.\n' +
        '• Scheme: Guaranteed MSP at **at least 50% above the cost of production**.\n' +
        '• You can sell above MSP in open/mandi markets if prices are higher — and on AgriConnect you compare real buyer prices.',
      hi: '**एमएसपी (न्यूनतम समर्थन मूल्य)** सरकार द्वारा गारंटीकृत न्यूनतम मूल्य है, जो हर मौसम से पहले ~22 अधिसूचित फसलों (धान, गेहूं, दलहन, तिलहन...) के लिए घोषित होता है।\n\n' +
        '• जब बाजार भाव एमएसपी से कम होता है तो सरकार एजेंसियों (नाफेड, एफसीआई, पैक्स) के माध्यम से एमएसपी पर खरीदती है।\n' +
        '• योजना: उत्पादन लागत से **कम से कम 50% ऊपर** गारंटीकृत एमएसपी।\n' +
        '• यदि कीमतें अधिक हों तो ओपन/मंडी बाजार में एमएसपी से ऊपर बेच सकते हैं — और एग्रीकनेक्ट पर वास्तविक खरीदार भाव तुलना करें।'
    }
  },
  {
    id: 'kharif',
    keywords: ['kharif', 'monsoon crop', 'first season', 'rainy season crop', 'खरीफ'],
    response: {
      en: '**Kharif** — sown with the onset of monsoon (June–July, harvested Sep–Oct). Main crops: paddy, cotton, maize, jowar/bajra, pulses (moong, arhar), groundnut, soybean, sugarcane, vegetables.\n\n' +
        'Start land prep and seed/fertilizer arrangements before the first rains start.',
      hi: '**खरीफ** — मानसून की शुरुआत के साथ बोई जाती है (जून–जुलाई, कटाई सितंबर–अक्टूबर)। मुख्य फसलें: धान, कपास, मक्का, ज्वार/बाजरा, दलहन (मूंग, अरहर), मूंगफली, सोयाबीन, गन्ना, सब्जियाँ।\n\n' +
        'पहली बारिश से पहले भूमि तैयारी और बीज/खाद की व्यवस्था कर लें।'
    }
  },
  {
    id: 'rabi',
    keywords: ['rabi', 'winter crop', 'second season', 'रबी'],
    response: {
      en: '**Rabi** — sown Oct–Dec after the monsoon, harvested March–April with winter moisture or irrigation. Main crops: wheat, barley, mustard, gram (chana), peas, potato.\n\n' +
        'Ensure residual moisture or irrigation scheduling for a good rabi.',
      hi: '**रबी** — मानसून के बाद अक्टूबर–दिसंबर में बोई जाती है, सर्दियों की नमी या सिंचाई के साथ मार्च–अप्रैल में काटी जाती है। मुख्य फसलें: गेहूं, जौ, सरसों, चना, मटर, आलू।\n\n' +
        'अच्छी रबी के लिए शेष नमी या सिंचाई कार्यक्रम सुनिश्चित करें।'
    }
  },
  {
    id: 'sowing',
    keywords: ['sowing', 'planting', 'when to sow', 'when to plant', 'seed rate', 'crop season', 'what to grow', 'बुवाई', 'बोना', 'कब बोएं', 'कब बोयें'],
    response: {
      en: 'Choose a season, then a crop matched to your soil, water and market:\n\n' +
        '• **Kharif (Jun–Jul)**: paddy, maize, cotton, pulses, soybean.\n' +
        '• **Rabi (Oct–Dec)**: wheat, mustard, gram, potato.\n' +
        '• Use treated, certified seed at the recommended seed rate for your crop, and do a **soil test** before deciding fertilizer.\n\n' +
        'Tip: crops with steady local demand and short cycles (onion, tomato, leafy greens) rotate well and keep cash flowing.',
      hi: 'पहले मौसम चुनें, फिर अपनी मिट्टी, पानी और बाजार के अनुसार फसल चुनें:\n\n' +
        '• **खरीफ (जून–जुलाई)**: धान, मक्का, कपास, दलहन, सोयाबीन।\n' +
        '• **रबी (अक्टूबर–दिसंबर)**: गेहूं, सरसों, चना, आलू।\n' +
        '• अपनी फसल के लिए अनुशंसित बीज दर पर उपचारित, प्रमाणित बीज उपयोग करें, और खाद तय करने से पहले **मिट्टी परीक्षण** कराएँ।\n\n' +
        'सुझाव: स्थिर स्थानीय माँग और छोटे चक्र वाली फसलें (प्याज, टमाटर, पत्तेदार सब्जियाँ) अच्छा फेर-बदल करती हैं और नकदी चलती रहती है।'
    }
  },
  {
    id: 'seed',
    keywords: ['seed', 'seeds', 'seed treatment', 'certified seed', 'sowing seed', 'bech', 'बीज', 'प्रमाणित बीज', 'बीज उपचार'],
    response: {
      en: 'Use **certified/quality seeds** from authorized agencies or the state seed corporation. Treat seeds before sowing (fungicide/insecticide as per crop) to prevent soil-borne disease. Store seeds in cool, dry, rodent-proof containers. For hybrids, always follow the recommended seed rate — using too much raises cost without raising yield.',
      hi: 'अधिकृत एजेंसियों या राज्य बीज निगम से **प्रमाणित/गुणवत्ता वाले बीज** उपयोग करें। मिट्टी-जनित रोग से बचाने के लिए बुवाई से पहले बीज उपचार (फसल के अनुसार फफूंदनाशक/कीटनाशक) करें। बीज को ठंडे, सूखे, चूहा-रोधी डिब्बों में रखें। संकर किस्मों के लिए अनुशंसित बीज दर का पालन करें — अधिक उपयोग लागत बढ़ाता है, उपज नहीं।'
    }
  },
  {
    id: 'fertilizer',
    keywords: ['fertilizer', 'fertiliser', 'urea', 'dap', 'npk', 'manure', 'khad', 'potash', 'phosphorus', 'nutrient', 'खाद', 'यूरिया', 'डीएपी', 'उर्वरक'],
    response: {
      en: 'Apply fertilizer **based on a soil test**, not habit:\n\n' +
        '• **Urea (N)** — leafy growth; apply in splits to reduce losses.\n' +
        '• **DAP (P)** — root & seed/energy; apply at sowing.\n' +
        '• **Potash (K)/MOP** — fruit quality, drought & cold tolerance.\n\n' +
        'Subsidised **urea** is sold via PDS with a registered retailer/KCC-linked purchase on the DBT portal. Balance NPK with compost/vermicompost to keep the soil alive.',
      hi: 'आदत से नहीं, **मिट्टी परीक्षण के आधार पर** खाद डालें:\n\n' +
        '• **यूरिया (नाइट्रोजन)** — पत्तेदार वृद्धि; घाटा कम करने के लिए भागों में डालें।\n' +
        '• **डीएपी (फॉस्फोरस)** — जड़ व बीज/ऊर्जा; बुवाई के समय डालें।\n' +
        '• **पोटाश (के)/एमओपी** — फल की गुणवत्ता, सूखा व ठंड सहनशीलता।\n\n' +
        'सब्सिडी वाला **यूरिया** पीडीएस के माध्यम से पंजीकृत विक्रेता/केसीसी-लिंक्ड खरीद पर डीबीटी पोर्टल से मिलता है। मिट्टी को जीवित रखने के लिए एनपीके को कंपोस्ट/वर्मीकंपोस्ट के साथ संतुलित करें।'
    }
  },
  {
    id: 'urea',
    keywords: ['urea', 'urea subsidy', 'neem coated urea', 'यूरिया', 'यूरिया सब्सिडी', 'नीम लेपित यूरिया'],
    response: {
      en: '**Urea** is subsidised and sold under the DBT — buy through a registered retailer with your Aadhaar/POS (limit ~16 bags/farmer per season).\n\n' +
        '**Neem-coated urea** (mandatory) releases nitrogen slowly and improves efficiency. Use split doses and combine with organic manure to avoid leaching and soil hardening.',
      hi: '**यूरिया** सब्सिडी वाला होता है और डीबीटी के तहत बिकता है — अपने आधार/पीओएस के साथ पंजीकृत विक्रेता से खरीदें (सीमा ~16 बैग/किसान प्रति मौसम)।\n\n' +
        '**नीम लेपित यूरिया** (अनिवार्य) नाइट्रोजन धीरे-धीरे छोड़ता है और दक्षता बढ़ाता है। अलग-अलग दरों पर डालें और लीचिंग व मिट्टी सख्त होने से बचने के लिए जैविक खाद के साथ मिलाएँ।'
    }
  },
  {
    id: 'pest',
    keywords: ['pest', 'pesticide', 'insecticide', 'bugs', 'insect', 'attack', 'borer', 'aphid', 'caterpillar', 'spray', 'कीट', 'कीटनाशक', 'छिड़काव', 'रोग', 'कीड़ा'],
    response: {
      en: 'Pest control 101:\n\n' +
        '• **Identify first** — confirm the pest/disease before spraying; wrong sprays waste money and kill beneficial insects.\n' +
        '• **IPM**: use resistant/tolerant varieties, trap crops, sticky traps, neem-based sprays, and biocontrol (Trichogramma) before reaching for chemicals.\n' +
        '• If chemicals are needed, use the **recommended dose** at the right stage (not close to harvest), wear protective gear, and respect the pre-harvest interval.\n\n' +
        'For exact sprays, contact your state agriculture department or Krishi Vigyan Kendra (KVK).',
      hi: 'कीट नियंत्रण की मूल बातें:\n\n' +
        '• **पहले पहचानें** — छिड़काव से पहले कीट/रोग की पुष्टि करें; गलत छिड़काव पैसा बरबाद करता है और लाभकारी कीटों को मारता है।\n' +
        '• **आईपीएम**: रसायनों का सहारा लेने से पहले प्रतिरोधी/सहनशील किस्में, ट्रैप फसलें, चिपचिपे जाल, नीम-आधारित छिड़काव और जैव नियंत्रण (ट्राइकोग्रामा) उपयोग करें।\n' +
        '• रसायन आवश्यक हों तो सही अवस्था पर **अनुशंसित मात्रा** (कटाई के करीब नहीं) उपयोग करें, सुरक्षा गियर पहनें, और कटाई-पूर्व अंतराल का पालन करें।\n\n' +
        'सटीक छिड़काव के लिए अपने राज्य कृषि विभाग या कृषि विज्ञान केंद्र (केवीके) से संपर्क करें।'
    }
  },
  {
    id: 'disease',
    keywords: ['disease', 'leaf yellow', 'rust', 'blight', 'mildew', 'rot', 'crop disease', 'wilt', 'virus plant', 'पौध रोग', 'पत्ती पीली', 'झुलसा', 'फफूंद'],
    response: {
      en: 'Common crop diseases: come from fungi, bacteria or viruses.\n\n' +
        '• **Fungus**: powdery mildew, rust, blight — apply recommended fungicide, improve air flow, avoid overhead watering late.\n' +
        '• **Bacteria/viruses**: often carried by pests — control the vector (aphids/hoppers) and remove infected plants.\n\n' +
        'Practice crop rotation, clean tools, and buy disease-free seed. For a precise diagnosis, reach your **KVK / state agriculture helpline** with a photo of the affected plant.',
      hi: 'सामान्य फसल रोग: फफूंद, बैक्टीरिया या वायरस से होते हैं।\n\n' +
        '• **फफूंद**: ख़स्ता फफूंदी, किट्ट, झुलसा — अनुशंसित फफूंदनाशक डालें, हवा का प्रवाह बढ़ाएँ, देर से ऊपर से पानी देने से बचें।\n' +
        '• **बैक्टीरिया/वायरस**: अक्सर कीटों से फैलते हैं — वाहक (एफिड/हॉपर) को नियंत्रित करें और संक्रमित पौधे हटाएँ।\n\n' +
        'फसल चक्र अपनाएँ, औज़ार साफ रखें, और रोग-मुक्त बीज खरीदें। सटीक पहचान के लिए प्रभावित पौधे की फोटो के साथ अपने **केवीके / राज्य कृषि हेल्पलाइन** से संपर्क करें।'
    }
  },
  {
    id: 'irrigation',
    keywords: ['irrigation', 'watering', 'water', 'drip', 'sprinkler', 'borewell', 'water shortage', 'micro irrigation', 'save water', 'सिंचाई', 'पानी', 'ड्रिप', 'स्प्रिंकलर', 'बोरवेल', 'सूक्ष्म सिंचाई'],
    response: {
      en: 'Irrigation tips:\n\n' +
        '• **Drip irrigation** + mulching saves 30–50% water and raises yield — you can get a **subsidy (~40–90%)** under PM Krishi Sinchayee Yojana’s micro-irrigation stream.\n' +
        '• Irrigate in morning/evening to cut evaporation; schedule by crop stage (critical stages: flowering, grain filling) rather than a fixed calendar.\n' +
        '• Rainwater harvesting / check dams help recharge groundwater for dry spells.',
      hi: 'सिंचाई सुझाव:\n\n' +
        '• **ड्रिप सिंचाई** + मल्चिंग से 30–50% पानी बचता है और उपज बढ़ती है — प्रधानमंत्री कृषि सिंचाई योजना की सूक्ष्म सिंचाई श्रेणी में आपको **सब्सिडी (~40–90%)** मिल सकती है।\n' +
        '• वाष्पीकरण कम करने के लिए सुबह/शाम सिंचाई करें; निश्चित कैलेंडर के बजाय फसल अवस्था (महत्वपूर्ण: पुष्पन, दाना भरना) के अनुसार करें।\n' +
        '• वर्षा जल संचयन / चेक डैम सूखे के समय भूजल भरने में मदद करते हैं।'
    }
  },
  {
    id: 'pmksy',
    keywords: ['pmksy', 'krishi sinchayee', 'micro irrigation subsidy', 'drip subsidy', 'sprinkler subsidy', 'सिंचाई सब्सिडी', 'ड्रिप सब्सिडी'],
    response: {
      en: '**PM Krishi Sinchayee Yojana (PMKSY)** promotes "Per Drop More Crop".\n\n' +
        '• Micro-irrigation (drip/sprinkler) subsidies are state-wise, typically **40–90%** of system cost.\n' +
        '• Apply at your state agriculture department / local agricultural engineering office with land & bank documents.\n' +
        '• Also look for state schemes supporting farm ponds, water channels and solar pump sets.',
      hi: '**प्रधानमंत्री कृषि सिंचाई योजना (पीएमकेएसवाई)** "प्रति बूंद अधिक फसल" को बढ़ावा देती है।\n\n' +
        '• सूक्ष्म सिंचाई (ड्रिप/स्प्रिंकलर) सब्सिडी राज्य के अनुसार, आमतौर पर सिस्टम लागत का **40–90%** होती है।\n' +
        '• भूमि व बैंक दस्तावेज़ के साथ अपने राज्य कृषि विभाग / स्थानीय कृषि अभियांत्रिकी कार्यालय में आवेदन करें।\n' +
        '• कृषि तालाब, पानी की नहरें और सोलर पंप सेट का समर्थन करने वाली राज्य योजनाएँ भी देखें।'
    }
  },
  {
    id: 'weather',
    keywords: ['weather', 'rain', 'forecast', 'rainfall', 'climate', 'monsoon', 'temperature', 'humidity', 'मौसम', 'बारिश', 'वर्षा', 'पूर्वानुमान', 'तापमान'],
    response: {
      en: 'Plan with the season (Kharif/Rabi) and monitor forecasts during critical stages:\n\n' +
        '• Use **IMD / Meghdoot app** and district agromet advisories (AMS) for sowing and spray windows.\n' +
        '• Time sowing so flowering doesn\'t collide with peak rain.\n' +
        '• Excessive / deficit rain — adjust irrigation, drainage and pest control accordingly.\n' +
        '• For insured crops, a notified weather event helps you claim under PMFBY.',
      hi: 'मौसम (खरीफ/रबी) के अनुसार योजना बनाएँ और महत्वपूर्ण अवस्थाओं में पूर्वानुमान देखें:\n\n' +
        '• बुवाई और छिड़काव के समय के लिए **आईएमडी / मेघदूत ऐप** और जिला कृषि-मौसम सलाह (एएमएस) उपयोग करें।\n' +
        '• बुवाई ऐसे समय करें कि पुष्पन अधिकतम बारिश से न टकराए।\n' +
        '• अधिक/कम बारिश — तदनुसार सिंचाई, जल निकासी और कीट नियंत्रण समायोजित करें।\n' +
        '• बीमित फसलों के लिए, अधिसूचित मौसम घटना पीएमएफबीवाई के तहत दावा करने में मदद करती है।'
    }
  },
  {
    id: 'soil',
    keywords: ['soil test', 'soil testing', 'soil health card', 'ph soil', 'soil testing lab', 'soil nutrient', 'मिट्टी परीक्षण', 'मिट्टी स्वास्थ्य कार्ड'],
    response: {
      en: '**Soil Health Card (SHC)** — free soil testing for farmers, issued every ~2 years by the state soil lab.\n\n' +
        '• Print a **soil health card** and see soil pH, NPK, micronutrients and the recommended fertilizer dose.\n' +
        '• Take samples before fertilizing, from multiple spots, and submit to your KVK / soil testing lab.\n' +
        '• Correct pH (lime/sulfur), add organic matter, and balance NPK to fix nutrient deficiencies rather than over-applying urea.',
      hi: '**मिट्टी स्वास्थ्य कार्ड (एसएचसी)** — किसानों के लिए निःशुल्क मिट्टी परीक्षण, राज्य मिट्टी प्रयोगशाला हर ~2 साल में जारी करती है।\n\n' +
        '• **मिट्टी स्वास्थ्य कार्ड** प्राप्त करें और मिट्टी का पीएच, एनपीके, सूक्ष्म पोषक और अनुशंसित खाद मात्रा देखें।\n' +
        '• खाद डालने से पहले, कई जगहों से नमूने लें, और अपने केवीके / मिट्टी परीक्षण प्रयोगशाला में जमा करें।\n' +
        '• अधिक यूरिया डालने के बजाय पोषक कमियों को ठीक करने के लिए पीएच (चूना/गंधक) ठीक करें, जैविक पदार्थ जोड़ें, और एनपीके संतुलित करें।'
    }
  },
  {
    id: 'organic',
    keywords: ['organic', 'organic farming', 'chemical free', 'organic certification', 'np bizarre', 'vermicompost', 'natural farming', 'जैविक', 'जैविक खेती', 'प्राकृतिक खेती', 'वर्मीकंपोस्ट'],
    response: {
      en: 'Organic farming keeps soil and food chemical-free:\n\n' +
        '• Use compost, vermicompost, green manures (dhaincha, sunn hemp) and bio-fertilizers (rhizobium, Azotobacter, PSB).\n' +
        '• Natural pest control: neem, trap crops, Trichoderma, beneficial insects.\n' +
        '• **Certification**: through APEDA/NPOP or a licensed certification body (3-year transition). Organic produce often sells at a premium — list it as "Certified Organic" on AgriConnect.\n\n' +
        'For large scale, consider **drought/natural farming (prakritik kheti)** state schemes too.',
      hi: 'जैविक खेती मिट्टी और भोजन को रसायन-मुक्त रखती है:\n\n' +
        '• कंपोस्ट, वर्मीकंपोस्ट, हरी खाद (ढैंचा, सन हेम्प) और जैव उर्वरक (राइजोबियम, एज़ोटोबैक्टर, पीएसबी) उपयोग करें।\n' +
        '• प्राकृतिक कीट नियंत्रण: नीम, ट्रैप फसलें, ट्राइकोडर्मा, लाभकारी कीट।\n' +
        '• **प्रमाणन**: एपीईडीए/एनपीओपी या लाइसेंस प्राप्त प्रमाणन संस्था के माध्यम से (3 वर्ष का संक्रमण काल)। जैविक उपज अक्सर प्रीमियम पर बिकती है — एग्रीकनेक्ट पर इसे "सर्टिफाइड ऑर्गेनिक" लिस्ट करें।\n\n' +
        'बड़े पैमाने के लिए **सूखा/प्राकृतिक खेती (प्राकृतिक खेती)** राज्य योजनाओं पर भी विचार करें।'
    }
  },
  {
    id: 'storage',
    keywords: ['storage', 'cold storage', 'warehouse', 'godown', 'silo', 'storage subsidy', 'store crop', 'post harvest', 'गोदाम', 'कोल्ड स्टोरेज', 'भंडारण', 'नमी'],
    response: {
      en: 'Post-harvest storage protects your price:\n\n' +
        '• Dry grain to safe moisture, clean, and store in airtight silos/gunny bags on pallets.\n' +
        '• **Warehouse receipts** (via CWC/state warehousing corporations) let you hold produce and borrow ~80% against the receipt.\n' +
        '• Cold storage suits horticulture — subsidies exist under RKVY / cold chain schemes; check your state for a facility.',
      hi: 'कटाई के बाद भंडारण आपकी कीमत की रक्षा करता है:\n\n' +
        '• अनाज को सुरक्षित नमी तक सुखाएँ, साफ करें, और पैलेट पर वायुरोधी सिलो/बोरियों में रखें।\n' +
        '• **वेयरहाउस रसीद** (सीडब्ल्यूसी/राज्य वेयरहाउसिंग निगम के माध्यम से) से आप उपज रख सकते हैं और रसीद पर ~80% तक ऋण ले सकते हैं।\n' +
        '• कोल्ड स्टोरेज बागवानी के लिए उपयुक्त है — आरकेवीवाई / कोल्ड चेन योजनाओं के तहत सब्सिडी मिलती है; सुविधा के लिए अपने राज्य की जाँच करें।'
    }
  },
  {
    id: 'wheater_postharvest',
    keywords: ['post harvest', 'harvesting', 'threshing', 'grading', 'processing', 'drying', 'कटाई', 'थ्रेसिंग', 'ग्रेडिंग', 'सुखाने'],
    response: {
      en: 'Good post-harvest = better money:\n\n' +
        '• Harvest at the right stage, avoid moisture/mud, dry and clean before weighing.\n' +
        '• **Grade & sort** — graded lots fetch higher prices; on AgriConnect you mark a quality grade.\n' +
        '• Quick dispatch after harvest reduces shrink and lets you sell when demand is strong.',
      hi: 'अच्छा पोस्ट-हार्वेस्ट = बेहतर पैसा:\n\n' +
        '• सही अवस्था पर कटाई करें, नमी/मिट्टी से बचें, तोलने से पहले सुखाएँ और साफ करें।\n' +
        '• **ग्रेड व छँटाई** — ग्रेडेड लॉट को अधिक भाव मिलता है; एग्रीकनेक्ट पर आप गुणवत्ता ग्रेड अंकित करते हैं।\n' +
        '• कटाई के बाद तुरंत डिस्पैच नुकसान घटाता है और माँग अधिक होने पर बेचने देता है।'
    }
  },
  {
    id: 'sell',
    keywords: ['sell', 'selling', 'how to sell', 'list crop', 'listing', 'marketplace', 'sell my crop', 'market', 'buyer', 'बेचना', 'कैसे बेचें', 'लिस्ट', 'मार्केटप्लेस'],
    response: {
      en: 'You can sell directly to buyers on **AgriConnect** — no middleman:\n\n' +
        '1. Keep your login as **Farmer** and open the **Farmer Studio (dashboard)**.\n' +
        '2. Tap **"List New Crop"** → enter name, quantity, price per kg and quality grade.\n' +
        '3. Buyers see it in the Marketplace and place orders; you confirm, itinerary-optimised delivery is dispatched.\n' +
        '4. Payment is settled **directly to your bank via UPI**.',
      hi: 'आप **एग्रीकनेक्ट** पर सीधे खरीदारों को बेच सकते हैं — बिचौलिया नहीं:\n\n' +
        '1. अपना लॉगिन **किसान** रखें और **फार्मर स्टूडियो (डैशबोर्ड)** खोलें।\n' +
        '2. **"नई फसल लिस्ट करें"** दबाएँ → नाम, मात्रा, प्रति किलो भाव और गुणवत्ता ग्रेड भरें।\n' +
        '3. खरीदार इसे मार्केटप्लेस में देखते हैं और ऑर्डर करते हैं; आप पुष्टि करते हैं, रूट-अनुकूलित डिलीवरी भेजी जाती है।\n' +
        '4. भुगतान **यूपीआई के माध्यम से सीधे आपके बैंक** में आता है।'
    },
    links: [{ label: { en: 'Open Farmer Studio', hi: 'फार्मर स्टूडियो खोलें' }, path: '/dashboard' }]
  },
  {
    id: 'track',
    keywords: ['track order', 'track', 'delivery', 'order status', 'shipment', 'where is my order', 'tracking', 'delivered', 'ऑर्डर ट्रैक', 'ट्रैक', 'डिलीवरी', 'ऑर्डर स्थिति', 'कहाँ है ऑर्डर'],
    response: {
      en: 'Track any order from the **Orders** page — you\'ll see the live status (Placed → Confirmed → Shipped → Delivered) and the AI-optimised delivery route with ETA.\n\n' +
        'Open **Track Order** on any order to see the dispatch timeline and route details in real time.',
      hi: '**ऑर्डर** पेज से किसी भी ऑर्डर को ट्रैक करें — आपको लाइव स्थिति (प्लेस्ड → कन्फर्म → शिप्ड → डिलीवर्ड) और अनुमानित समय के साथ एआई-अनुकूलित डिलीवरी रूट दिखेगा।\n\n' +
        'किसी भी ऑर्डर पर **ट्रैक ऑर्डर** खोलकर डिस्पैच टाइमलाइन और रूट विवरण वास्तविक समय में देखें।'
    },
    links: [{ label: { en: 'View Orders', hi: 'ऑर्डर देखें' }, path: '/orders' }]
  },
  {
    id: 'payment',
    keywords: ['payment', 'upi', 'settlement', 'money', 'earn', 'receive payment', 'paid', 'bank settlement', 'भुगतान', 'यूपीआई', 'सेटलमेंट', 'पैसा', 'कमाई'],
    response: {
      en: 'When an order is delivered, the payment is settled **directly to your linked bank account via UPI** — transparent, no broker fee. You can watch your total earned revenue and the settlement log from the Farmer Studio dashboard. Keep your bank/UPI details updated in your profile to avoid delays.',
      hi: 'ऑर्डर डिलीवर होने पर भुगतान **यूपीआई के माध्यम से सीधे आपके लिंक्ड बैंक खाते** में आता है — पारदर्शी, कोई दलाल शुल्क नहीं। आप फार्मर स्टूडियो डैशबोर्ड से अपनी कुल कमाई और सेटलमेंट लॉग देख सकते हैं। देरी से बचने के लिए अपनी प्रोफ़ाइल में बैंक/यूपीआई विवरण अपडेट रखें।'
    }
  },
  {
    id: 'logistics',
    keywords: ['logistics', 'transport', 'shipping', 'delivery partner', 'dispatch', 'freight', 'route', 'pickup', 'लॉजिस्टिक्स', 'परिवहन', 'शिपिंग', 'डिस्पैच', 'किराया'],
    response: {
      en: 'AgriConnect plans **optimised delivery routes** for each dispatch:\n\n' +
        '• The AI service computes the shortest multi-stop route, distance, and ~ETA between the farm and buyers.\n' +
        '• You get a recommended route and cost before dispatch.\n' +
        '• **Subsidised cold-chain/logistics** support is available under Ministry of Food Processing schemes — ask your state NPC for cold storage & reefer assistance for perishables.',
      hi: 'एग्रीकनेक्ट हर डिस्पैच के लिए **अनुकूलित डिलीवरी रूट** की योजना बनाता है:\n\n' +
        '• एआई सेवा खेत और खरीदारों के बीच सबसे छोटा बहु-पड़ाव रूट, दूरी और ~अनुमानित समय निकालती है।\n' +
        '• डिस्पैच से पहले आपको अनुशंसित रूट और लागत मिलती है।\n' +
        '• खाद्य प्रसंस्करण मंत्रालय की योजनाओं के तहत **सब्सिडी वाली कोल्ड-चेन/लॉजिस्टिक्स** सहायता उपलब्ध है — खराब होने वाले सामान के लिए कोल्ड स्टोरेज व रीफर सहायता हेतु अपने राज्य एनपीसी से पूछें।'
    }
  },
  {
    id: 'fpo',
    keywords: ['fpo', 'farmer producer', 'producer company', 'fpc', 'cooperative', 'group farming', 'fpo registration', 'एफपीओ', 'किसान उत्पादक संगठन', 'सहकारी'],
    response: {
      en: 'An **FPO (Farmer Producer Organisation)** is a collective of farmers that buys inputs, pools and sells produce, and accesses credit/insurance collectively.\n\n' +
        '• Govt promotes FPOs under **Formation & Promotion of 10,000 FPOs** — ₹18–25 lakh seed capital + handholding.\n' +
        '• You can register an FPO as a Producer Company (MCA) or Cooperative with a cluster of ~300+ member farmers.\n' +
        '• On AgriConnect, FPO accounts can also list produce at the producer level.',
      hi: '**एफपीओ (किसान उत्पादक संगठन)** किसानों का एक समूह है जो सामूहिक रूप से इनपुट खरीदता है, उपज जमा कर बेचता है, और क्रेडिट/बीमा प्राप्त करता है।\n\n' +
        '• सरकार **10,000 एफपीओ का गठन व संवर्धन** के तहत बढ़ावा देती है — ₹18–25 लाख बीज पूँजी + सहयोग।\n' +
        '• आप ~300+ सदस्य किसानों के समूह के साथ एफपीओ को प्रोड्यूसर कंपनी (एमसीए) या सहकारी के रूप में पंजीकृत कर सकते हैं।\n' +
        '• एग्रीकनेक्ट पर एफपीओ खाते भी निर्माता स्तर पर उपज लिस्ट कर सकते हैं।'
    }
  },
  {
    id: 'market_link',
    keywords: ['link market', 'sell online', 'e nam', 'enam', 'apmc', 'mandi', 'online selling', 'agri market', 'ई-नाम', 'ऑनलाइन बिक्री', 'एपीएमसी'],
    response: {
      en: 'Connect to wider markets:\n\n' +
        '• **eNAM** links APMC mandis online — register your profile & bid on notified lots for online price discovery.\n' +
        '• **AgriConnect** lets you bypass the mandi entirely and sell directly to buyers at transparent prices.\n' +
        '• Combine both: compare eNAM floor vs AgriConnect buyer bids and pick the best net price.',
      hi: 'व्यापक बाजारों से जुड़ें:\n\n' +
        '• **ई-नाम** एपीएमसी मंडियों को ऑनलाइन जोड़ता है — अपनी प्रोफ़ाइल पंजीकृत करें और अधिसूचित लॉट पर ऑनलाइन मूल्य खोज के लिए बोली लगाएँ।\n' +
        '• **एग्रीकनेक्ट** आपको मंडी को पूरी तरह छोड़कर सीधे खरीदारों को पारदर्शी दरों पर बेचने देता है।\n' +
        '• दोनों मिलाएँ: ई-नाम फ्लोर बनाम एग्रीकनेक्ट खरीदार बोलियों की तुलना करें और सबसे अच्छा नेट भाव चुनें।'
    }
  },
  {
    id: 'labour',
    keywords: ['labour', 'workers', 'hiring', 'farm labour', 'manpower', 'machinery', 'rent tractor', 'custom hiring', 'मजदूर', 'श्रम', 'कामगार', 'मशीनरी', 'ट्रैक्टर किराया'],
    response: {
      en: 'For labour & machinery:\n\n' +
        '• **Custom Hiring Centres (CHC)** offer tractor, rice transplanter, harvester, and sprayer on rent at subsidy rates — check your KVK/ag state dept.\n' +
        '• Seasonal labour: plan needs before sowing/harvest; group FPOs can bargain better rates and insure periodic labour.\n' +
        '• Look into **Drone & machinery** subsidy schemes under sub-missions of the ag ministry for large holdings.',
      hi: 'श्रम व मशीनरी के लिए:\n\n' +
        '• **कस्टम हायरिंग सेंटर (सीएचसी)** सब्सिडी दरों पर ट्रैक्टर, राइस ट्रांसप्लांटर, हार्वेस्टर और स्प्रेयर किराए पर देते हैं — अपने केवीके/राज्य कृषि विभाग से जाँच करें।\n' +
        '• मौसमी श्रम: बुवाई/कटाई से पहले ज़रूरतों की योजना बनाएँ; समूह एफपीओ बेहतर दरों पर बारगेन कर सकते हैं और आवधिक श्रम का बीमा करा सकते हैं।\n' +
        '• बड़ी जोतों के लिए कृषि मंत्रालय की उप-योजनाओं के तहत **ड्रोन व मशीनरी** सब्सिडी योजनाएँ देखें।'
    }
  },
  {
    id: 'cow_dairy',
    keywords: ['cow', 'dairy', 'milk', 'cattle', 'livestock', 'animal', 'poultry', 'goat', 'गाय', 'दुग्ध', 'दूध', 'पशु', 'मुर्गीपालन', 'बकरी'],
    response: {
      en: 'Livestock & allied income:\n\n' +
        '• Sell milk/buffalo directly via dairy cooperatives (like Amul) or federations — they fix transparent monthly procurement prices.\n' +
        '• **NABARD & state** offer loans for dairy, poultry, goatery & beekeeping; KCC now also covers livestock.\n' +
        '• Keep vaccination records and feed balanced ration; insurance for cattle is available under state livestock schemes.',
      hi: 'पशुधन व सहायक आय:\n\n' +
        '• दूध/भैंस दुग्ध सहकारी समितियों (जैसे अमूल) या संघों से सीधे बेचें — वे पारदर्शी मासिक क्रय मूल्य तय करते हैं।\n' +
        '• **नाबार्ड व राज्य** दुग्ध, मुर्गीपालन, बकरीपालन व मधुमक्खी पालन के लिए ऋण देते हैं; केसीसी अब पशुधन को भी कवर करता है।\n' +
        '• टीकाकरण रिकॉर्ड रखें और संतुलित आहार दें; राज्य पशुधन योजनाओं के तहत पशु बीमा उपलब्ध है।'
    }
  },
  {
    id: 'default',
    keywords: ['default'],
    response: {
      en: 'Hmm, that\'s outside my farm-knowledge base for now. 🤔 Try asking about:\n\n' +
        '• **PM Kisan** (₹6000/year scheme)\n' +
        '• **Crop insurance** / PMFBY\n' +
        '• **Mandi crop prices** (e.g. "tomato price")\n' +
        '• **Fertilizer / urea / DAP**\n' +
        '• **Pest & disease control**\n' +
        '• **Selling on AgriConnect** or **tracking an order**\n\n' +
        'Or type **"help"** to see everything I answer.',
      hi: 'हम्म, यह अभी मेरे कृषि ज्ञान आधार से बाहर है। 🤔 किसी इनके बारे में पूछें:\n\n' +
        '• **पीएम किसान** (₹6000/वर्ष योजना)\n' +
        '• **फसल बीमा** / पीएमएफबीवाई\n' +
        '• **मंडी फसल भाव** (जैसे "टमाटर का भाव")\n' +
        '• **खाद / यूरिया / डीएपी**\n' +
        '• **कीट व रोग नियंत्रण**\n' +
        '• **एग्रीकनेक्ट पर बिक्री** या **ऑर्डर ट्रैक करना**\n\n' +
        'या मेरे सभी उत्तर देखने के लिए **"मदद"** लिखें।'
    }
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
      <p key={i} className="text-sm leading-relaxed text-(--ink-soft) first:mt-0">
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

const QUICK_TIPS = {
  en: [
    'PM Kisan scheme',
    'Crop insurance',
    'Tomato mandi price',
    'Urea subsidy',
    'Pest control',
    'How to sell on AgriConnect',
    'Track my order'
  ],
  hi: [
    'पीएम किसान योजना',
    'फसल बीमा',
    'टमाटर मंडी भाव',
    'यूरिया सब्सिडी',
    'कीट नियंत्रण',
    'एग्रीकनेक्ट पर कैसे बेचें',
    'मेरा ऑर्डर ट्रैक करें'
  ]
};

// Resolve an assistant message to its textual reply in the active language.
// Storing the intent id (not the resolved string) lets every rendered
// message re-translate instantly when the user toggles the language.
function resolveReply(intentId, language) {
  if (intentId === 'greeting') return GREETING[language] || GREETING.en;
  const intent = INTENTS.find((i) => i.id === intentId);
  if (!intent) return '';
  return intent.response[language] || intent.response.en;
}

// Same for the button labels rendered inside intent quick links.
function resolveLinkLabel(label, language) {
  if (!label) return '';
  return label[language] || label.en || label;
}

export default function FarmerAssistantChat() {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', intentId: 'greeting', links: [] }
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
        { role: 'assistant', intentId: intent.id, links: intent.links || [] }
      ]);
      setTyping(false);
    }, 650);
  };

  return (
    <>
      {/* Floating chat launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
aria-label={open ? (language === 'hi' ? 'सहायक बंद करें' : 'Close assistant') : (language === 'hi' ? 'किसान सहायक खोलें' : 'Open Kisan Assistant')}
        className="fixed bottom-5 right-5 z-[1500] group flex items-center gap-2"
      >
        <AnimatePresence>
          {!open && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="hidden sm:inline text-xs font-semibold text-(--ink) bg-(--card) border border-(--line) px-3 py-1.5 rounded-full shadow-sm"
            >
              {language === 'hi' ? 'किसान सहायक से पूछें' : 'Ask Kisan Assistant'}
            </motion.span>
          )}
        </AnimatePresence>
        <motion.div
          whileTap={{ scale: 0.92 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-colors cursor-pointer ${
            open ? 'bg-(--danger)' : 'bg-(--leaf) hover:bg-(--leaf-deep)'
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
className="fixed bottom-5 right-5 z-[1500] w-[380px] max-w-[calc(100vw-1.5rem)] h-[540px] max-h-[calc(100vh-5rem)] bg-(--card) rounded-2xl border border-(--line) shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-(--leaf) text-(--canvas) px-4 py-3 flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-(--leaf)" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-bold text-sm font-heading">
                  {language === 'hi' ? 'किसान सहायक' : 'Kisan Assistant'}
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <div className="text-[11px] text-(--line-strong)">
                  {language === 'hi' ? 'किसान प्रश्न · तुरंत उत्तर' : 'Farmer queries · answered instantly'}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-(--line-strong) hover:text-white hover:bg-white/10 transition-colors"
                aria-label={language === 'hi' ? 'बंद करें' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-(--canvas)">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-(--leaf) text-white text-sm shadow-sm'
                        : 'max-w-[92%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-(--card) border border-(--line) shadow-sm'
                    }
                  >
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-(--leaf)">
                        <Bot className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {language === 'hi' ? 'किसान सहायक' : 'Kisan Assistant'}
                        </span>
                      </div>
                    )}
                    {m.role === 'assistant'
                      ? renderRich(resolveReply(m.intentId, language))
                      : renderRich(m.text)}
                    {m.links && m.links.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        {m.links.map((l, i) => (
                          <button
                            key={i}
                            onClick={() => { setOpen(false); navigate(l.path); }}
                            className="flex items-center gap-1 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-(--leaf) bg-(--moss) border border-(--line-strong) hover:bg-(--moss-strong) transition-colors cursor-pointer"
                          >
                            {resolveLinkLabel(l.label, language)}
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
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-(--card) border border-(--line) shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-(--line-strong) animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-(--line-strong) animate-pulse [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-(--line-strong) animate-pulse [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick tips */}
            <div className="px-3 pt-2 pb-1 bg-(--canvas) border-t border-(--line)">
              <div className="flex flex-wrap gap-1.5">
                {(QUICK_TIPS[language] || QUICK_TIPS.en).map((tip) => (
                  <button
                    key={tip}
                    onClick={() => send(tip)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium text-(--leaf) bg-(--moss) border border-(--line-strong) hover:bg-(--moss-strong) transition-colors cursor-pointer"
                  >
                    {tip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 bg-(--card) border-t border-(--line) flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
                placeholder={language === 'hi' ? 'मंडी, योजनाएँ, कीट… के बारे में पूछें' : 'Ask about mandi, schemes, pests…'}
                className="flex-1 px-3 py-2.5 rounded-xl bg-(--canvas) border border-(--line) text-sm text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-(--leaf) hover:bg-(--leaf-deep) text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                aria-label={language === 'hi' ? 'भेजें' : 'Send'}
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