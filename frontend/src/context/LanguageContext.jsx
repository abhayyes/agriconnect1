import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Load saved language preference or default to English
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    // Save language preference
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Translations object
const translations = {
  en: {
    // Navbar
    'nav.marketplace': 'Mandi Market',
    'nav.dashboard': 'Farmer Studio',
    'nav.orders': 'Orders',
    'nav.tracking': 'Dispatch Track',
    'nav.login': 'Login / Register',
    'nav.logout': 'Logout',
    'nav.tagline': 'Direct Farmer to Consumer Network',
    'nav.role.farmer': '🌾 Kisan / FPO',
    'nav.role.buyer': '🛒 Buyer',

    // Common
    'common.loading': 'Loading...',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort By',
    'common.viewAll': 'View All',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.close': 'Close',

    // Login Page
    'login.title': 'Welcome to AgriConnect',
    'login.subtitle': 'Direct Farm-to-Consumer Trade Network',
    'login.selectRole': 'Select Your Role',
    'login.farmer': 'Farmer / FPO',
    'login.farmerDesc': 'List your harvest and connect with buyers',
    'login.buyer': 'Buyer (Consumer/Bulk)',
    'login.buyerDesc': 'Browse fresh produce directly from farms',
    'login.email': 'Email Address',
    'login.password': 'Password',
    'login.name': 'Full Name',
    'login.phone': 'Phone Number',
    'login.location': 'Location',
    'login.signIn': 'Sign In',
    'login.signUp': 'Create Account',
    'login.switchToSignUp': 'New user? Create an account',
    'login.switchToSignIn': 'Already have an account? Sign in',

    // Marketplace
    'marketplace.title': 'Direct Farm Produce Marketplace',
    'marketplace.subtitle': 'Fresh from Farms • Zero Middlemen • Fair Prices',
    'marketplace.searchPlaceholder': 'Search crops, farmers, locations...',
    'marketplace.noProducts': 'No products found',
    'marketplace.browseMessage': 'Check back soon or adjust your filters',
    'marketplace.perKg': '/kg',
    'marketplace.available': 'Available',
    'marketplace.orderNow': 'Order Now',
    'marketplace.quantityPlaceholder': 'Quantity (kg)',
    'marketplace.placeOrder': 'Place Order',
    'marketplace.totalPrice': 'Total Price',
    'marketplace.paymentMethod': 'Payment Method',
    'marketplace.upi': 'UPI / Card',
    'marketplace.cod': 'Cash on Delivery',

    // Farmer Dashboard
    'dashboard.title': 'Farmer Control Panel',
    'dashboard.subtitle': 'Manage your harvest listings and track orders',
    'dashboard.createListing': 'Create New Listing',
    'dashboard.myListings': 'My Listings',
    'dashboard.demandForecast': 'AI Demand Forecast',
    'dashboard.noListings': 'No listings yet',
    'dashboard.startSelling': 'Create your first listing to start selling',
    'dashboard.crop': 'Crop Name',
    'dashboard.quantity': 'Quantity',
    'dashboard.unit': 'Unit',
    'dashboard.pricePerUnit': 'Price per Unit (₹)',
    'dashboard.location': 'Pickup Location',
    'dashboard.description': 'Description',
    'dashboard.predictedDemand': 'Predicted Demand',
    'dashboard.confidence': 'Confidence',
    'dashboard.suggestedPrice': 'Suggested Price',
    'dashboard.next7Days': 'next 7 days',

    // Orders Page
    'orders.title': 'My Orders',
    'orders.titleReceived': 'Orders Received',
    'orders.subtitle': 'Track your farm-fresh produce orders',
    'orders.subtitleReceived': 'Orders placed by buyers on your listed harvests',
    'orders.totalOrders': 'Total Orders',
    'orders.noOrders': 'No orders yet',
    'orders.noOrdersBuyer': 'Browse the marketplace to place your first order',
    'orders.noOrdersFarmer': 'When buyers order from your listings, they will appear here',
    'orders.browseMarketplace': 'Browse Marketplace',
    'orders.viewListings': 'View My Listings',
    'orders.product': 'Product',
    'orders.seller': 'Seller',
    'orders.buyer': 'Buyer',
    'orders.delivery': 'Delivery',
    'orders.routeOptimized': 'Route optimized via AI',
    'orders.aiUnavailable': 'AI service unavailable',
    'orders.sameDayDelivery': 'Same Day Delivery',
    'orders.trackOrder': 'Track Order',
    'orders.viewRoute': '& View Route',
    'orders.confirmOrder': 'Confirm Order',
    'orders.markShipped': 'Mark Shipped',
    'orders.markDelivered': 'Mark Delivered',
    'orders.cancelOrder': 'Cancel Order',
    'orders.status.pending': 'Pending',
    'orders.status.confirmed': 'Confirmed',
    'orders.status.shipped': 'Shipped',
    'orders.status.delivered': 'Delivered',
    'orders.status.cancelled': 'Cancelled',
    'orders.payment.paid': 'Paid',
    'orders.payment.cod': 'Pay on delivery',

    // Order Tracking
    'tracking.title': 'Live Order & Logistics Status',
    'tracking.subtitle': 'LIVE CONSIGNMENT DISPATCH TRACKER',
    'tracking.gpsLinked': 'GPS Satellite Linked',
    'tracking.orderTracked': 'Order Tracked',
    'tracking.totalAmount': 'Total Amount',
    'tracking.payment': 'Payment',
    'tracking.aiRoute': 'AI-OPTIMIZED DELIVERY ROUTE',
    'tracking.distance': 'Distance',
    'tracking.estTime': 'Est. Time',
    'tracking.logisticsCost': 'Logistics Cost',
    'tracking.optimizedWaypoints': 'Optimized Waypoints:',
    'tracking.dispatchSchedule': 'DISPATCH ON SCHEDULE',
    'tracking.eta': 'ETA',
    'tracking.inTransit': 'Your order is in transit via optimized route.',
    'tracking.contactSupport': 'Contact Support',
    'tracking.orderConfirmed': 'Order Confirmed',
    'tracking.routeOptimized': 'Route Optimized & Dispatch Ready',
    'tracking.inTransitTitle': 'In Transit',
    'tracking.delivered': 'Delivered',
    'tracking.farmOrigin': 'Farm Origin',
    'tracking.optimizedRoute': 'Optimized Route',
    'tracking.awaitingDispatch': 'Awaiting dispatch confirmation',
    'tracking.pending': 'Pending',
    'tracking.routeInProgress': 'Route optimization in progress',
    'tracking.directRoute': 'Direct delivery route',
    'tracking.liveTransit': 'Live Transit',
    'tracking.awaitingShipment': 'Awaiting Shipment',
    'tracking.viaRoute': 'Via',
    'tracking.waypointsOptimized': 'waypoints optimized for fastest delivery',
    'tracking.multiStopActive': 'Multi-stop optimization active',
    'tracking.deliveryTo': 'Delivery to',
    'tracking.estimatedArrival': 'Estimated arrival',
    'tracking.otpVerification': 'Contactless handover with OTP verification',
    'tracking.noOrderSelected': 'No Order Selected',
    'tracking.orderNotFound': 'Order Not Found',
    'tracking.selectOrder': 'Please select an order from your orders page to view tracking details.',
    'tracking.orderNotFoundMsg': 'The order you are looking for could not be found.',
    'tracking.viewMyOrders': 'View My Orders',

    // Footer
    'footer.tagline': 'AgriConnect — Smart India Hackathon 2026',
    'footer.directTrade': 'Direct Trade Protocol Active',
    'footer.zeroMiddlemen': 'Zero Middlemen • 100% Fair Value',
  },
  hi: {
    // Navbar
    'nav.marketplace': 'मंडी बाजार',
    'nav.dashboard': 'किसान स्टूडियो',
    'nav.orders': 'ऑर्डर',
    'nav.tracking': 'डिस्पैच ट्रैक',
    'nav.login': 'लॉगिन / रजिस्टर',
    'nav.logout': 'लॉगआउट',
    'nav.tagline': 'सीधे किसान से उपभोक्ता नेटवर्क',
    'nav.role.farmer': '🌾 किसान / FPO',
    'nav.role.buyer': '🛒 खरीदार',

    // Common
    'common.loading': 'लोड हो रहा है...',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.sort': 'क्रमबद्ध करें',
    'common.viewAll': 'सभी देखें',
    'common.cancel': 'रद्द करें',
    'common.confirm': 'पुष्टि करें',
    'common.save': 'सहेजें',
    'common.edit': 'संपादित करें',
    'common.delete': 'हटाएं',
    'common.back': 'वापस',
    'common.next': 'अगला',
    'common.submit': 'जमा करें',
    'common.close': 'बंद करें',

    // Login Page
    'login.title': 'एग्रीकनेक्ट में आपका स्वागत है',
    'login.subtitle': 'सीधे खेत से उपभोक्ता व्यापार नेटवर्क',
    'login.selectRole': 'अपनी भूमिका चुनें',
    'login.farmer': 'किसान / FPO',
    'login.farmerDesc': 'अपनी फसल सूचीबद्ध करें और खरीदारों से जुड़ें',
    'login.buyer': 'खरीदार (उपभोक्ता/थोक)',
    'login.buyerDesc': 'सीधे खेतों से ताजा उपज खरीदें',
    'login.email': 'ईमेल पता',
    'login.password': 'पासवर्ड',
    'login.name': 'पूरा नाम',
    'login.phone': 'फोन नंबर',
    'login.location': 'स्थान',
    'login.signIn': 'साइन इन करें',
    'login.signUp': 'खाता बनाएं',
    'login.switchToSignUp': 'नए उपयोगकर्ता? खाता बनाएं',
    'login.switchToSignIn': 'पहले से खाता है? साइन इन करें',

    // Marketplace
    'marketplace.title': 'सीधे खेत उपज बाजार',
    'marketplace.subtitle': 'खेतों से ताजा • शून्य बिचौलिए • उचित मूल्य',
    'marketplace.searchPlaceholder': 'फसल, किसान, स्थान खोजें...',
    'marketplace.noProducts': 'कोई उत्पाद नहीं मिला',
    'marketplace.browseMessage': 'जल्द ही वापस जांचें या अपने फ़िल्टर समायोजित करें',
    'marketplace.perKg': '/किलो',
    'marketplace.available': 'उपलब्ध',
    'marketplace.orderNow': 'अभी ऑर्डर करें',
    'marketplace.quantityPlaceholder': 'मात्रा (किलो)',
    'marketplace.placeOrder': 'ऑर्डर करें',
    'marketplace.totalPrice': 'कुल मूल्य',
    'marketplace.paymentMethod': 'भुगतान विधि',
    'marketplace.upi': 'UPI / कार्ड',
    'marketplace.cod': 'डिलीवरी पर नकद',

    // Farmer Dashboard
    'dashboard.title': 'किसान नियंत्रण पैनल',
    'dashboard.subtitle': 'अपनी फसल सूची प्रबंधित करें और ऑर्डर ट्रैक करें',
    'dashboard.createListing': 'नई सूची बनाएं',
    'dashboard.myListings': 'मेरी सूचियां',
    'dashboard.demandForecast': 'AI मांग पूर्वानुमान',
    'dashboard.noListings': 'अभी तक कोई सूची नहीं',
    'dashboard.startSelling': 'बिक्री शुरू करने के लिए अपनी पहली सूची बनाएं',
    'dashboard.crop': 'फसल का नाम',
    'dashboard.quantity': 'मात्रा',
    'dashboard.unit': 'इकाई',
    'dashboard.pricePerUnit': 'प्रति इकाई मूल्य (₹)',
    'dashboard.location': 'पिकअप स्थान',
    'dashboard.description': 'विवरण',
    'dashboard.predictedDemand': 'अनुमानित मांग',
    'dashboard.confidence': 'विश्वास',
    'dashboard.suggestedPrice': 'सुझाया गया मूल्य',
    'dashboard.next7Days': 'अगले 7 दिन',

    // Orders Page
    'orders.title': 'मेरे ऑर्डर',
    'orders.titleReceived': 'प्राप्त ऑर्डर',
    'orders.subtitle': 'अपने खेत-ताजा उपज ऑर्डर ट्रैक करें',
    'orders.subtitleReceived': 'आपकी सूचीबद्ध फसलों पर खरीदारों द्वारा दिए गए ऑर्डर',
    'orders.totalOrders': 'कुल ऑर्डर',
    'orders.noOrders': 'अभी तक कोई ऑर्डर नहीं',
    'orders.noOrdersBuyer': 'अपना पहला ऑर्डर देने के लिए बाजार ब्राउज़ करें',
    'orders.noOrdersFarmer': 'जब खरीदार आपकी सूचियों से ऑर्डर करेंगे, तो वे यहां दिखाई देंगे',
    'orders.browseMarketplace': 'बाजार ब्राउज़ करें',
    'orders.viewListings': 'मेरी सूचियां देखें',
    'orders.product': 'उत्पाद',
    'orders.seller': 'विक्रेता',
    'orders.buyer': 'खरीदार',
    'orders.delivery': 'डिलीवरी',
    'orders.routeOptimized': 'AI द्वारा अनुकूलित मार्ग',
    'orders.aiUnavailable': 'AI सेवा अनुपलब्ध',
    'orders.sameDayDelivery': 'उसी दिन डिलीवरी',
    'orders.trackOrder': 'ऑर्डर ट्रैक करें',
    'orders.viewRoute': 'और मार्ग देखें',
    'orders.confirmOrder': 'ऑर्डर की पुष्टि करें',
    'orders.markShipped': 'शिप किया गया चिह्नित करें',
    'orders.markDelivered': 'डिलीवर किया गया चिह्नित करें',
    'orders.cancelOrder': 'ऑर्डर रद्द करें',
    'orders.status.pending': 'लंबित',
    'orders.status.confirmed': 'पुष्टि',
    'orders.status.shipped': 'भेजा गया',
    'orders.status.delivered': 'डिलीवर किया गया',
    'orders.status.cancelled': 'रद्द किया गया',
    'orders.payment.paid': 'भुगतान किया गया',
    'orders.payment.cod': 'डिलीवरी पर भुगतान',

    // Order Tracking
    'tracking.title': 'लाइव ऑर्डर और लॉजिस्टिक्स स्थिति',
    'tracking.subtitle': 'लाइव खेप प्रेषण ट्रैकर',
    'tracking.gpsLinked': 'GPS सैटेलाइट लिंक',
    'tracking.orderTracked': 'ऑर्डर ट्रैक किया गया',
    'tracking.totalAmount': 'कुल राशि',
    'tracking.payment': 'भुगतान',
    'tracking.aiRoute': 'AI-अनुकूलित डिलीवरी मार्ग',
    'tracking.distance': 'दूरी',
    'tracking.estTime': 'अनुमानित समय',
    'tracking.logisticsCost': 'लॉजिस्टिक्स लागत',
    'tracking.optimizedWaypoints': 'अनुकूलित वेपॉइंट:',
    'tracking.dispatchSchedule': 'समय पर प्रेषण',
    'tracking.eta': 'पहुंचने का समय',
    'tracking.inTransit': 'आपका ऑर्डर अनुकूलित मार्ग के माध्यम से पारगमन में है।',
    'tracking.contactSupport': 'सहायता से संपर्क करें',
    'tracking.orderConfirmed': 'ऑर्डर की पुष्टि',
    'tracking.routeOptimized': 'मार्ग अनुकूलित और प्रेषण तैयार',
    'tracking.inTransitTitle': 'पारगमन में',
    'tracking.delivered': 'डिलीवर किया गया',
    'tracking.farmOrigin': 'खेत मूल',
    'tracking.optimizedRoute': 'अनुकूलित मार्ग',
    'tracking.awaitingDispatch': 'प्रेषण पुष्टि की प्रतीक्षा में',
    'tracking.pending': 'लंबित',
    'tracking.routeInProgress': 'मार्ग अनुकूलन प्रगति में',
    'tracking.directRoute': 'सीधा डिलीवरी मार्ग',
    'tracking.liveTransit': 'लाइव पारगमन',
    'tracking.awaitingShipment': 'शिपमेंट की प्रतीक्षा में',
    'tracking.viaRoute': 'के माध्यम से',
    'tracking.waypointsOptimized': 'सबसे तेज डिलीवरी के लिए अनुकूलित वेपॉइंट',
    'tracking.multiStopActive': 'मल्टी-स्टॉप अनुकूलन सक्रिय',
    'tracking.deliveryTo': 'डिलीवरी',
    'tracking.estimatedArrival': 'अनुमानित आगमन',
    'tracking.otpVerification': 'OTP सत्यापन के साथ संपर्करहित हस्तांतरण',
    'tracking.noOrderSelected': 'कोई ऑर्डर चयनित नहीं',
    'tracking.orderNotFound': 'ऑर्डर नहीं मिला',
    'tracking.selectOrder': 'ट्रैकिंग विवरण देखने के लिए कृपया अपने ऑर्डर पृष्ठ से एक ऑर्डर चुनें।',
    'tracking.orderNotFoundMsg': 'आप जो ऑर्डर खोज रहे हैं वह नहीं मिला।',
    'tracking.viewMyOrders': 'मेरे ऑर्डर देखें',

    // Footer
    'footer.tagline': 'एग्रीकनेक्ट — स्मार्ट इंडिया हैकथॉन 2026',
    'footer.directTrade': 'प्रत्यक्ष व्यापार प्रोटोकॉल सक्रिय',
    'footer.zeroMiddlemen': 'शून्य बिचौलिए • 100% उचित मूल्य',
  }
};
