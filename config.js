// បង្កើត Namespace ធំមួយ
const MySokhaApp = {};

// --- Global Helper Functions ---
MySokhaApp.formatDisplayAmount = (amount) => {
  if (!amount) return '';
  const num = Number(amount);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US');
};
      
MySokhaApp.parseAmount = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/,/g, ''); // លុបសញ្ញាក្បៀសចេញ
};

// --- Firebase Config ---
const injectedConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : null;

const manualConfig = {
  apiKey: "AIzaSyDmfuDO3sQEzgpjIP_I6s1UxxCJdcc1nNI",
  authDomain: "mypayment-b5440.firebaseapp.com",
  databaseURL: "https://mypayment-b5440-default-rtdb.firebaseio.com",
  projectId: "mypayment-b5440",
  storageBucket: "mypayment-b5440.firebasestorage.app",
  messagingSenderId: "376342723543",
  appId: "1:376342723543:web:1714e31cab7d177258e992",
  measurementId: "G-157Y9CQTTG"
};

MySokhaApp.firebaseConfig = injectedConfig || manualConfig;

const rawAppId = MySokhaApp.firebaseConfig.projectId || 'default-app-id';
MySokhaApp.appId = rawAppId.replace(/[.#$\[\]]/g, '_');

MySokhaApp.initialAuthToken = typeof __initial_auth_token !== 'undefined' 
  ? __initial_auth_token 
  : null;

// --- ចាប់ផ្តើម Firebase ---
try {
  // ផ្ទុក Global 'firebase' object ពី CDN
  MySokhaApp.firebase = firebase; 
  
  MySokhaApp.app = MySokhaApp.firebase.initializeApp(MySokhaApp.firebaseConfig);
  MySokhaApp.auth = MySokhaApp.firebase.auth(MySokhaApp.app);
  MySokhaApp.rtdb = MySokhaApp.firebase.database(MySokhaApp.app);
  
  console.log("Firebase Config Loaded and Initialized.");
  
} catch (e) {
  console.error("Error initializing Firebase: ", e);
}
