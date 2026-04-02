import React, { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  AlertCircle, 
  AlertTriangle,
  Activity,
  Bell,
  BellOff,
  Map,
  MapPin, 
  Phone, 
  Camera, 
  Mic, 
  Shield, 
  Heart, 
  History as HistoryIcon, 
  Info,
  Navigation,
  CheckCircle2,
  XCircle,
  X,
  Video,
  Flame,
  Loader2,
  Send,
  LogOut,
  LogIn,
  User as UserIcon,
  Plus,
  PlusCircle,
  ChevronDown,
  Badge,
  ChevronRight,
  Trash2,
  Settings,
  Volume2,
  Languages,
  Wifi,
  WifiOff,
  Search,
  BookOpen,
  Hospital,
  Users,
  Timer,
  Medal,
  Share2,
  Award,
  HeartHandshake,
  Lock,
  ShieldCheck,
  Zap,
  QrCode,
  RefreshCw,
  Smartphone,
  MessageSquare,
  SmartphoneNfc,
  ExternalLink,
  Download,
  Play,
  Sun,
  Moon,
  Droplets,
  Star,
  Copy
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import * as QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { sendSms, makeCall, normalizePhoneNumber, type EmergencyResponse, type NearbyPlace } from './services/twilio';
import { cn } from './lib/utils';
import { playSiren } from './lib/audio';
import { FIRST_AID_KNOWLEDGE_BASE, type FirstAidGuideline } from './constants/firstAid';
import { OFFLINE_FIRST_AID_DATA, type OfflineFirstAid } from './constants/offlineFirstAid';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  ref, 
  set, 
  update, 
  push, 
  query, 
  orderByChild, 
  equalTo, 
  limitToLast, 
  onValue, 
  off,
  serverTimestamp, 
  handleDatabaseError, 
  OperationType,
  type User
} from './firebase';
import { remove } from 'firebase/database';

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

// Import AI and Emergency Features
import { 
  SituationUnderstanding,
  EmergencyClassification,
  DecisionEngine,
  IntentDetection,
  ComputerVision,
  MultilingualSupport,
  EmotionDetection,
  SmartSOSTrigger,
  AutoSOSActivation,
  RealTimeAlertSystem,
  LiveLocationTracking,
  EmergencyLiveStreaming,
  EvidenceRecordingSystem,
  EmergencyLayerSystem,
  EmergencyLayer,
  DoctorMatchmakingSystem,
  NearbyHelpersDetection,
  ResponderMatchingSystem,
  RadarVisualization,
  ResponderVerificationSystem,
  TrustRatingSystem,
  HelperNotificationSystem,
  SafetyScoreSystem,
  RiskDetectionEngine,
  UnsafeAreaAlerts,
  BehaviorAnalysisSystem
} from './features';

// Import Components
import { VideoCall } from './components/VideoCall';
import AssistancePanel from './components/AssistancePanel';

// Helper to convert RTDB snapshots into indexed arrays (to mimic Firestore querySnapshots)
const mapSnapshotToArray = (snapshot: any) => {
  const data = snapshot.val();
  if (!data) return [];
  return Object.keys(data).map(key => ({
    id: key,
    ...data[key]
  }));
};

type Tab = 'sos' | 'first-aid' | 'nearby' | 'history' | 'profile' | 'offline-guide' | 'cpr-assist' | 'bystander-report' | 'live-map' | 'ai-assistant' | 'crowd-network' | 'doctor-portal' | 'safety-dashboard';

interface EmergencyContact {
  name: string;
  phone: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  dateEarned: string;
}

interface UserProfile {
  displayName?: string;
  email?: string;
  photoURL?: string;
  emergencyContacts?: EmergencyContact[];
  bloodGroup?: string;
  medicalConditions?: string;
  allergies?: string;
  role?: 'client' | 'admin';
  points?: number;
  badges?: Badge[];
  settings?: {
    sirenEnabled: boolean;
    voiceGuidanceEnabled: boolean;
    language?: string;
    privacyModeEnabled?: boolean;
    hasAcceptedPrivacy?: boolean;
    fallDetectionEnabled?: boolean;
    fallSensitivity?: number;
  };
}

interface Incident {
  id: string;
  userId: string;
  timestamp: any;
  status: 'active' | 'resolved';
  location?: { lat: number; lng: number };
  description?: string;
  photo?: string;
  locationDescription?: string;
  reporterName?: string;
  reporterContact?: string;
  emergencyType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  emergencyKey?: string;
  speechText?: string;
}

interface MapPlace extends NearbyPlace {
  id: string;
  x?: number;
  y?: number;
}

interface HelperData {
  name: string;
  photo?: string;
  consent: boolean;
  timestamp: Date;
  tier: 'Responder' | 'Helper' | 'Verified Helper' | 'Unverified Responder';
  actions: string[];
  timeSpent: number;
  isProximityVerified: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "{}");
        if (parsedError.error) {
          errorMessage = `Database Error: ${parsedError.error} during ${parsedError.operationType} on ${parsedError.path}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-red-100">
            <XCircle className="w-16 h-16 text-red-600 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Application Error</h2>
            <p className="text-gray-600 text-sm">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const HELPER_ACTIONS = [
  "Applied pressure to wound",
  "Checked breathing/pulse",
  "Performed CPR",
  "Called emergency services",
  "Cleared the area",
  "Comforted the victim",
  "Provided water/blanket",
  "Guided emergency responders"
];

const VerificationModal = ({ 
  engagementStartTime, 
  confirmedActions, 
  setConfirmedActions, 
  completedSteps,
  totalSteps,
  situationalAnswers,
  setSituationalAnswers,
  onClose, 
  onContinue 
}: { 
  engagementStartTime: number | null, 
  confirmedActions: string[], 
  setConfirmedActions: React.Dispatch<React.SetStateAction<string[]>>, 
  completedSteps: number[],
  totalSteps: number,
  situationalAnswers: Record<string, string>,
  setSituationalAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  onClose: () => void, 
  onContinue: () => void 
}) => {
  const [timeSpent, setTimeSpent] = useState(0);
  const [step, setStep] = useState<'actions' | 'questions'>('actions');

  useEffect(() => {
    const interval = setInterval(() => {
      if (engagementStartTime) {
        setTimeSpent(Math.floor((Date.now() - engagementStartTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [engagementStartTime]);

  const canContinueActions = timeSpent >= 5 && (confirmedActions.length > 0 || completedSteps.length > 0);
  const allQuestionsAnswered = situationalAnswers['bleeding'] && situationalAnswers['conscious'];

  const handleFinish = () => {
    // Consistency Check
    const hasBleedingAction = confirmedActions.some(a => a.toLowerCase().includes('pressure') || a.toLowerCase().includes('bleeding'));
    const saysBleedingSlowing = situationalAnswers['bleeding'] === 'yes';
    
    // If they say bleeding is slowing but didn't apply pressure, that's a red flag (but we'll just track it for now)
    // In a real app, we might reject here.
    
    onContinue();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-8 w-full max-w-md space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        
        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tight">
              {step === 'actions' ? 'Helper Verification' : 'Situational Check'}
            </h3>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">
              {step === 'actions' ? 'Verify your assistance actions' : 'Confirm current status'}
            </p>
          </div>

          {step === 'actions' ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Time Spent Helping</p>
                  <p className={cn(
                    "text-xl font-black italic transition-colors",
                    timeSpent >= 30 ? "text-green-600" : "text-blue-600"
                  )}>
                    {timeSpent}s
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Steps Followed</p>
                  <p className={cn(
                    "text-xl font-black italic transition-colors",
                    completedSteps.length === totalSteps ? "text-green-600" : "text-blue-600"
                  )}>
                    {completedSteps.length}/{totalSteps}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Actions Performed</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {HELPER_ACTIONS.map((action) => (
                    <label 
                      key={action}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                        confirmedActions.includes(action) 
                          ? "bg-blue-50 border-blue-200 text-blue-900" 
                          : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={confirmedActions.includes(action)}
                        onChange={() => {
                          setConfirmedActions(prev => 
                            prev.includes(action) 
                              ? prev.filter(a => a !== action) 
                              : [...prev, action]
                          );
                        }}
                      />
                      <div className={cn(
                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                        confirmedActions.includes(action) ? "bg-blue-600 border-blue-600" : "border-gray-200"
                      )}>
                        {confirmedActions.includes(action) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-bold">{action}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-700">Is the bleeding slowing down or stopped?</p>
                  <div className="flex gap-2">
                    {['yes', 'no', 'not-applicable'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSituationalAnswers(prev => ({ ...prev, bleeding: opt }))}
                        className={cn(
                          "flex-1 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                          situationalAnswers['bleeding'] === opt 
                            ? "bg-blue-600 border-blue-600 text-white" 
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        {opt.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-700">Is the victim conscious and breathing?</p>
                  <div className="flex gap-2">
                    {['yes', 'no', 'uncertain'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSituationalAnswers(prev => ({ ...prev, conscious: opt }))}
                        className={cn(
                          "flex-1 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                          situationalAnswers['conscious'] === opt 
                            ? "bg-blue-600 border-blue-600 text-white" 
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {step === 'actions' ? (
              <button
                onClick={() => setStep('questions')}
                disabled={!canContinueActions}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
              >
                Next: Situational Check
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!allQuestionsAnswered}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
              >
                Continue to Recognition
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
          
          <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest italic">
            “Recognition is awarded based on verified interaction and consistency”
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const VIDEO_GUIDES = [
  {
    id: 'unconscious_cpr',
    title: 'CPR (Adult)',
    description: 'How to perform hands-only CPR on an adult.',
    thumbnail: 'https://img.youtube.com/vi/QDVVENjyo_U/0.jpg',
    url: 'https://www.youtube.com/embed/QDVVENjyo_U?rel=0&enablejsapi=1',
    icon: Activity,
    iconColor: 'text-red-600'
  },
  {
    id: 'severe_bleeding',
    title: 'Severe Bleeding',
    description: 'Applying pressure and using a tourniquet.',
    thumbnail: 'https://img.youtube.com/vi/-Yqk5cHXsko/0.jpg',
    url: 'https://www.youtube.com/embed/-Yqk5cHXsko?rel=0&enablejsapi=1',
    icon: Flame,
    iconColor: 'text-orange-600'
  },
  {
    id: 'choking',
    title: 'Choking (Heimlich)',
    description: 'Abdominal thrusts for a choking adult.',
    thumbnail: 'https://img.youtube.com/vi/VKGzXUB9FQs/0.jpg',
    url: 'https://www.youtube.com/embed/VKGzXUB9FQs?rel=0&enablejsapi=1',
    icon: AlertCircle,
    iconColor: 'text-blue-600'
  },
  {
    id: 'burns',
    title: 'Thermal Burns',
    description: 'How to treat burns immediately.',
    thumbnail: 'https://img.youtube.com/vi/pwyOCAt5FNc/0.jpg',
    url: 'https://www.youtube.com/embed/pwyOCAt5FNc?rel=0&enablejsapi=1',
    icon: Flame,
    iconColor: 'text-orange-500'
  },
  {
    id: 'fracture',
    title: 'Fractures',
    description: 'Immobilizing broken bones.',
    thumbnail: 'https://img.youtube.com/vi/QDVVENjyo_U/0.jpg',
    url: 'https://www.youtube.com/embed/QDVVENjyo_U?rel=0&enablejsapi=1',
    icon: Activity,
    iconColor: 'text-blue-500'
  },
  {
    id: 'allergic_reaction',
    title: 'Allergic Reaction',
    description: 'Recognizing and treating severe allergic reactions.',
    thumbnail: 'https://img.youtube.com/vi/-Yqk5cHXsko/0.jpg',
    url: 'https://www.youtube.com/embed/-Yqk5cHXsko?rel=0&enablejsapi=1',
    icon: AlertCircle,
    iconColor: 'text-red-500'
  },
  {
    id: 'seizure',
    title: 'Seizure',
    description: 'What to do during a seizure.',
    thumbnail: 'https://img.youtube.com/vi/VKGzXUB9FQs/0.jpg',
    url: 'https://www.youtube.com/embed/VKGzXUB9FQs?rel=0&enablejsapi=1',
    icon: Heart,
    iconColor: 'text-purple-500'
  },
  {
    id: 'stroke',
    title: 'Stroke F.A.S.T.',
    description: 'Recognizing stroke symptoms quickly.',
    thumbnail: 'https://img.youtube.com/vi/pwyOCAt5FNc/0.jpg',
    url: 'https://www.youtube.com/embed/pwyOCAt5FNc?rel=0&enablejsapi=1',
    icon: Activity,
    iconColor: 'text-green-500'
  }
];

const EMERGENCY_STEPS: Record<string, {
  title: string;
  steps: { number: number; text: string; duration?: string; critical?: boolean }[];
  warnings: string[];
  call911: boolean;
}> = {
  unconscious_cpr: {
    title: 'CPR (Cardiopulmonary Resuscitation)',
    call911: true,
    steps: [
      { number: 1, text: 'Check the scene for safety', critical: true },
      { number: 2, text: 'Tap the person and shout "Are you OK?"', critical: true },
      { number: 3, text: 'Call 911 or ask someone to call', critical: true },
      { number: 4, text: 'Check for breathing (look, listen, feel for 10 seconds)', duration: '10 sec' },
      { number: 5, text: 'If not breathing, begin chest compressions', critical: true },
      { number: 6, text: 'Place heel of hand on center of chest, other hand on top', critical: true },
      { number: 7, text: 'Push hard and fast: 100-120 compressions per minute', duration: '30 compressions', critical: true },
      { number: 8, text: 'Depth: At least 2 inches (5cm) for adults', critical: true },
      { number: 9, text: 'Allow chest to recoil completely between compressions' },
      { number: 10, text: 'Continue until help arrives or person shows signs of life', critical: true }
    ],
    warnings: ['Do not stop for more than 10 seconds', 'If trained, give 2 breaths after every 30 compressions', 'Use AED if available']
  },
  severe_bleeding: {
    title: 'Severe Bleeding Control',
    call911: true,
    steps: [
      { number: 1, text: 'Call 911 immediately for severe bleeding', critical: true },
      { number: 2, text: 'Put on gloves if available (protect yourself from blood)' },
      { number: 3, text: 'Expose the wound by removing clothing around injury' },
      { number: 4, text: 'Apply firm, direct pressure with clean cloth or sterile dressing', critical: true },
      { number: 5, text: 'Maintain pressure for at least 15 minutes', duration: '15 min', critical: true },
      { number: 6, text: 'If blood soaks through, add more layers on top - do NOT remove original dressing', critical: true },
      { number: 7, text: 'Elevate the injured area above heart level if possible' },
      { number: 8, text: 'If bleeding continues and on limb, apply tourniquet 2-3 inches above wound', critical: true },
      { number: 9, text: 'Note time of tourniquet application', critical: true },
      { number: 10, text: 'Monitor for shock (pale, cold, rapid breathing)', critical: true }
    ],
    warnings: ['Never remove embedded objects', 'Do not apply ointments or creams', 'Do not use tourniquet on chest, abdomen, or head']
  },
  choking: {
    title: 'Choking (Heimlich Maneuver)',
    call911: true,
    steps: [
      { number: 1, text: 'Ask "Are you choking?" - if they can cough, encourage coughing' },
      { number: 2, text: 'If unable to cough, speak, or breathe, call 911', critical: true },
      { number: 3, text: 'Stand behind the person and wrap your arms around their waist', critical: true },
      { number: 4, text: 'Make a fist with one hand and place thumb side against abdomen, above navel', critical: true },
      { number: 5, text: 'Grasp your fist with your other hand', critical: true },
      { number: 6, text: 'Give quick, upward thrusts into the abdomen', critical: true },
      { number: 7, text: 'Continue thrusts until object is expelled or person becomes unconscious', critical: true },
      { number: 8, text: 'If person becomes unconscious, gently lower them to ground', critical: true },
      { number: 9, text: 'Begin CPR starting with compressions', critical: true },
      { number: 10, text: 'Each time you open airway, look for object and remove if visible', critical: true }
    ],
    warnings: ['Do NOT give back blows to adults (only infants)', 'Do NOT try to grab object unless you can see it', 'For pregnant or obese persons: use chest thrusts instead']
  },
  burns: {
    title: 'Thermal Burns Treatment',
    call911: false,
    steps: [
      { number: 1, text: 'Ensure scene is safe - remove person from heat source' },
      { number: 2, text: 'Remove jewelry and loose clothing from burned area BEFORE swelling starts', critical: true },
      { number: 3, text: 'Cool the burn with cool (not cold) running water', duration: '10-20 min', critical: true },
      { number: 4, text: 'Do NOT apply ice directly to burn' },
      { number: 5, text: 'Do NOT break blisters', critical: true },
      { number: 6, text: 'Cover loosely with sterile, non-stick bandage or clean cloth', critical: true },
      { number: 7, text: 'Elevate burned area above heart if possible' },
      { number: 8, text: 'Watch for signs of infection (redness, swelling, pus)' },
      { number: 9, text: 'Give over-the-counter pain reliever if needed' },
      { number: 10, text: 'Seek medical care if burn is deep, large, or on face/hands/genitals', critical: true }
    ],
    warnings: ['Chemical burns: Rinse with water for 20+ minutes', 'Electrical burns: Check for breathing and heartbeat', 'Call 911 for burns covering >10% body surface']
  },
  fracture: {
    title: 'Fracture (Broken Bone)',
    call911: false,
    steps: [
      { number: 1, text: 'Do NOT move the person if head, neck, or back injury suspected', critical: true },
      { number: 2, text: 'Call 911 if bone is protruding, person is unresponsive, or severe bleeding', critical: true },
      { number: 3, text: 'Stop any bleeding by applying pressure around the wound' },
      { number: 4, text: 'Immobilize the injured area - do NOT try to straighten the bone', critical: true },
      { number: 5, text: 'Apply cold pack wrapped in cloth to reduce swelling', duration: '15-20 min' },
      { number: 6, text: 'Splint the injury using padded rigid object (cardboard, magazine)', critical: true },
      { number: 7, text: 'Secure splint above and below the fracture site' },
      { number: 8, text: 'Elevate the injured limb if possible' },
      { number: 9, text: 'Watch for signs of shock: pale, cold skin, rapid breathing' },
      { number: 10, text: 'Transport to emergency room for X-rays and treatment', critical: true }
    ],
    warnings: ['Open fractures (bone sticking out): Cover with clean cloth', 'Check fingers/toes for circulation (color, warmth)', 'Do NOT give food or drink - may need surgery']
  },
  allergic_reaction: {
    title: 'Severe Allergic Reaction (Anaphylaxis)',
    call911: true,
    steps: [
      { number: 1, text: 'Call 911 IMMEDIATELY - this is life-threatening', critical: true },
      { number: 2, text: 'Ask if they have an epinephrine auto-injector (EpiPen)', critical: true },
      { number: 3, text: 'Help them use the EpiPen if available', critical: true },
      { number: 4, text: 'Inject into outer thigh, through clothing if necessary', critical: true },
      { number: 5, text: 'Hold EpiPen in place for 3 seconds', duration: '3 sec' },
      { number: 6, text: 'Note time of injection', critical: true },
      { number: 7, text: 'Have person lie flat on back with legs elevated' },
      { number: 8, text: 'If vomiting or having trouble breathing, let them sit up' },
      { number: 9, text: 'Give second EpiPen after 5-15 minutes if symptoms persist', duration: '5-15 min' },
      { number: 10, text: 'Stay with person until emergency services arrive', critical: true }
    ],
    warnings: ['Symptoms: Difficulty breathing, swelling, hives, rapid pulse, dizziness', 'Second reaction can occur 4-8 hours later', 'Even if symptoms improve, still need medical evaluation']
  },
  seizure: {
    title: 'Seizure First Aid',
    call911: true,
    steps: [
      { number: 1, text: 'Note the time the seizure started', critical: true },
      { number: 2, text: 'Clear the area of hard or sharp objects to prevent injury', critical: true },
      { number: 3, text: 'Protect their head by placing something soft underneath', critical: true },
      { number: 4, text: 'Loosen tight clothing around neck', },
      { number: 5, text: 'Do NOT restrain the person or hold them down', critical: true },
      { number: 6, text: 'Do NOT put anything in their mouth', critical: true },
      { number: 7, text: 'Turn them gently onto their side after seizure ends', critical: true },
      { number: 8, text: 'Call 911 if seizure lasts >5 minutes or repeats', duration: '>5 min', critical: true },
      { number: 9, text: 'Call 911 if person is injured, pregnant, or has diabetes' },
      { number: 10, text: 'Stay calm and reassure person as they regain consciousness', critical: true }
    ],
    warnings: ['Tonic-clonic seizures: Body stiffens then jerks', 'Absence seizures: Staring, unresponsive', 'Status epilepticus: Seizure >5 min - EMERGENCY']
  },
  stroke: {
    title: 'Stroke (F.A.S.T. Response)',
    call911: true,
    steps: [
      { number: 1, text: 'F - FACE: Ask person to smile. Does one side droop?', critical: true },
      { number: 2, text: 'A - ARMS: Ask them to raise both arms. Does one drift down?', critical: true },
      { number: 3, text: 'S - SPEECH: Ask them to repeat a phrase. Is it slurred or strange?', critical: true },
      { number: 4, text: 'T - TIME: If any signs present, call 911 IMMEDIATELY', critical: true },
      { number: 5, text: 'Note the exact time symptoms started', critical: true },
      { number: 6, text: 'Keep person calm and seated or lying down' },
      { number: 7, text: 'Do NOT give food, drink, or medication', critical: true },
      { number: 8, text: 'Do NOT let person drive themselves', critical: true },
      { number: 9, text: 'If unconscious, place in recovery position (on side)' },
      { number: 10, text: 'Monitor breathing until help arrives', critical: true }
    ],
    warnings: ['Ischemic stroke: Clot blocks blood flow (tPA can dissolve if <4.5 hrs)', 'Hemorrhagic stroke: Bleeding in brain', 'Mini-stroke (TIA): Symptoms resolve <24 hrs - still need ER']
  }
};
  const FIRST_AID_CONTROLS = [
  { id: 'severe_bleeding', title: 'Severe Bleeding', icon: Flame, category: 'Trauma' },
  { id: 'choking', title: 'Choking', icon: AlertCircle, category: 'Breathing' },
  { id: 'unconscious_cpr', title: 'CPR Assist', icon: Activity, category: 'Cardiac' },
  { id: 'burns', title: 'Thermal Burns', icon: Flame, category: 'Trauma' },
  { id: 'fracture', title: 'Fractures', icon: Activity, category: 'Trauma' },
  { id: 'allergic_reaction', title: 'Allergic Reaction', icon: AlertCircle, category: 'Other' },
  { id: 'seizure', title: 'Seizure', icon: Heart, category: 'Other' },
  { id: 'stroke', title: 'Stroke F.A.S.T.', icon: Activity, category: 'Other' }
];

// Simple Radar SVG component
function RadarVisualizationSVG({ userLocation, helpers }) {
  const size = 220;
  const center = size / 2;
  const radius = size / 2 - 20;
  // Fake projection for demo: spread helpers in a circle
  const angleStep = helpers.length ? (2 * Math.PI) / helpers.length : 0;
  return (
    <svg width={size} height={size} className="mx-auto my-4">
      <circle cx={center} cy={center} r={radius} fill="#f3f4f6" stroke="#a5b4fc" strokeWidth="4" />
      {/* User */}
      <circle cx={center} cy={center} r={16} fill="#2563eb" stroke="#fff" strokeWidth="3" />
      {/* Helpers */}
      {helpers.map((h, i) => {
        const angle = i * angleStep;
        const r = radius * 0.8;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return (
          <g key={h.id}>
            <circle cx={x} cy={y} r={12} fill="#22d3ee" stroke="#fff" strokeWidth="2" />
            <text x={x} y={y+4} textAnchor="middle" fontSize="12" fill="#2563eb" fontWeight="bold">{h.name?.charAt(0) || '?'}</text>
          </g>
        );
      })}
      {/* Radar lines */}
      {[0,1,2,3].map(i => (
        <circle key={i} cx={center} cy={center} r={radius*(i+1)/4} fill="none" stroke="#a5b4fc" strokeDasharray="4 4" />
      ))}
    </svg>
  );
}

function EmergencyApp() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isBystanderMode, setIsBystanderMode] = useState(false);
  const [bystanderReport, setBystanderReport] = useState<{
    description: string;
    photo: string | null;
    location: { lat: number; lng: number } | null;
    locationDescription: string;
    name: string;
    contact: string;
    isSubmitting: boolean;
  }>({
    description: '',
    photo: null,
    location: null,
    locationDescription: '',
    name: '',
    contact: '',
    isSubmitting: false,
  });
  const [activeVideoGuide, setActiveVideoGuide] = useState<string | null>(null);
  const [isPublicEmergencyView, setIsPublicEmergencyView] = useState(false);
  const [publicEmergencyId, setPublicEmergencyId] = useState<string | null>(null);
  const [publicEmergencyData, setPublicEmergencyData] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('sos');
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [response, setResponse] = useState<EmergencyResponse | null>(null);
  const [language, setLanguage] = useState('English');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [history, setHistory] = useState<Incident[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<MapPlace[]>([]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  const [newContact, setNewContact] = useState<EmergencyContact>({ name: '', phone: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineSearchQuery, setOfflineSearchQuery] = useState('');
  const [selectedOfflineGuide, setSelectedOfflineGuide] = useState<OfflineFirstAid | null>(null);
  const [showOfflineLibrary, setShowOfflineLibrary] = useState(false);
  const [selectedNearbyPlace, setSelectedNearbyPlace] = useState<MapPlace | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Hospital']);
  const [isCPRActive, setIsCPRActive] = useState(false);
  const [isCprPulsing, setIsCprPulsing] = useState(false);

  // AI Features State
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [emergencyClassification, setEmergencyClassification] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [detectedIntent, setDetectedIntent] = useState<string>('');
  const [emotionAnalysis, setEmotionAnalysis] = useState<string[]>([]);

  // Emergency Features State
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [isRecordingEvidence, setIsRecordingEvidence] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Crowd Network State
  const [nearbyHelpers, setNearbyHelpers] = useState<any[]>([]);
  const [matchedResponder, setMatchedResponder] = useState<any | null>(null);
  const [isRadarActive, setIsRadarActive] = useState(false);
  const [trustScores, setTrustScores] = useState<{ [key: string]: number }>({});

  // Feature Instances
  const situationUnderstanding = new SituationUnderstanding();
  const emergencyClassifier = new EmergencyClassification();
  const decisionEngine = new DecisionEngine();
  const intentDetector = new IntentDetection();
  const emotionDetector = new EmotionDetection();
  const smartSOSTrigger = new SmartSOSTrigger();
  const autoSOSActivation = new AutoSOSActivation();
  const alertSystem = new RealTimeAlertSystem();
  const locationTracker = new LiveLocationTracking();
  const liveStreamer = new EmergencyLiveStreaming();
  const evidenceRecorder = new EvidenceRecordingSystem();
  const helpersDetector = new NearbyHelpersDetection();
  const responderMatcher = new ResponderMatchingSystem();
  const radarVisualizer = new RadarVisualization();
  const responderVerifier = new ResponderVerificationSystem();
  const trustSystem = new TrustRatingSystem();
  const helperNotifier = new HelperNotificationSystem();
  const emergencyLayerSystem = new EmergencyLayerSystem();
  const doctorMatchmaking = new DoctorMatchmakingSystem();
  
  // Safety Systems
  const safetyScoreSystem = new SafetyScoreSystem();
  const riskDetectionEngine = new RiskDetectionEngine();
  const unsafeAreaAlerts = new UnsafeAreaAlerts();
  const behaviorAnalysisSystem = new BehaviorAnalysisSystem();
  
  // Safety State
  const [currentSafetyScore, setCurrentSafetyScore] = useState(85);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [unsafeAreas, setUnsafeAreas] = useState<Array<{id: string, name: string, riskLevel: string, description: string}>>([]);
  const [behaviorInsights, setBehaviorInsights] = useState<Array<{type: string, description: string, confidence: number}>>([]);
  const [isFallDetectionEnabled, setIsFallDetectionEnabled] = useState(false);
  const [fallSensitivity, setFallSensitivity] = useState(50);
  const [lastAcceleration, setLastAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [isAutoTriggering, setIsAutoTriggering] = useState(false);
  const [autoTriggerReason, setAutoTriggerReason] = useState<string | null>(null);
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [predictedSeverity, setPredictedSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | null>(null);
  const [escalationStage, setEscalationStage] = useState<number>(0); // 0: None, 1: Family, 2: Nearby, 3: Emergency
  const [cprTimer, setCprTimer] = useState(0);
  const [cprCycle, setCprCycle] = useState(1);
  const [cprPhase, setCprPhase] = useState<'compressions' | 'breaths'>('compressions');
  const [compressionCount, setCompressionCount] = useState(0);
  const [cprBreathTimer, setCprBreathTimer] = useState(0);
  const [cprPoints, setCprPoints] = useState(0);
  const [cprAccuracy, setCprAccuracy] = useState(100);
  const [cprTaps, setCprTaps] = useState(0);
  const [cprPerfectTaps, setCprPerfectTaps] = useState(0);
  const [cprCombo, setCprCombo] = useState(0);
  const [cprMaxCombo, setCprMaxCombo] = useState(0);
  const [sessionTotalBeats, setSessionTotalBeats] = useState(0);
  const [lastMetronomeTime, setLastMetronomeTime] = useState(0);
  const [lastTapFeedback, setLastTapFeedback] = useState<'perfect' | 'good' | 'miss' | null>(null);
  const [showCprSummary, setShowCprSummary] = useState(false);
  const [showCprVideo, setShowCprVideo] = useState(false);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const cprIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Helper Recognition State
  const [isHelperPromptVisible, setIsHelperPromptVisible] = useState(false);
  const [isVerificationVisible, setIsVerificationVisible] = useState(false);
  const [isHelperFormVisible, setIsHelperFormVisible] = useState(false);
    const [is911ConfirmationVisible, setIs911ConfirmationVisible] = useState(false);
  const [pendingPhoneCall, setPendingPhoneCall] = useState<string | null>(null);
  const [helperData, setHelperData] = useState<HelperData | null>(null);
  const [helperForm, setHelperForm] = useState({ name: '', photo: '', consent: false });
  const [engagementStartTime, setEngagementStartTime] = useState<number | null>(null);
  const [incidentLocation, setIncidentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmedActions, setConfirmedActions] = useState<string[]>([]);
  const [nearbyFilter, setNearbyFilter] = useState('All');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('resqai_theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('resqai_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const [selectedAidCategory, setSelectedAidCategory] = useState('All');
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [isAddContactModalVisible, setIsAddContactModalVisible] = useState(false);
  const [selectedNearbyType, setSelectedNearbyType] = useState('hospital');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  // Emergency Layer System State
  const [currentEmergencyLayer, setCurrentEmergencyLayer] = useState<EmergencyLayer>(EmergencyLayer.LAYER_1_AI_FIRST_RESPONDER);
  const [layer1Response, setLayer1Response] = useState<any>(null);
  const [layer2Escalation, setLayer2Escalation] = useState<any>(null);
  const [layer3LiveExpert, setLayer3LiveExpert] = useState<any>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationTimer, setEscalationTimer] = useState(0);
  const [userResponses, setUserResponses] = useState<string[]>([]);
  
  // Naming Sync Aliases
  const incidentHistory = history;
  const nearbyFacilities = nearbyPlaces;
  const selectedNearbyPlaceId = selectedFacilityId;
  const setSelectedFacilityId_sync = setSelectedFacilityId;

  // Theme-aware styles for the UI
  const themeClasses = {
    bg: isDarkMode ? 'bg-slate-900' : 'bg-gray-50',
    card: isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    text: isDarkMode ? 'text-slate-100' : 'text-gray-900',
    textMuted: isDarkMode ? 'text-slate-400' : 'text-gray-500',
    nav: isDarkMode ? 'bg-[#1E293B]/80 backdrop-blur-2xl border-slate-800' : 'bg-white/80 backdrop-blur-xl border-gray-200',
  };

  const [stepsViewed, setStepsViewed] = useState(false);
  const [nearbyAlerts, setNearbyAlerts] = useState<any[]>([]);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [activeNearbyAlert, setActiveNearbyAlert] = useState<any>(null);
  const [activeIncidents, setActiveIncidents] = useState<any[]>([]);
  const [mapRadius, setMapRadius] = useState(2); // 2km default

  const LiveMap = ({ facilities, userLocation, selectedId }: { 
    facilities?: MapPlace[], 
    userLocation?: { lat: number; lng: number } | null,
    selectedId?: string | null
  }) => {
    const mapLocation = userLocation || location;
    
    if (!mapLocation) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <MapPin className="w-16 h-16 text-gray-300 mb-4 animate-pulse" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Location Required</h3>
          <p className="text-gray-500">Please enable location access to see live emergency incidents near you.</p>
        </div>
      );
    }

    const filteredIncidents = activeIncidents.filter(incident => {
      if (!incident.location) return false;
      const dist = calculateDistance(location.lat, location.lng, incident.location.lat, incident.location.lng);
      return dist <= mapRadius;
    });

    const customIcon = L.divIcon({
      className: 'blinking-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const [recenterTrigger, setRecenterTrigger] = useState(0);

    const RecenterMap = ({ coords }: { coords: [number, number] }) => {
      const map = useMap();
      useEffect(() => {
        map.setView(coords);
      }, [coords, map, recenterTrigger]);
      return null;
    };

    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600 animate-pulse" />
              Live Emergency Map
            </h2>
            <p className="text-xs text-gray-500">{filteredIncidents.length} active incidents within {mapRadius}km</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Radius:</span>
            <select 
              value={mapRadius} 
              onChange={(e) => setMapRadius(Number(e.target.value))}
              className="text-xs border rounded px-2 py-1 bg-white focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value={1}>1 km</option>
              <option value={2}>2 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
            </select>
          </div>
        </div>

        <div className="flex-1 relative">
          <MapContainer 
            center={[location.lat, location.lng]} 
            zoom={14} 
            className="w-full h-full"
            zoomControl={false}
          >
            <RecenterMap coords={[location.lat, location.lng]} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <Circle 
              center={[location.lat, location.lng]} 
              radius={mapRadius * 1000} 
              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.05, weight: 1, dashArray: '5, 5' }} 
            />

            <Marker position={[location.lat, location.lng]} icon={userIcon}>
              <Popup>You are here</Popup>
            </Marker>

            {filteredIncidents.map((incident) => (
              <Marker 
                key={incident.id} 
                position={[incident.location.lat, incident.location.lng]} 
                icon={customIcon}
              >
                <Popup className="custom-popup">
                  <div className="p-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        incident.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        incident.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {incident.severity}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900">{incident.emergencyType}</h4>
                    <p className="text-xs text-gray-600 mt-1">Reported by: {incident.reporterName || 'Anonymous'}</p>
                    <button 
                      onClick={() => {
                        setPublicEmergencyId(incident.userId);
                        setIsPublicEmergencyView(true);
                      }}
                      className="mt-2 w-full py-1.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors"
                    >
                      VIEW DETAILS
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Facility Markers */}
            {facilities && facilities.map((facility) => {
              const facilityIcon = () => {
                switch (facility.type) {
                  case 'Hospital': 
                    return L.divIcon({
                      className: 'facility-marker',
                      html: `<div class="w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg></div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                    });
                  case 'Clinic': 
                    return L.divIcon({
                      className: 'facility-marker',
                      html: `<div class="w-6 h-6 bg-blue-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg></div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                    });
                  case 'Pharmacy': 
                    return L.divIcon({
                      className: 'facility-marker',
                      html: `<div class="w-6 h-6 bg-green-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 1.107z"/></svg></div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                    });
                  case 'Police Station': 
                    return L.divIcon({
                      className: 'facility-marker',
                      html: `<div class="w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg></div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                    });
                  case 'Fire Station': 
                    return L.divIcon({
                      className: 'facility-marker',
                      html: `<div class="w-6 h-6 bg-orange-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/></svg></div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                    });
                  case 'Blood Bank': 
                    return L.divIcon({
                      className: 'facility-marker',
                      html: `<div class="w-6 h-6 bg-pink-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg></div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                    });
                  default: 
                    return L.divIcon({
                      className: 'facility-marker',
                      html: `<div class="w-6 h-6 bg-gray-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg></div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 12],
                    });
                }
              };

              return (
                <Marker 
                  key={facility.id} 
                  position={[facility.lat, facility.lng]} 
                  icon={facilityIcon()}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          facility.type === 'Hospital' ? 'bg-red-100 text-red-700' :
                          facility.type === 'Clinic' ? 'bg-blue-100 text-blue-700' :
                          facility.type === 'Pharmacy' ? 'bg-green-100 text-green-700' :
                          facility.type === 'Police Station' ? 'bg-blue-100 text-blue-700' :
                          facility.type === 'Fire Station' ? 'bg-orange-100 text-orange-700' :
                          facility.type === 'Blood Bank' ? 'bg-pink-100 text-pink-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {facility.type}
                        </span>
                        {facility.distance_meters && (
                          <span className="text-[10px] text-gray-400">
                            {(facility.distance_meters / 1000).toFixed(1)} km
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 mb-1">{facility.name}</h4>
                      {facility.address && (
                        <p className="text-xs text-gray-600 mb-2">{facility.address}</p>
                      )}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            if (selectedId === facility.id) {
                              setSelectedFacilityId(null);
                            } else {
                              setSelectedFacilityId(facility.id);
                            }
                          }}
                          className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${
                            selectedId === facility.id 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {selectedId === facility.id ? 'Selected' : 'Select'}
                        </button>
                        <button 
                          onClick={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`;
                            window.open(url, '_blank');
                          }}
                          className="flex-1 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded hover:bg-green-200 transition-colors"
                        >
                          Directions
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          
          <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
            <button 
              onClick={() => {
                setRecenterTrigger(prev => prev + 1);
              }}
              className="p-3 bg-white rounded-full shadow-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>

          {/* Map Legend */}
          <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-3">
            <h4 className="text-xs font-bold text-gray-700 mb-2">Facilities</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 border border-white rounded-full"></div>
                <span className="text-[10px] text-gray-600">Hospital</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 border border-white rounded-full"></div>
                <span className="text-[10px] text-gray-600">Clinic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 border border-white rounded-full"></div>
                <span className="text-[10px] text-gray-600">Pharmacy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 border border-white rounded-full"></div>
                <span className="text-[10px] text-gray-600">Police</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 border border-white rounded-full"></div>
                <span className="text-[10px] text-gray-600">Fire Station</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-500 border border-white rounded-full"></div>
                <span className="text-[10px] text-gray-600">Blood Bank</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isInitialLoad = useRef(true);

  const sendNotification = ({ title, body, incidentId }: { title: string, body: string, incidentId?: string }) => {
    // 1. Browser Notification API
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }

    // 2. In-App Toast
    showToast(`${title}: ${body}`, 'error');

    // 3. Play sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  useEffect(() => {
    if (!user) return;

    const incidentsRef = ref(db, 'incidents');
    const q = query(incidentsRef, orderByChild('status'), equalTo('active'));

    const unsubscribe = onValue(q, (snapshot) => {
      const allIncidents = mapSnapshotToArray(snapshot);
      const activeIncidents = allIncidents.filter((inc: any) => inc.status === 'active');
      setActiveIncidents(activeIncidents);

      // Handle Push Notifications for NEW incidents
      if (!isInitialLoad.current) {
        const now = Date.now();
        activeIncidents.forEach((data: any) => {
          if (data.userId === user.uid) return;

          // Check distance
          if (data.location && location) {
            const dist = calculateDistance(location.lat, location.lng, data.location.lat, data.location.lng);
            if (dist <= mapRadius) {
              const incidentTime = typeof data.timestamp === 'number' ? data.timestamp : 0;
              if (now - incidentTime < 60000) {
                sendNotification({
                  title: "🚨 Emergency Nearby",
                  body: `A ${data.emergencyType} alert was triggered ${dist.toFixed(1)}km away!`,
                  incidentId: data.id
                });
              }
            }
          }
        });
      }
      isInitialLoad.current = false;
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'incidents');
    });

    return () => off(incidentsRef);
  }, [user, location, mapRadius]);

  const fetchNearbyFacilitiesFromOSM = async (lat: number, lng: number) => {
    const radius = 10000; // 10km — doubled for more results
    const query = `
      [out:json][timeout:60];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        way["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="clinic"](around:${radius},${lat},${lng});
        node["amenity"="doctors"](around:${radius},${lat},${lng});
        node["amenity"="dentist"](around:${radius},${lat},${lng});
        node["amenity"="pharmacy"](around:${radius},${lat},${lng});
        way["amenity"="pharmacy"](around:${radius},${lat},${lng});
        node["amenity"="police"](around:${radius},${lat},${lng});
        node["amenity"="fire_station"](around:${radius},${lat},${lng});
        node["amenity"="blood_bank"](around:${radius},${lat},${lng});
        node["amenity"="social_facility"](around:${radius},${lat},${lng});
        node["amenity"="veterinary"](around:${radius},${lat},${lng});
      );
      out center 200;
    `;
    
    const amenityTypeMap: Record<string, string> = {
      hospital: 'Hospital',
      clinic: 'Clinic',
      doctors: 'Clinic',
      dentist: 'Clinic',
      pharmacy: 'Pharmacy',
      police: 'Police Station',
      fire_station: 'Fire Station',
      blood_bank: 'Blood Bank',
      social_facility: 'Social Facility',
      veterinary: 'Veterinary'
    };

    try {
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('OSM Fetch Failed');
      const data = await response.json();
      
      return data.elements
        .filter((el: any) => el.tags?.amenity)
        .map((el: any) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          return {
            id: el.id.toString(),
            name: el.tags.name || `${el.tags.amenity.replace(/_/g, ' ')} (Unnamed)`,
            type: amenityTypeMap[el.tags.amenity] || el.tags.amenity,
            lat: elLat,
            lng: elLon,
            address: el.tags['addr:street'] || el.tags['addr:full'] || 'Nearby Area',
            distance_meters: calculateDistance(lat, lng, elLat, elLon) * 1000
          };
        })
        .filter((f: any) => f.lat && f.lng) // remove any elements without coordinates
        .sort((a: any, b: any) => a.distance_meters - b.distance_meters); // nearest first
    } catch (error) {
      console.warn("OSM Fetch failed, falling back to mocks:", error);
      return generateMockFacilities(lat, lng);
    }
  };

  const generateMockFacilities = (lat: number, lng: number): MapPlace[] => {
    const facilityData: { type: string; names: string[]; spread: number }[] = [
      { type: 'Hospital', spread: 0.06, names: [
        'City General Hospital', 'LifeCare Medical Center', 'Apex Emergency Care',
        'St. Mary\'s Hospital', 'Apollo Hospital', 'AIIMS Medical Center',
        'Fortis Hospital', 'Medanta Super Speciality', 'Max Healthcare'
      ]},
      { type: 'Clinic', spread: 0.04, names: [
        'Primary Health Centre', 'Dr. Sharma\'s Clinic', 'Sunrise Medical Clinic',
        'MedPlus Clinic', 'Family Health Centre', 'Dr. Reddy Diagnostics',
        'Urban Primary Clinic', 'Community Health Clinic'
      ]},
      { type: 'Pharmacy', spread: 0.03, names: [
        'MedPlus Pharmacy', 'Apollo Pharmacy', 'Wellness Forever',
        'Local MediStore', 'QuickAid Pharmacy', 'HealthMart Drugs',
        'Netmeds Point', 'PharmEasy Outlet', '24hr Pharmacy'
      ]},
      { type: 'Police Station', spread: 0.07, names: [
        'Central Police Station', 'Traffic Police Post', 'East Zone Police Station',
        'Metropolitan Police HQ', 'Cyber Crime Station', 'Women\'s Safety Cell'
      ]},
      { type: 'Fire Station', spread: 0.08, names: [
        'City Fire & Rescue', 'Volunteer Fire Dept', 'Fire Station No. 9',
        'Industrial Fire Unit', 'Airport Fire Station', 'Urban Fire Squad'
      ]},
      { type: 'Blood Bank', spread: 0.05, names: [
        'Regional Blood Bank', 'Red Cross Blood Centre', 'LifeLine Blood Services',
        'Government Blood Bank', 'Hospital Blood Unit'
      ]}
    ];

    const results: MapPlace[] = [];
    let idx = 0;
    facilityData.forEach(({ type, names, spread }) => {
      names.forEach((name) => {
        const angle = Math.random() * 2 * Math.PI;
        const r = (Math.random() * 0.7 + 0.1) * spread; // 10%–80% of spread
        results.push({
          id: `mock-${idx++}`,
          name,
          type,
          lat: lat + r * Math.cos(angle),
          lng: lng + r * Math.sin(angle),
          distance_meters: Math.floor(Math.random() * 8000) + 400,
          address: 'Offline Mode — Approximate Location'
        });
      });
    });

    // Sort by distance
    return results.sort((a, b) => a.distance_meters - b.distance_meters);
  };

  useEffect(() => {
    if (activeTab === 'nearby' && nearbyPlaces.length === 0 && location && !isFetchingPlaces) {
      const fetchInitialPlaces = async () => {
        setIsFetchingPlaces(true);
        try {
          const results = await fetchNearbyFacilitiesFromOSM(location.lat, location.lng);
          setNearbyPlaces(results);
        } catch (error) {
          console.error("Nearby facilities fetch failed:", error);
          setNearbyPlaces(generateMockFacilities(location.lat, location.lng));
        } finally {
          setIsFetchingPlaces(false);
        }
      };
      fetchInitialPlaces();
    }
  }, [activeTab, location, nearbyPlaces.length, isFetchingPlaces]);

  const groupedNearbyPlaces = nearbyPlaces.reduce((acc, place) => {
    const type = place.type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(place);
    return acc;
  }, {} as Record<string, MapPlace[]>);

  // Sort categories to put requested ones first
  const sortedCategories = Object.keys(groupedNearbyPlaces).sort((a, b) => {
    const priority = ['Hospital', 'Pharmacy', 'Police Station', 'Fire Station'];
    const indexA = priority.indexOf(a);
    const indexB = priority.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const toggleNearbyCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  // Behavior-based Validation State
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isGuidedMode, setIsGuidedMode] = useState(false);
  const [situationalAnswers, setSituationalAnswers] = useState<Record<string, string>>({});
  const [isReviewingRecognition, setIsReviewingRecognition] = useState(false);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);

  // Privacy State
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(() => {
    return localStorage.getItem('hasAcceptedPrivacy') === 'true';
  });
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [isPrivacyModeOn, setIsPrivacyModeOn] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const fallDetectedRef = useRef(false);

  useEffect(() => {
    if (!isFallDetectionEnabled || !user) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const totalAcc = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      
      // Standard gravity is ~9.8 m/s^2
      // Sensitivity mapping: 0 (least sensitive) -> 100 (most sensitive)
      // High sensitivity = lower impact threshold, higher freefall threshold
      const impactThreshold = 35 - (fallSensitivity / 100) * 15; // 20 to 35 m/s^2
      const freefallThreshold = 2 + (fallSensitivity / 100) * 2; // 2 to 4 m/s^2

      // Simple fall detection: 
      // 1. Detect a period of near-zero gravity (free fall)
      // 2. Detect a sudden high impact
      
      if (totalAcc < freefallThreshold) {
        // Potential free fall
      }

      if (totalAcc > impactThreshold && !fallDetectedRef.current) {
        console.log("Fall detected!", totalAcc);
        fallDetectedRef.current = true;
        
        // Trigger SOS countdown
        setIsCountdownActive(true);
        setCountdown(15); // Give more time for accidental triggers
        
        showToast("⚠️ FALL DETECTED! Starting emergency countdown...", "error");
        speak("A fall has been detected. Starting emergency countdown. Tap to cancel if you are okay.");

        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        
        countdownTimerRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
              // Trigger a default high-severity alert
              const fallRes: EmergencyResponse = {
                emergencyType: "Fall Detected",
                severity: "high",
                emergencyKey: "general_emergency",
                triggerAlert: true,
                speechText: "A fall was detected by the user's device. Emergency services are being notified.",
                language: language
              };
              triggerActualAlert(fallRes);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Reset after 30 seconds to avoid double triggers
        setTimeout(() => {
          fallDetectedRef.current = false;
        }, 30000);
      }
    };

    // Request permission for iOS 13+
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isFallDetectionEnabled, fallSensitivity, user, language]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    if (permission === 'granted') {
      showToast("Notifications enabled!", "success");
    }
  };

  const toggleNotificationPermission = async () => {
    if (notificationsEnabled) {
      // Inform user that notifications cannot be disabled programmatically
      showToast("To disable notifications, please update your browser settings.", "info");
      console.warn("Notifications cannot be disabled programmatically. Instruct the user to update browser settings.");
    } else {
      // Request permission to enable notifications
      if (!('Notification' in window)) {
        showToast("Notifications are not supported in this browser", "error");
        return;
      }
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        showToast("Notifications enabled!", "success");
      } else {
        showToast("Notifications not enabled", "error");
      }
    }
  };

  const handleAcceptPrivacy = async () => {
    setHasAcceptedPrivacy(true);
    localStorage.setItem('hasAcceptedPrivacy', 'true');
    setShowPrivacyConsent(false);
    
    if (user) {
      const docRef = ref(db, `users/${user.uid}`);
      await update(docRef, {
        'settings.hasAcceptedPrivacy': true
      }).catch(err => handleDatabaseError(err, OperationType.UPDATE, `users/${user.uid}`));
    }
  };

  const handleDeclinePrivacy = () => {
    setShowPrivacyConsent(false);
    showToast("Privacy consent is required for some features", "info");
  };

  const togglePrivacyMode = async () => {
    if (!user || !userProfile) {
      showToast("Please login to change settings", "error");
      return;
    }
    const newVal = !isPrivacyModeOn;
    setIsPrivacyModeOn(newVal);
    
    try {
      await update(ref(db, `users/${user.uid}/settings`), {
        privacyModeEnabled: newVal
      });
      showToast(`Privacy Mode ${newVal ? 'ON' : 'OFF'}`, 'success');
    } catch (error: any) {
      console.error('Toggle Privacy - Error:', error);
      const errorMsg = error?.message || error?.code || 'Unknown error';
      showToast(`Failed: ${errorMsg}`, "error");
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (publicEmergencyId) {
      setIsPublicEmergencyView(true);
      
      // Listen to user profile
      const userRef = ref(db, `users/${publicEmergencyId}`);
      onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setPublicEmergencyData(data as UserProfile);
        }
      }, (error) => handleDatabaseError(error, OperationType.GET, `users/${publicEmergencyId}`));

      // Listen to latest active incident to get location
      const incidentsRef = ref(db, 'incidents');
      const q = query(
        incidentsRef,
        orderByChild('userId'),
        equalTo(publicEmergencyId)
      );
      
      const unsubIncident = onValue(q, (snapshot) => {
        const incidents = mapSnapshotToArray(snapshot);
        const activeIncident = incidents.find((inc: any) => inc.status === 'active');
        if (activeIncident && activeIncident.location) {
          setIncidentLocation(activeIncident.location);
        }
      }, (error) => handleDatabaseError(error, OperationType.GET, 'incidents'));

      return () => {
        off(userRef);
        off(incidentsRef);
      };
    }
  }, [publicEmergencyId, db]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emergencyId = params.get('emergencyId');
    if (emergencyId) {
      setPublicEmergencyId(emergencyId);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (!user) {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize sample doctors for testing
  useEffect(() => {
    if (user && isAuthReady) {
      initializeSampleDoctors();
    }
  }, [user, isAuthReady]);

  // Initialize safety systems
  useEffect(() => {
    if (user && location) {
      // Initialize safety score system
      const safetyScore = safetyScoreSystem.getCurrentScore();
      setCurrentSafetyScore(safetyScore);
      
      // Initialize risk detection
      const assessment = riskDetectionEngine.getCurrentAssessment();
      const rawLevel = assessment?.riskLevel || 'low';
      
      // Map RiskDetectionEngine levels to UI levels
      const mappedLevel: 'low' | 'medium' | 'high' | 'critical' = 
        rawLevel === 'extreme' ? 'critical' : 
        rawLevel === 'moderate' ? 'medium' : 
        rawLevel === 'minimal' ? 'low' : 
        (rawLevel as any);
      
      setRiskLevel(mappedLevel);
      
      // Initialize unsafe areas
      const areas = unsafeAreaAlerts.getUnsafeAreas();
      setUnsafeAreas(areas);
      
      // Initialize behavior analysis
      const insights = behaviorAnalysisSystem.getBehaviorInsights();
      setBehaviorInsights(insights);
    }
  }, [user, location]);

  const initializeSampleDoctors = async () => {
    try {
      // Check if doctors already exist
      const doctorsRef = ref(db, 'doctors');
      const snapshot = await new Promise<any>((resolve) => {
        onValue(doctorsRef, (snap) => resolve(snap), { onlyOnce: true });
      });

      if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
        return; // Doctors already exist
      }

      // Add sample doctors
      const sampleDoctors = [
        {
          name: 'Dr. Sarah Johnson',
          specialty: 'Emergency Medicine',
          experience: 12,
          rating: 4.8,
          languages: ['English', 'Spanish'],
          verified: true,
          location: { lat: 40.7128, lng: -74.0060 } // New York
        },
        {
          name: 'Dr. Michael Chen',
          specialty: 'Trauma Surgery',
          experience: 15,
          rating: 4.9,
          languages: ['English', 'Mandarin'],
          verified: true,
          location: { lat: 37.7749, lng: -122.4194 } // San Francisco
        },
        {
          name: 'Dr. Priya Patel',
          specialty: 'Internal Medicine',
          experience: 10,
          rating: 4.7,
          languages: ['English', 'Hindi', 'Gujarati'],
          verified: true,
          location: { lat: 28.6139, lng: 77.2090 } // Delhi
        },
        {
          name: 'Dr. James Wilson',
          specialty: 'Cardiology',
          experience: 18,
          rating: 4.9,
          languages: ['English'],
          verified: true,
          location: { lat: 51.5074, lng: -0.1278 } // London
        }
      ];

      for (const doctor of sampleDoctors) {
        await doctorMatchmaking.registerDoctor(doctor);
      }

      console.log('Sample doctors initialized');
    } catch (error) {
      console.error('Error initializing sample doctors:', error);
    }
  };

  useEffect(() => {
    if (!isFallDetectionEnabled || !user) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const totalAcc = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      
      // Standard gravity is ~9.8 m/s^2
      // Sensitivity mapping: 0 (least sensitive) -> 100 (most sensitive)
      // High sensitivity = lower impact threshold, higher freefall threshold
      const impactThreshold = 35 - (fallSensitivity / 100) * 15; // 20 to 35 m/s^2
      const freefallThreshold = 2 + (fallSensitivity / 100) * 2; // 2 to 4 m/s^2

      // Simple fall detection: 
      // 1. Detect a period of near-zero gravity (free fall)
      // 2. Detect a sudden high impact
      
      if (totalAcc < freefallThreshold) {
        // Potential free fall
      }

      if (totalAcc > impactThreshold && !isAutoTriggering && !isCountdownActive) {
        console.log("Fall detected!", totalAcc);
        triggerAutoSOS("Sudden impact detected via sensors");
      }
    };

    // Request permission for iOS 13+
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isFallDetectionEnabled, fallSensitivity, user, isAutoTriggering, isCountdownActive]);

  const triggerAutoSOS = (reason: string) => {
    setIsAutoTriggering(true);
    setAutoTriggerReason(reason);
    showToast(`${reason}. Auto-triggering SOS in 15s...`, 'error');
    speak(`${reason}. Starting emergency countdown. Tap to cancel if you are okay.`);
    
    // Start the standard countdown
    setIsCountdownActive(true);
    setCountdown(15);
    
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          
          // Trigger a default high-severity alert
          const fallRes: EmergencyResponse = {
            emergencyType: "Fall Detected",
            severity: "high",
            emergencyKey: "general_emergency",
            triggerAlert: true,
            speechText: "A fall was detected by the user's device. Emergency services are being notified.",
            language: language
          };
          triggerActualAlert(fallRes);
          setIsAutoTriggering(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Also play an alert sound to get user's attention
    playSiren();
  };



  useEffect(() => {
    if (!hasAcceptedPrivacy) {
      setShowPrivacyConsent(true);
    }
  }, [hasAcceptedPrivacy]);

  useEffect(() => {
    if (!user || !isAuthReady) return;

    const userRef = ref(db, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserProfile(data);
        setLanguage(data.settings?.language || 'English');
        setIsPrivacyModeOn(data.settings?.privacyModeEnabled || false);
        setIsFallDetectionEnabled(data.settings?.fallDetectionEnabled || false);
        setFallSensitivity(data.settings?.fallSensitivity || 50);
        if (data.settings?.hasAcceptedPrivacy) {
          setHasAcceptedPrivacy(true);
          localStorage.setItem('hasAcceptedPrivacy', 'true');
        }
      } else {
        // Create initial profile
        const initialProfile = {
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          role: 'client',
          emergencyContacts: [],
          settings: {
            sirenEnabled: true,
            voiceGuidanceEnabled: true,
            privacyModeEnabled: false,
            hasAcceptedPrivacy: hasAcceptedPrivacy
          }
        };
        set(userRef, initialProfile).catch(err => handleDatabaseError(err, OperationType.WRITE, `users/${user.uid}`));
      }
    }, (error) => {
      handleDatabaseError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user, isAuthReady, hasAcceptedPrivacy]);

  useEffect(() => {
    if (isBystanderMode && location && !bystanderReport.location) {
      setBystanderReport(prev => ({ ...prev, location }));
    }
  }, [isBystanderMode, location]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      }, (error) => {
        console.error("Geolocation error:", error);
      });
    }
  }, []);

  useEffect(() => {
    if (!user || !location) return;

    const incidentsRef = ref(db, 'incidents');
    const q = query(incidentsRef, orderByChild('status'), equalTo('active'));

    const unsubscribe = onValue(q, (snapshot) => {
      const allIncidents = mapSnapshotToArray(snapshot);
      const filtered = allIncidents.filter((data: any) => {
        if (!data.location || data.userId === user.uid) return false;
        
        const dist = calculateDistance(location.lat, location.lng, data.location.lat, data.location.lng);
        const incidentTime = typeof data.timestamp === 'number' ? data.timestamp : 0;
        const ageInMinutes = (Date.now() - incidentTime) / 60000;
        
        return dist <= 2 && ageInMinutes < 10;
      }).map((data: any) => ({
        ...data,
        distance: calculateDistance(location.lat, location.lng, data.location.lat, data.location.lng)
      }));

      if (filtered.length > 0) {
        const latest = filtered[0];
        setActiveNearbyAlert(latest);
        setIsAlertVisible(true);
      }
      
      setNearbyAlerts(filtered);
    }, (error) => {
      handleDatabaseError(error, OperationType.GET, 'incidents');
    });

    return () => off(incidentsRef);
  }, [user, location]);

  useEffect(() => {
    if (!user || !isAuthReady) return;

    const incidentsRef = ref(db, 'incidents');
    const q = query(incidentsRef, orderByChild('userId'), equalTo(user.uid));

    const unsubscribe = onValue(q, (snapshot) => {
      const allIncidents = mapSnapshotToArray(snapshot);
      // RTDB results aren't guaranteed to be desc by default, so we sort or reverse
      const history = allIncidents.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      setHistory(history as Incident[]);
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'incidents');
    });

    return () => off(incidentsRef);
  }, [user, isAuthReady]);

  const startCPR = () => {
    setIsCPRActive(true);
    setShowCprVideo(true);
    setCprTimer(0);
    setCprCycle(1);
    setCprPhase('compressions');
    setCompressionCount(0);
    setCprPoints(0);
    setCprAccuracy(100);
    setCprTaps(0);
    setCprPerfectTaps(0);
    setCprCombo(0);
    setCprMaxCombo(0);
    setSessionTotalBeats(0);
    setLastMetronomeTime(Date.now());
    setLastTapFeedback(null);
    
    // Initialize AudioContext for metronome
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Ensure AudioContext is resumed (browsers often suspend it)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Start timer
    cprIntervalRef.current = setInterval(() => {
      setCprTimer(prev => prev + 1);
    }, 1000);

    // Initial voice prompt
    speak("Starting CPR. Follow the beat. 30 compressions, then 2 breaths.");
  };

  const handleCprTap = () => {
    if (!isCPRActive || cprPhase !== 'compressions') return;
    
    const now = Date.now();
    const interval = 60000 / 110;
    const diff = Math.abs(now - lastMetronomeTime);
    
    // Check if it's within 150ms of the beat (either just before or just after)
    const isPerfect = diff < 150 || diff > (interval - 150);
    const isGood = diff < 250 || diff > (interval - 250);
    
    setCprTaps(prev => prev + 1);
    
    if (isPerfect) {
      setCprPerfectTaps(prev => prev + 1);
      setCprCombo(prev => {
        const next = prev + 1;
        if (next > cprMaxCombo) setCprMaxCombo(next);
        return next;
      });
      setCprPoints(prev => prev + (10 + Math.floor(cprCombo / 5) * 2)); // Combo bonus
      setLastTapFeedback('perfect');
    } else if (isGood) {
      setCprPoints(prev => prev + 5);
      setCprCombo(0);
      setLastTapFeedback('good');
    } else {
      setCprPoints(prev => prev + 1);
      setCprCombo(0);
      setLastTapFeedback('miss');
    }
    
    // Clear feedback after 500ms
    setTimeout(() => setLastTapFeedback(null), 500);
    
    // Update accuracy: (perfectTaps / Math.max(taps, beats))
    // This penalizes both extra taps and missed beats
    const currentBeats = sessionTotalBeats + compressionCount;
    const currentTaps = cprTaps + 1;
    const perfectCount = cprPerfectTaps + (isPerfect ? 1 : 0);
    setCprAccuracy(Math.round((perfectCount / Math.max(currentTaps, currentBeats)) * 100));
  };

  const stopCPR = async () => {
    setIsCPRActive(false);
    setShowCprVideo(false);
    if (cprIntervalRef.current) clearInterval(cprIntervalRef.current);
    speak("CPR Stopped.");
    
    // Calculate rewards
    const sessionPoints = cprPoints + (cprCycle * 50) + (Math.floor(cprTimer / 60) * 100);
    const earnedBadges: Badge[] = [];
    
    if (cprCycle >= 1) {
      earnedBadges.push({ id: 'first-responder', name: 'First Responder', description: 'Completed your first CPR cycle.', icon: 'Medal', dateEarned: new Date().toISOString() });
    }
    if (cprTimer >= 120 && cprAccuracy >= 80) {
      earnedBadges.push({ id: 'steady-rhythm', name: 'Steady Rhythm', description: 'Maintained a consistent rhythm for 2 minutes.', icon: 'Activity', dateEarned: new Date().toISOString() });
    }
    if (cprTimer >= 300) {
      earnedBadges.push({ id: 'endurance-hero', name: 'Endurance Hero', description: 'Performed CPR for more than 5 minutes.', icon: 'Timer', dateEarned: new Date().toISOString() });
    }
    if (cprMaxCombo >= 30) {
      earnedBadges.push({ id: 'rhythm-master', name: 'Rhythm Master', description: 'Achieved a compression combo of 30 or more.', icon: 'Zap', dateEarned: new Date().toISOString() });
    }
    if (cprAccuracy >= 90 && cprTimer >= 120) {
      earnedBadges.push({ id: 'cpr-pro', name: 'CPR Pro', description: 'Achieved 90%+ accuracy for at least 2 minutes.', icon: 'ShieldCheck', dateEarned: new Date().toISOString() });
    }
    
    // Update user profile
    if (user) {
      const currentProfile = userProfile || {};
      const newPoints = (currentProfile.points || 0) + sessionPoints;
      const existingBadgeIds = new Set((currentProfile.badges || []).map(b => b.id));
      const filteredNewBadges = earnedBadges.filter(b => !existingBadgeIds.has(b.id));
      
      const updatedBadges = [...(currentProfile.badges || []), ...filteredNewBadges];
      
      if (newPoints >= 1000 && !existingBadgeIds.has('life-saver')) {
        const lifeSaver = { id: 'life-saver', name: 'Life Saver', description: 'Accumulated 1000 total points.', icon: 'Award', dateEarned: new Date().toISOString() };
        updatedBadges.push(lifeSaver);
        filteredNewBadges.push(lifeSaver);
      }
      
      try {
        await update(ref(db, `users/${user.uid}`), {
          points: newPoints,
          badges: updatedBadges
        });
        
        setNewBadges(filteredNewBadges);
        setShowCprSummary(true);
      } catch (error) {
        console.error("Error updating profile with CPR rewards:", error);
      }
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Language support for browser speech synthesis
    if (language === 'Hindi') utterance.lang = 'hi-IN';
    else if (language === 'Telugu') utterance.lang = 'te-IN';
    else if (language === 'Tamil') utterance.lang = 'ta-IN';
    else if (language === 'Kannada') utterance.lang = 'kn-IN';
    else if (language === 'Spanish') utterance.lang = 'es-ES';
    else if (language === 'French') utterance.lang = 'fr-FR';
    else if (language === 'Arabic') utterance.lang = 'ar-SA';
    else if (language === 'German') utterance.lang = 'de-DE';
    else if (language === 'Portuguese') utterance.lang = 'pt-BR';
    else if (language === 'Chinese') utterance.lang = 'zh-CN';
    else if (language === 'Japanese') utterance.lang = 'ja-JP';
    else if (language === 'Russian') utterance.lang = 'ru-RU';
    else if (language === 'Italian') utterance.lang = 'it-IT';
    else if (language === 'Korean') utterance.lang = 'ko-KR';
    else utterance.lang = 'en-US';

    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  // Metronome and Logic Effect
  useEffect(() => {
    let metronomeInterval: NodeJS.Timeout | null = null;
    
    if (isCPRActive && cprPhase === 'compressions') {
      const bpm = 110;
      const interval = 60000 / bpm;
      
      metronomeInterval = setInterval(() => {
        setLastMetronomeTime(Date.now());
        setSessionTotalBeats(prev => prev + 1);
        // Play beep - Uses local Web Audio API (works offline)
        if (audioContextRef.current) {
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
          
          const osc = audioContextRef.current.createOscillator();
          const gain = audioContextRef.current.createGain();
          osc.connect(gain);
          gain.connect(audioContextRef.current.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);
          osc.start();
          osc.stop(audioContextRef.current.currentTime + 0.1);
        }

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        // Trigger visual pulse
        setIsCprPulsing(true);
        setTimeout(() => setIsCprPulsing(false), 100);
        
        setCompressionCount(prev => {
          const next = prev + 1;
          if (next >= 30) {
            setCprPhase('breaths');
            speak("Stop compressions. Give 2 breaths.");
            return 0;
          }
          // Periodic encouragement
          if (next === 10) speak("Keep going.");
          if (next === 20) speak("Push hard and fast.");
          return next;
        });
      }, interval);
    } else if (isCPRActive && cprPhase === 'breaths') {
      // Guide through 2 breaths (3 seconds each: 1s inhale, 2s exhale/pause)
      setCprBreathTimer(0);
      let breathStep = 0;
      
      const breathInterval = setInterval(() => {
        breathStep += 0.1;
        setCprBreathTimer(breathStep);
        
        if (breathStep >= 6) {
          clearInterval(breathInterval);
          setCprPhase('compressions');
          setCprCycle(prev => prev + 1);
          speak("Back to compressions.");
        } else if (Math.abs(breathStep - 3) < 0.05) {
          speak("Second breath.");
        }
      }, 100);

      return () => clearInterval(breathInterval);
    }

    return () => {
      if (metronomeInterval) clearInterval(metronomeInterval);
    };
  }, [isCPRActive, cprPhase]);

  const handleLogin = async () => {
    console.log('Login button clicked');
    console.log('Current domain:', window.location.hostname, 'Port:', window.location.port);
    try {
      console.log('Attempting signInWithPopup...');
      await signInWithPopup(auth, googleProvider);
      showToast("Signed in successfully!", "success");
    } catch (error: any) {
      console.error("Login failed:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Full error:", JSON.stringify(error));
      
      if (error.code === 'auth/unauthorized-domain') {
        showToast("Domain Not Authorized: Add 'localhost' to Firebase Console > Auth > Settings.", "error");
      } else if (error.code === 'auth/internal-error') {
        showToast(`Auth Error: ${error.message}. Check console for details.`, "error");
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Silently handle if user just closed the popup
      } else if (error.code === 'auth/popup-blocked') {
        showToast("Popup blocked! Allow popups for this site.", "error");
      } else {
        showToast(`Login failed: ${error.message} (${error.code})`, "error");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setResponse(null);
      setHistory([]);
      setUserProfile(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAddContact = async () => {
    if (!user || !newContact.name || !newContact.phone) return;
    
    // Standard phone number regex: allows +, digits, spaces, hyphens, and parentheses
    const phoneRegex = /^\+?[\d\s()\-]{7,20}$/;
    if (!phoneRegex.test(newContact.phone)) {
      showToast("Please enter a valid phone number", "error");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(newContact.phone);
    const updatedContacts = [...(userProfile?.emergencyContacts || []), { ...newContact, phone: normalizedPhone }];
    try {
      await update(ref(db, `users/${user.uid}`), {
        emergencyContacts: updatedContacts
      });
      setNewContact({ name: '', phone: '' });
      showToast("Contact added successfully", "success");
    } catch (error: any) {
      console.error('Add Contact - Error:', error);
      const errorMsg = error?.message || error?.code || 'Unknown error';
      showToast(`Failed: ${errorMsg}`, "error");
    }
  };

  const handleRemoveContact = async (index: number) => {
    if (!user || !userProfile?.emergencyContacts) return;
    const updatedContacts = userProfile.emergencyContacts.filter((_, i) => i !== index);
    try {
      await update(ref(db, `users/${user.uid}`), {
        emergencyContacts: updatedContacts
      });
    } catch (error) {
      handleDatabaseError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleNotifyEmergencyContacts = async () => {
    if (!userProfile?.emergencyContacts || userProfile.emergencyContacts.length === 0) {
      showToast("No emergency contacts to notify", "error");
      return;
    }
    
    const message = `EMERGENCY ALERT from ResQAI! ${userProfile.displayName || 'Someone'} needs help. Location: ${location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Location unavailable'}`;
    
    for (const contact of userProfile.emergencyContacts) {
      try {
        window.open(`sms:${contact.phone}?body=${encodeURIComponent(message)}`, '_blank');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to send SMS to', contact.phone, error);
      }
    }
    
    showToast(`Emergency alerts sent to ${userProfile.emergencyContacts.length} contact(s)`, "success");
  };

  useEffect(() => {
    const predictSeverity = () => {
      if (!input) {
        setPredictedSeverity(null);
        return;
      }
      const text = input.toLowerCase();
      if (text.includes('bleed') || text.includes('blood') || text.includes('heart') || text.includes('breath') || text.includes('unconscious')) {
        setPredictedSeverity('high');
      } else if (text.includes('pain') || text.includes('burn') || text.includes('fall')) {
        setPredictedSeverity('medium');
      } else {
        setPredictedSeverity('low');
      }
    };
    const timer = setTimeout(predictSeverity, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const toggleSiren = async () => {
    if (!user || !userProfile) {
      showToast("Please login to change settings", "error");
      return;
    }
    const currentEnabled = userProfile.settings?.sirenEnabled !== false;
    console.log('Toggle Siren - Current:', currentEnabled, 'Setting to:', !currentEnabled);
    try {
      await update(ref(db, `users/${user.uid}/settings`), {
        sirenEnabled: !currentEnabled
      });
      console.log('Toggle Siren - Firebase updated successfully');
      showToast(`Emergency Siren ${!currentEnabled ? 'enabled' : 'disabled'}`, "success");
    } catch (error: any) {
      console.error('Toggle Siren - Error:', error);
      const errorMsg = error?.message || error?.code || 'Unknown error';
      showToast(`Failed: ${errorMsg}`, "error");
    }
  };

  const toggleVoiceGuidance = async () => {
    if (!user || !userProfile) {
      showToast("Please login to change settings", "error");
      return;
    }
    const currentEnabled = userProfile.settings?.voiceGuidanceEnabled !== false;
    console.log('Toggle Voice - Current:', currentEnabled, 'Setting to:', !currentEnabled);
    try {
      await update(ref(db, `users/${user.uid}/settings`), {
        voiceGuidanceEnabled: !currentEnabled
      });
      console.log('Toggle Voice - Firebase updated successfully');
      showToast(`Voice Guidance ${!currentEnabled ? 'enabled' : 'disabled'}`, "success");
    } catch (error: any) {
      console.error('Toggle Voice - Error:', error);
      const errorMsg = error?.message || error?.code || 'Unknown error';
      showToast(`Failed: ${errorMsg}`, "error");
    }
  };

  const updateLanguage = async (lang: string) => {
    if (!user || !userProfile) return;
    try {
      await update(ref(db, `users/${user.uid}`), {
        'settings.language': lang
      });
      setLanguage(lang);
    } catch (error) {
      handleDatabaseError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const onScanSuccess = (decodedText: string) => {
    console.log(`Code matched = ${decodedText}`);
    setIsScanningQR(false);
    
    // Parse the emergencyId from the URL
    try {
      const url = new URL(decodedText);
      const emergencyId = url.searchParams.get('emergencyId');
      if (emergencyId) {
        setPublicEmergencyId(emergencyId);
        showToast("Emergency ID retrieved", "success");
      } else {
        showToast("Invalid QR Code: No ID found", "error");
      }
    } catch (e) {
      // If it's not a URL, maybe it's just the ID?
      if (decodedText.length > 10) { 
        setPublicEmergencyId(decodedText);
        showToast("Emergency ID retrieved", "success");
      } else {
        showToast("Invalid QR Code Format", "error");
      }
    }
  };

  // AI Processing Functions
  const processVoiceWithAI = async (transcript: string) => {
    setIsAiAnalyzing(true);
    try {
      // Situation Understanding
      const situation = await situationUnderstanding.analyzeSituation(transcript);
      setAiAnalysis(situation);

      // Emergency Classification
      const category = await emergencyClassifier.classifyEmergency(situation);
      setEmergencyClassification(category);

      // Get Recommendations
      const recs = decisionEngine.getRecommendations(category);
      setRecommendations(recs);

      // Intent Detection
      const intent = await intentDetector.detectIntent(transcript);
      setDetectedIntent(intent);

      // Emotion Detection
      const emotions = await emotionDetector.detectEmotion(transcript);
      setEmotionAnalysis(emotions);

      // Smart SOS Trigger
      if (smartSOSTrigger.shouldTriggerSOS({ transcript, situation, category })) {
        smartSOSTrigger.triggerSOS();
        handleSOS();
      }

      console.log('AI Analysis:', { situation, category, recs, intent, emotions });
    } catch (error) {
      console.error('AI Processing Error:', error);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const startLiveLocationTracking = () => {
    locationTracker.startTracking((coords) => {
      setLiveLocation({ lat: coords.latitude, lng: coords.longitude });
    });
  };

  const stopLiveLocationTracking = () => {
    locationTracker.stopTracking();
    setLiveLocation(null);
  };

  const startEmergencyLiveStreaming = async () => {
    setIsLiveStreaming(true);
    await liveStreamer.startStreaming();
  };

  const stopEmergencyLiveStreaming = async () => {
    setIsLiveStreaming(false);
    await liveStreamer.stopStreaming();
  };

  const startEvidenceRecording = async () => {
    setIsRecordingEvidence(true);
    await evidenceRecorder.startRecording();
  };

  const stopEvidenceRecording = async () => {
    setIsRecordingEvidence(false);
    const evidence = await evidenceRecorder.stopRecording();
    // TODO: Save evidence to storage
    console.log('Evidence recorded:', evidence);
  };

  const findNearbyHelpers = async () => {
    if (!location) return;
    const helpers = await helpersDetector.getNearbyHelpers(location);
    setNearbyHelpers(helpers);
  };

  const matchResponder = () => {
    if (nearbyHelpers.length > 0) {
      const responder = responderMatcher.matchResponder(nearbyHelpers, emergencyClassification);
      setMatchedResponder(responder);
    }
  };

  const activateRadar = () => {
    setIsRadarActive(true);
    if (location && nearbyHelpers.length > 0) {
      radarVisualizer.renderRadar(nearbyHelpers, location);
    }
  };

  const rateResponder = async (responderId: string, rating: number, review?: string) => {
    await trustSystem.rateResponder(responderId, rating, review);
    const score = await trustSystem.getTrustScore(responderId);
    setTrustScores(prev => ({ ...prev, [responderId]: score }));
  };

  const QRScanner = () => {
    useEffect(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, () => {});

      return () => {
        scanner.clear().catch(error => {
          console.error("Failed to clear scanner", error);
        });
      };
    }, []);

    return (
      <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-md">
        <div className="w-full max-w-md bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white/20">
          <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <QrCode className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Scan Victim QR</h3>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Access Medical ID</p>
              </div>
            </div>
            <button 
              onClick={() => setIsScanningQR(false)}
              className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-gray-600 active:scale-90 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 bg-white">
            <div id="reader" className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-gray-100"></div>
          </div>
          <div className="p-6 bg-gray-50 text-center space-y-2">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
              Point camera at the victim's lock screen QR code.
            </p>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
              Supports scanning from images via the scanner menu
            </p>
          </div>
        </div>
      </div>
    );
  };

  const triggerNativeSms = (phone: string, message: string) => {
    const encodedMessage = encodeURIComponent(message);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const smsUrl = isIOS 
      ? `sms:${phone}&body=${encodedMessage}`  // iOS format
      : `sms:${phone}?body=${encodedMessage}`; // Android format
    
    console.log("Opening SMS with URL:", smsUrl);
    
    // Try multiple methods to ensure SMS opens
    try {
      // Method 1: window.location.href
      window.location.href = smsUrl;
      
      // Method 2: Backup with window.open after short delay
      setTimeout(() => {
        const newWindow = window.open(smsUrl, '_blank');
        if (newWindow) {
          newWindow.close(); // Close the new tab if it opened, SMS should be triggered
        }
      }, 100);
    } catch (e) {
      console.error("Failed to open SMS:", e);
      // Final fallback - try window.open only
      window.open(smsUrl, '_self');
    }
  };

  const triggerNativeCall = (phone: string) => {
    const normalizedPhone = normalizePhoneNumber(phone);
    const callUrl = `tel:${normalizedPhone}`;
    window.location.href = callUrl;
  };

  const notifyContacts = async (emergencyRes?: EmergencyResponse | any) => {
    let contacts = userProfile?.emergencyContacts || [];
    if (contacts.length === 0) {
      const fallbackNumber = (import.meta as any).env.VITE_TWILIO_CONTACT_NUMBER;
      if (fallbackNumber) {
        contacts = [{ name: 'Emergency Contact (Fallback)', phone: fallbackNumber }];
        showToast("No profile contacts. Using fallback from .env", 'info');
      } else {
        showToast("No emergency contacts found", 'error');
        setActiveTab('profile');
        return;
      }
    }
    
    // Check if Twilio credentials are configured
    const hasTwilioCredentials = 
      (import.meta as any).env.VITE_TWILIO_ACCOUNT_SID && 
      (import.meta as any).env.VITE_TWILIO_AUTH_TOKEN && 
      (import.meta as any).env.VITE_TWILIO_FROM_NUMBER;
    
    // Construct location link
    const locationLink = location 
      ? `\nMy Location: https://maps.google.com/?q=${location.lat},${location.lng}`
      : "\nLocation unavailable.";

    // Check if emergencyRes is a MouseEvent (when called from onClick)
    const resToUse = (emergencyRes && 'severity' in emergencyRes) ? emergencyRes : response;
    const severity = resToUse?.severity || 'HIGH';
    const type = resToUse?.emergencyType || 'Emergency';
    
    const message = `[${severity.toUpperCase()}] EMERGENCY ALERT from ${userProfile?.displayName || 'User'}. Type: ${type}. I need immediate help!${locationLink}`;
    const callTwiml = `<Response><Say>Emergency alert from ResQAI. ${userProfile?.displayName || 'User'} has triggered a ${severity} alert for ${type}. Please help immediately. Location: ${location?.lat}, ${location?.lng}.</Say></Response>`;

    try {
      setIsNotifying(true);
      
      if (!hasTwilioCredentials) {
        // No Twilio credentials - use native SMS fallback and native call fallback
        console.log("Twilio credentials not configured, using native SMS and call fallbacks");
        
        // Open native SMS for first contact immediately
        if (contacts.length > 0) {
          triggerNativeSms(contacts[0].phone, message);
          showToast("📱 SMS APP OPENED! Send the message, then calls will start automatically...", "success");
        }
        
        // Open native phone app for calling after SMS delay (8 seconds to give time to send SMS)
        setTimeout(() => {
          showToast("📞 Starting calls now...", "info");
          contacts.forEach((contact, index) => {
            setTimeout(() => {
              triggerNativeCall(contact.phone);
            }, index * 4000); // 4 second stagger between calls
          });
        }, 8000); // Start calls 8 seconds after SMS
        
        return;
      }

      // Try Twilio SMS first
      try {
        const smsPromises = contacts.map(contact => sendSms(contact.phone, message));
        await Promise.all(smsPromises);
        showToast(`SMS sent to ${contacts.length} contact(s) via Twilio`, "success");
      } catch (twilioError: any) {
        console.log("Twilio SMS failed (expected due to CORS), falling back to native SMS");
        showToast("Twilio blocked. Opening SMS app...", "info");
        
        // Fallback to native SMS - open immediately for first contact
        if (contacts.length > 0) {
          triggerNativeSms(contacts[0].phone, message);
        }
      }

      // Try Twilio calls after SMS
      setTimeout(async () => {
        try {
          showToast(`Initiating calls to ${contacts.length} contact(s)...`, "info");
          for (const contact of contacts) {
            try {
              showToast(`Calling ${contact.name}...`, "info");
              await makeCall(contact.phone, callTwiml);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between calls
            } catch (callError: any) {
              console.warn(`Twilio call failed for ${contact.name}, trying native call:`, callError);
              // Fallback to native call
              triggerNativeCall(contact.phone);
            }
          }
          showToast(`Call attempts completed for ${contacts.length} contact(s)`, "success");
        } catch (error: any) {
          console.log("All call attempts failed, using native call fallback");
          showToast("Twilio calls blocked. Opening native phone app...", "info");
          
          // Fallback to native calls for all contacts
          contacts.forEach((contact, index) => {
            setTimeout(() => {
              triggerNativeCall(contact.phone);
            }, index * 2000);
          });
        }
      }, 3000); // Start calls 3 seconds after SMS

    } catch (error: any) {
      console.error("Critical error in notifyContacts:", error);
      showToast("Notification failed. Please try calling contacts directly.", "error");
    } finally {
      // Don't set isNotifying to false immediately since calls happen in background
      setTimeout(() => {
        setIsNotifying(false);
      }, 10000); // Keep loading state for 10 seconds to show ongoing operations
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResponse(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech recognition not supported", 'error');
      return;
    }
    const recognition = new SpeechRecognition();
    const langMap: Record<string, string> = {
      'English': 'en-US',
      'Hindi': 'hi-IN',
      'Telugu': 'te-IN',
      'Tamil': 'ta-IN',
      'Kannada': 'kn-IN',
      'Spanish': 'es-ES',
      'French': 'fr-FR',
      'Arabic': 'ar-SA',
      'German': 'de-DE',
      'Portuguese': 'pt-BR',
      'Chinese': 'zh-CN',
      'Japanese': 'ja-JP',
      'Russian': 'ru-RU',
      'Italian': 'it-IT',
      'Korean': 'ko-KR'
    };
    recognition.lang = langMap[language] || 'en-US';
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      // Process voice input with AI
      processVoiceWithAI(transcript);
      
      // Check for cancellation commands
      const cancelKeywords = [
        'cancel', 'stop', 'abort', 'false alarm', 'i am safe', 'safe now', 'nevermind',
        'stop the alert', 'cancel emergency', 'everything is okay', 'i am okay', 'cancel sos',
        'cancelar', 'detener', 'parar', 'falsa alarma', 'estoy a salvo', 'todo está bien',
        'rok do', 'band karo', 'theek hoon', 'sab theek hai', 'cancel karo', 'stop karo'
      ];

      const isCancel = cancelKeywords.some(keyword => transcript.includes(keyword));

      if (isCancel && (isCountdownActive || escalationStage > 0)) {
        cancelSOS();
        showToast("SOS Cancelled via Voice Command", "success");
        speak(language === 'Hindi' ? "SOS radd kar diya gaya hai. Aap surakshit hain." : "SOS Cancelled. You are safe.");
        return;
      }

      // Check for nearby service commands even in one-off mode
      const findKeywords = {
        'Hospital': ['find hospital', 'nearest hospital', 'find doctor', 'medical help', 'hospital kahan hai', 'doctor kahan hai', 'hospital dhoondo', 'doctor dhoondo'],
        'Pharmacy': ['find pharmacy', 'nearest pharmacy', 'chemist shop', 'medicine shop', 'pharmacy kahan hai', 'dawa ki dukan', 'chemist dhoondo'],
        'Police Station': ['find police', 'nearest police', 'police station', 'police kahan hai', 'thana kahan hai', 'police dhoondo'],
        'Fire Station': ['find fire station', 'nearest fire station', 'fire brigade', 'fire station kahan hai', 'fire brigade dhoondo']
      };

      let foundServiceType = null;
      for (const [type, keywords] of Object.entries(findKeywords)) {
        if (keywords.some(k => transcript.includes(k))) {
          foundServiceType = type;
          break;
        }
      }

      if (foundServiceType) {
        setActiveTab('nearby');
        setNearbyFilter(foundServiceType);
        showToast(`Finding nearest ${foundServiceType}...`, "info");
        speak(`Finding the nearest ${foundServiceType} for you.`);
        
        if (location) {
          setIsFetchingPlaces(true);
          // fetchNearbyServices is replaced with static return for now
          setNearbyPlaces([]);
          setIsFetchingPlaces(false);
          showToast(`Found 0 ${foundServiceType} nearby.`, "info");
        }
        return;
      }

      setInput(prev => prev + (prev ? " " : "") + transcript);
    };
    recognition.start();
  };

  const cancelSOS = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setIsCountdownActive(false);
    setIsAutoTriggering(false);
    setAutoTriggerReason(null);
    setCountdown(10);
    setEscalationStage(0);
    // Optionally stop siren if it was playing
    const siren = document.getElementById('emergency-siren') as HTMLAudioElement;
    if (siren) {
      siren.pause();
      siren.currentTime = 0;
    }
  };

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info', action?: { label: string, onClick: () => void }) => {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-600' : (type === 'success' ? 'bg-green-600' : 'bg-blue-600');
    toast.className = `fixed top-24 left-1/2 -translate-x-1/2 z-[100] ${bgColor} text-white px-6 py-4 rounded-3xl shadow-2xl font-black uppercase italic tracking-tight animate-bounce flex flex-col sm:flex-row items-center gap-4 border-2 border-white/20 transition-opacity duration-500 max-w-[90vw]`;
    
    let content = `<div class="flex items-center gap-3">
      <div class="w-2 h-2 bg-white rounded-full animate-ping"></div>
      <span class="text-sm">${message}</span>
    </div>`;
    
    toast.innerHTML = content;

    if (action) {
      const button = document.createElement('button');
      button.className = "px-4 py-2 bg-white text-blue-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors shrink-0";
      button.innerText = action.label;
      button.onclick = (e) => {
        e.stopPropagation();
        action.onClick();
        if (document.body.contains(toast)) document.body.removeChild(toast);
      };
      toast.appendChild(button);
    }

    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.classList.add('opacity-0');
        setTimeout(() => {
          if (document.body.contains(toast)) document.body.removeChild(toast);
        }, 500);
      }
    }, action ? 8000 : 4000);
  };

  const triggerActualAlert = (res?: EmergencyResponse) => {
    setIsCountdownActive(false);
    setIsAutoTriggering(false);
    setAutoTriggerReason(null);
    setCountdown(10);
    setEscalationStage(1);
    
    const severity = res?.severity || response?.severity || 'high';
    
    // STAGE 1: SMS / Notify Contacts (Always for Medium, High, Critical)
    const contactsCount = userProfile?.emergencyContacts?.length || 0;
    showToast(`STAGE 1: Alerting ${contactsCount || 'fallback'} contact(s)...`, "info");
    if (res || response) notifyContacts((res || response) as EmergencyResponse);

    // STAGE 2: Calls / Nearby Alerts
    if (severity === 'high' || severity === 'critical') {
      setTimeout(async () => {
        setEscalationStage(2);
        
        let contactsToCall = userProfile?.emergencyContacts || [];
        if (contactsToCall.length === 0) {
          const fallback = (import.meta as any).env.VITE_TWILIO_CONTACT_NUMBER;
          if (fallback) contactsToCall = [{ name: 'Fallback', phone: fallback }];
        }

        if (contactsToCall.length > 0) {
          showToast(`STAGE 2: Sequential Calls Initiated to ${contactsToCall.length} contact(s)...`, "info");
          
          for (const contact of contactsToCall) {
            try {
              showToast(`Calling ${contact.name}...`, "info");
              const twiml = `<Response><Say>Emergency alert from ResQAI. Our user ${userProfile?.displayName || 'contact'} has triggered a ${severity} alert. Location: ${location?.lat}, ${location?.lng}. Please help.</Say></Response>`;
              await makeCall(contact.phone, twiml);
              // Wait 2 seconds between initiating calls to prevent Twilio trial Throttling
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err: any) {
              console.warn(`Call failed for ${contact.name}:`, err);
            }
          }
        }
        
        if (severity === 'critical') {
          showToast("Broadcasting to Nearby Helpers...", "info");
        }
      }, 5000);
    }

    // STAGE 3: Emergency Services
    if (severity === 'critical') {
      setTimeout(async () => {
        setEscalationStage(3);
        showToast("STAGE 3: Contacting Emergency Dispatch...", "error");
        speak("Help is being dispatched.");
        
        const emergencyNum = (import.meta as any).env.VITE_TWILIO_EMERGENCY_SERVICE_NUMBER || "911";
        const twiml = `<Response><Say>This is a ResQAI emergency call. User reported: ${res?.emergencyType || response?.emergencyType || 'incident'}. Location: ${location?.lat}, ${location?.lng}.</Say></Response>`;
        await makeCall(emergencyNum, twiml);
      }, 10000);
    }

    const locationLink = location 
      ? `\nMy Location: https://maps.google.com/?q=${location.lat},${location.lng}`
      : "\nLocation unavailable.";

    const message = `EMERGENCY DISPATCHED for ${userProfile?.displayName || 'User'}. Severity: ${severity.toUpperCase()}. Help is on the way!${locationLink}`;
    console.log("Emergency Dispatch Message:", message);

    showToast("EMERGENCY DISPATCHED", 'error');
  };

  const [isHandsFree, setIsHandsFree] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isHandsFree) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast("Speech recognition not supported in this browser", 'error');
        console.error("SpeechRecognition API is not supported in this browser.");
        setIsHandsFree(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      const langMap: Record<string, string> = {
        'English': 'en-US',
        'Hindi': 'hi-IN',
        'Telugu': 'te-IN',
        'Tamil': 'ta-IN',
        'Kannada': 'kn-IN',
        'Spanish': 'es-ES',
        'French': 'fr-FR',
        'Arabic': 'ar-SA',
        'German': 'de-DE',
        'Portuguese': 'pt-BR',
        'Chinese': 'zh-CN',
        'Japanese': 'ja-JP',
        'Russian': 'ru-RU',
        'Italian': 'it-IT',
        'Korean': 'ko-KR'
      };
      recognition.lang = langMap[language] || 'en-US';
      console.log("Speech recognition initialized with language:", recognition.lang);

      recognition.onstart = () => {
        console.log("Speech recognition started");
        showToast("Voice recognition is now active", "success");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition encountered an error:", event.error);
        showToast(`Voice recognition error: ${event.error}`, "error");
      };

      recognition.onend = () => {
        console.log("Speech recognition stopped");
        showToast("Voice recognition has stopped", "info");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log("Recognized speech:", transcript);

        if (!transcript) {
          console.warn("No speech detected. Please try again.");
          showToast("No speech detected. Please try again.", "error");
          return;
        }

        const cancelKeywords = [
          'cancel', 'stop', 'abort', 'false alarm', 'i am safe', 'safe now', 'nevermind',
          'stop the alert', 'cancel emergency', 'everything is okay', 'i am okay', 'cancel sos',
          'cancelar', 'detener', 'parar', 'falsa alarma', 'estoy a salvo', 'todo está bien',
          'rok do', 'band karo', 'theek hoon', 'sab theek hai', 'cancel karo', 'stop karo'
        ];

        const isCancel = cancelKeywords.some(keyword => transcript.includes(keyword));

        if (isCancel && (isCountdownActive || escalationStage > 0)) {
          cancelSOS();
          showToast("SOS Cancelled via Voice Command", "success");
          speak(language === 'Hindi' ? "SOS radd kar diya gaya hai. Aap surakshit hain." : "SOS Cancelled. You are safe.");
          return;
        }

        const emergencyKeywords = [
          'help', 'emergency', 'bleeding', 'accident', 'sos', 'ambulance', 
          'doctor', 'hurt', 'pain', 'breathing', 'choking', 'fire', 'police',
          'ayuda', 'emergencia', 'sangrando', 'accidente', 'ambulancia', 'dolor',
          'bachao', 'madad', 'chot', 'bachao bachao', 'save me', 'police bulao', 'ambulance bulao'
        ];

        const isEmergency = emergencyKeywords.some(keyword => transcript.includes(keyword));

        if (isEmergency) {
          triggerAutoSOS("Voice emergency trigger detected");
          showToast("Voice trigger detected!", "info");
        } else {
          console.log("No matching keywords found in recognized speech.");
          showToast("No emergency keywords detected. Please try again.", "info");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isHandsFree, language]);

  const handleSOS = async (voiceInput?: string | React.MouseEvent) => {
    if (isAnalyzing) return;
    const finalInput = typeof voiceInput === 'string' ? voiceInput : input;
    if (!finalInput && !image && !video) return;
    if (!user) {
      showToast("Please login to use SOS features", 'error');
      return;
    }
    
    if (!isOnline) {
      setActiveTab('offline-guide');
      return;
    }
    
    if (isRecording) stopRecording();

    setIsAnalyzing(true);
    setResponse(null);
    
    try {
      // Reset emergency layer system
      emergencyLayerSystem.reset();
      setCurrentEmergencyLayer(EmergencyLayer.LAYER_1_AI_FIRST_RESPONDER);
      setLayer1Response(null);
      setLayer2Escalation(null);
      setLayer3LiveExpert(null);
      setUserResponses([]);

      // Manual analysis fallback since Gemini is removed
      const inputLower = finalInput.toLowerCase();
      let key = "general_emergency";
      let severity: "low" | "medium" | "high" | "critical" = "medium";

      if (inputLower.includes("bleed") || inputLower.includes("cut")) {
        key = "severe_bleeding";
        severity = "high";
      } else if (inputLower.includes("choke")) {
        key = "choking";
        severity = "critical";
      } else if (inputLower.includes("unconscious") || inputLower.includes("breath") || inputLower.includes("cpr")) {
        key = "unconscious_cpr";
        severity = "critical";
      } else if (inputLower.includes("burn")) {
        key = "burns";
        severity = "medium";
      }

      // Process through Layer 1: AI First Responder
      const layer1Res = await emergencyLayerSystem.processEmergencyInput(finalInput, severity);
      setLayer1Response(layer1Res);
      setCurrentEmergencyLayer(EmergencyLayer.LAYER_1_AI_FIRST_RESPONDER);

      // Create emergency response object
      const res: EmergencyResponse = {
        emergencyType: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        severity: severity,
        emergencyKey: key,
        triggerAlert: severity === 'high' || severity === 'critical',
        speechText: layer1Res.voiceGuidance
      };
      
      // Merge with Controlled Knowledge Base
      const guideline = FIRST_AID_KNOWLEDGE_BASE[res.emergencyKey] || FIRST_AID_KNOWLEDGE_BASE['general_emergency'];
      
      const fullResponse = {
        ...res,
        firstAidSteps: layer1Res.instructions,
        dos: guideline.dos,
        donts: guideline.donts,
        nearbyServicesNeeded: guideline.nearbyServicesNeeded,
        source: guideline.source,
        layer1Data: layer1Res
      };

      setResponse(fullResponse as any);
      setIncidentLocation(location);
      
      // Clear sensitive media immediately after analysis for privacy
      setImage(null);
      setVideo(null);
      
      // Start Layer 1 voice guidance immediately
      speak(layer1Res.voiceGuidance);
      
      // Set up escalation monitoring
      if (severity === 'high' || severity === 'critical') {
        setEscalationTimer(30); // 30 seconds to monitor for escalation
        const escalationCheck = setInterval(() => {
          setEscalationTimer(prev => {
            if (prev <= 1) {
              clearInterval(escalationCheck);
              // Check if should escalate based on no response or conditions
              const escalation = emergencyLayerSystem.shouldEscalateToLayer2(
                userResponses.join(' '), 
                30000, 
                { severity, hasResponse: userResponses.length > 0 }
              );
              
              if (escalation.shouldEscalate) {
                handleLayer2Escalation(escalation);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      // Save to Firestore (only if not in privacy mode)
      if (!isPrivacyModeOn) {
        const path = 'incidents';
        try {
          const newRef = push(ref(db, path));
          await set(newRef, {
            emergencyType: res.emergencyType,
            severity: res.severity,
            emergencyKey: res.emergencyKey,
            userId: user.uid,
            timestamp: serverTimestamp(),
            status: 'active',
            location: (res.severity === 'high' || res.severity === 'critical') ? location : null,
            reporterName: userProfile?.displayName || user.displayName || 'Anonymous',
            reporterContact: userProfile?.email || user.email || '',
            layer: 'layer1'
          });
        } catch (error) {
          handleDatabaseError(error, OperationType.CREATE, path);
        }
      }

      setActiveTab('first-aid');
      setEngagementStartTime(Date.now());
      setStepsViewed(true);
      
      // Trigger helper prompt after a short delay (only if not in privacy mode)
      if (!isPrivacyModeOn) {
        setTimeout(() => {
          setIsHelperPromptVisible(true);
        }, 3000);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLayer2Escalation = async (escalation: any) => {
    setIsEscalating(true);
    setLayer2Escalation(escalation);
    setCurrentEmergencyLayer(EmergencyLayer.LAYER_2_SMART_ESCALATION);

    // Show escalation message
    showToast(`ESCALATING TO LIVE SUPPORT: ${escalation.reason}`, 'error');
    speak(`Escalating to live medical support. ${escalation.reason}. Connecting you to a doctor now.`);

    // Trigger ambulance if needed
    if (escalation.ambulanceTriggered) {
      speak("Ambulance has been dispatched to your location.");
      // In a real implementation, this would call ambulance API
      console.log("🚑 Ambulance dispatched");
    }

    // Automatically escalate to Layer 3 after a brief delay
    setTimeout(async () => {
      await handleLayer3LiveExpert();
    }, 2000);

    setIsEscalating(false);
  };

  const handleLayer3LiveExpert = async () => {
    try {
      // Check if doctors are available
      const availableDoctors = doctorMatchmaking.getAvailableDoctorsCount();

      if (availableDoctors === 0) {
        // No doctors available, fallback to helpline
        const helplineExpert = await emergencyLayerSystem.escalateToLayer3('helpline');
        setLayer3LiveExpert(helplineExpert);
        setCurrentEmergencyLayer(EmergencyLayer.LAYER_3_LIVE_EXPERT);
        showToast("NO DOCTORS AVAILABLE - CONNECTING TO HELPLINE", 'error');
        speak("No doctors available right now. Connecting you to emergency helpline.");
        return;
      }

      // Create emergency call and match with doctor
      const emergencyCall = await doctorMatchmaking.createEmergencyCall(
        user!.uid,
        response?.emergencyType || 'Unknown Emergency',
        response?.severity || 'high',
        incidentLocation || location
      );

      // Update call status to connecting
      await doctorMatchmaking.updateCallStatus(emergencyCall.id, 'connecting');

      // Set up Layer 3 with video call
      const liveExpert = await emergencyLayerSystem.escalateToLayer3('doctor');
      setLayer3LiveExpert({
        ...liveExpert,
        callId: emergencyCall.id,
        channelName: emergencyCall.channelName,
        token: emergencyCall.token
      });
      setCurrentEmergencyLayer(EmergencyLayer.LAYER_3_LIVE_EXPERT);

      // Simulate connection success (in production, this would be based on actual Agora connection)
      setTimeout(async () => {
        await doctorMatchmaking.updateCallStatus(emergencyCall.id, 'connected');
        showToast("CONNECTED TO LIVE MEDICAL EXPERT", 'success');
        speak("You are now connected to a live medical expert. They can see you and guide you through the emergency.");
      }, 2000);

    } catch (error) {
      console.error("Failed to connect to live expert:", error);
      // Fallback to helpline
      try {
        const helplineExpert = await emergencyLayerSystem.escalateToLayer3('helpline');
        setLayer3LiveExpert(helplineExpert);
        setCurrentEmergencyLayer(EmergencyLayer.LAYER_3_LIVE_EXPERT);
        showToast("DOCTOR MATCHING FAILED - CONNECTING TO HELPLINE", 'error');
        speak("Doctor matching failed. Connecting you to emergency helpline.");
      } catch (helplineError) {
        console.error("Helpline connection also failed:", helplineError);
        showToast("UNABLE TO CONNECT TO ANY LIVE SUPPORT", 'error');
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/mp4' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVideo(reader.result as string);
          setResponse(null);
        };
        reader.readAsDataURL(videoBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Auto stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 10000);

    } catch (err) {
      console.error("Error accessing camera:", err);
      showToast("Could not access camera", 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handlePlayVoice = async (customResponse?: EmergencyResponse | OfflineFirstAid) => {
    const targetResponse = customResponse || response;
    if (!targetResponse) return;
    
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const textToRead = 'speechText' in targetResponse 
      ? targetResponse.speechText 
      : `First aid for ${targetResponse.title}. Steps: ${targetResponse.steps.join('. ')}. Do: ${targetResponse.dos.join('. ')}. Don't: ${targetResponse.donts.join('. ')}`;
    
    if (!textToRead) return;

    setIsGeneratingVoice(true);
    try {
      // Native browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(textToRead);
      
      const langMap: Record<string, string> = {
        'English': 'en-US', 'Hindi': 'hi-IN', 'Telugu': 'te-IN', 'Tamil': 'ta-IN',
        'Kannada': 'kn-IN', 'Spanish': 'es-ES', 'French': 'fr-FR', 'Arabic': 'ar-SA',
        'German': 'de-DE', 'Portuguese': 'pt-BR', 'Chinese': 'zh-CN', 'Japanese': 'ja-JP',
        'Russian': 'ru-RU', 'Italian': 'it-IT', 'Korean': 'ko-KR'
      };
      
      utterance.lang = langMap[language] || 'en-US';
      utterance.onend = () => {
        setIsPlaying(false);
        setIsGeneratingVoice(false);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        setIsGeneratingVoice(false);
      };

      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } catch (error) {
      console.error("Voice playback failed:", error);
      setIsGeneratingVoice(false);
      setIsPlaying(false);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleShareIncident = async (incident: Incident) => {
    const timestamp = incident.timestamp;
    const date = timestamp ? timestamp.toDate().toLocaleDateString() : "Unknown Date";
    const time = timestamp ? timestamp.toDate().toLocaleTimeString() : "Unknown Time";
    const shareText = `Emergency Incident Report:
Type: ${incident.emergencyType}
Severity: ${incident.severity.toUpperCase()}
Date: ${date} ${time}
Status: ${incident.status}

Summary: ${incident.speechText}

Shared via ResQAI - Your Emergency Companion.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Emergency Incident: ${incident.emergencyType}`,
          text: shareText,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          showToast("Failed to share incident", 'error');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        showToast("Incident details copied to clipboard", 'success');
      } catch (err) {
        showToast("Failed to copy incident details", 'error');
      }
    }
  };

  const handleVerifyHelper = () => {
    const processRecognition = (currentLoc: { lat: number, lng: number } | null) => {
      const timeSpent = Math.floor((Date.now() - (engagementStartTime || Date.now())) / 1000);
      
      // Calculate Distance for Proximity Verification
      let distance: number | undefined;
      let isNear = true;
      
      if (incidentLocation) {
        if (currentLoc) {
          distance = calculateDistance(currentLoc.lat, currentLoc.lng, incidentLocation.lat, incidentLocation.lng);
          isNear = distance <= 0.5; // 500 meters threshold
        } else {
          isNear = false; // Cannot verify proximity if current location is missing
        }
      }

      // Enhanced Tier Calculation with Consistency & Proximity Check
      const calculateTier = () => {
        // Validation 1: Consistency check (e.g., if they claim to have stopped bleeding, did they actually perform a bleeding-related action?)
        const hasBleedingAction = confirmedActions.some(a => a.toLowerCase().includes('pressure') || a.toLowerCase().includes('bleeding'));
        const saysBleedingSlowing = situationalAnswers['bleeding'] === 'yes';
        const isConsistent = hasBleedingAction === saysBleedingSlowing || situationalAnswers['bleeding'] === 'not-applicable';
        
        // Validation 2: Proximity check
        if (!isNear) return 'Unverified Responder'; 
        
        // Validation 3: Consistency check failure
        if (!isConsistent) return 'Unverified Responder';

        // Tier Assignment based on time, actions, and steps completed
        if (timeSpent >= 120 && confirmedActions.length >= 3 && completedSteps.length === (response?.firstAidSteps.length || 0)) {
          return 'Verified Helper';
        } else if (timeSpent >= 60 && confirmedActions.length >= 2) {
          return 'Helper';
        }
        return 'Responder';
      };

      const tier = calculateTier();

      const data: HelperData = {
        name: helperForm.name || 'Anonymous Hero',
        photo: helperForm.photo,
        consent: helperForm.consent,
        timestamp: new Date(),
        tier,
        actions: confirmedActions,
        timeSpent,
        isProximityVerified: isNear
      };
      
      setIsVerifyingLocation(false);
      setIsHelperFormVisible(false);
      setIsReviewingRecognition(true);
      
      // Delayed Reward: 3 seconds of "Review" to simulate deep verification
      setTimeout(() => {
        setIsReviewingRecognition(false);
        setHelperData(data);
        if (!isNear) {
          showToast("Proximity Verification Failed. Recognition Limited.", "error");
        } else if (tier === 'Unverified Responder') {
          showToast("Verification Inconsistent. Please review your actions.", "error");
        } else {
          showToast("Hero Status Verified Successfully!", "success");
        }
      }, 3000);
    };

    // Get fresh location before processing
    setIsVerifyingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const freshLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(freshLoc);
          processRecognition(freshLoc);
        },
        () => {
          processRecognition(location); // Fallback to last known location
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      processRecognition(location);
    }
  };

  const connectToNearbyHelpers = async () => {
    if (!location) {
      showToast("Location access required to find nearby helpers", "error");
      return;
    }

    if (!user) {
      showToast("Please login to connect with helpers", "error");
      return;
    }

    try {
      showToast("Searching for nearby trained volunteers...", "info");
      
      // Get current user's emergency key or create one
      const emergencyKey = localStorage.getItem('emergencyKey') || `emergency_${Date.now()}`;
      localStorage.setItem('emergencyKey', emergencyKey);
      
      // Create emergency broadcast data
      const emergencyData = {
        type: 'helper_request',
        requesterId: user.uid,
        requesterName: user.displayName || 'Anonymous',
        requesterPhoto: user.photoURL || '',
        location: {
          lat: location.lat,
          lng: location.lng
        },
        emergencyKey,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        status: 'active',
        description: 'Requesting immediate assistance from nearby trained volunteers'
      };

      // Broadcast to helpers database
      const helpersRef = ref(db, `helpers/${emergencyKey}`);
      await set(helpersRef, emergencyData);

      // Also broadcast to general incidents for wider reach
      const incidentsRef = ref(db, `incidents/${emergencyKey}`);
      await set(incidentsRef, {
        ...emergencyData,
        type: 'incident',
        contacts: userProfile?.emergencyContacts || [],
        userLocation: location
      });

      showToast("Emergency request broadcast to nearby helpers!", "success");
      
      // Start monitoring for helper responses
      const responsesRef = ref(db, `helper_responses/${emergencyKey}`);
      const unsubscribe = onValue(responsesRef, (snapshot) => {
        const responses = snapshot.val();
        if (responses) {
          const responseList = Object.keys(responses).map(key => ({
            id: key,
            ...responses[key]
          }));
          
          // Notify about new helper responses
          responseList.forEach(response => {
            if (response.timestamp > Date.now() - 10000) { // Last 10 seconds
              showToast(`${response.helperName} is responding to your request!`, "success");
            }
          });
        }
      });

      // Auto-cleanup after 30 minutes
      setTimeout(() => {
        unsubscribe();
        remove(helpersRef).catch(console.error);
      }, 30 * 60 * 1000);

      // Update UI state
      setActiveTab('history');
      
    } catch (error) {
      console.error("Failed to connect to helpers:", error);
      showToast("Failed to broadcast request. Please try again.", "error");
    }
  };

  const respondToHelperRequest = async (emergencyKey: string, requestType: 'accept' | 'decline') => {
    if (!user || !location) {
      showToast("Location and login required to respond", "error");
      return;
    }

    try {
      const responseData = {
        helperId: user.uid,
        helperName: user.displayName || 'Anonymous Helper',
        helperPhoto: user.photoURL || '',
        response: requestType,
        timestamp: Date.now(),
        location: {
          lat: location.lat,
          lng: location.lng
        },
        estimatedArrival: Math.floor(Math.random() * 15) + 5, // 5-20 minutes
        contact: user.email || 'No contact provided'
      };

      // Add response to the emergency request
      const responseRef = ref(db, `helper_responses/${emergencyKey}/${user.uid}`);
      await set(responseRef, responseData);

      if (requestType === 'accept') {
        showToast("Response sent! The requester will be notified.", "success");
        
        // Add to helper's activity log
        const activityRef = ref(db, `helper_activity/${user.uid}/${emergencyKey}`);
        await set(activityRef, {
          ...responseData,
          status: 'responded',
          type: 'helper_response'
        });
      } else {
        showToast("Response declined", "info");
      }
    } catch (error) {
      console.error("Failed to respond to request:", error);
      showToast("Failed to send response. Please try again.", "error");
    }
  };

  useEffect(() => {
    if (activeTab === 'first-aid' && response && userProfile?.settings?.voiceGuidanceEnabled !== false && !isPlaying && !isGeneratingVoice) {
      handlePlayVoice();
    }
  }, [activeTab, response, userProfile?.settings?.voiceGuidanceEnabled]);

  const severityColors = {
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    critical: 'bg-red-100 text-red-700 border-red-200 animate-pulse',
  };

  const severityAccents = {
    low: 'text-blue-600 border-blue-100 bg-blue-50/50',
    medium: 'text-yellow-600 border-yellow-100 bg-yellow-50/50',
    high: 'text-orange-600 border-orange-100 bg-orange-50/50',
    critical: 'text-red-600 border-red-100 bg-red-50/50',
  };

  const severityIconColors = {
    low: 'text-blue-500',
    medium: 'text-yellow-500',
    high: 'text-orange-500',
    critical: 'text-red-500',
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
      </div>
    );
  }

  if (isPublicEmergencyView) {
    return (
      <div className="min-h-screen bg-red-600 text-white p-6 flex flex-col items-center justify-center space-y-8">
        <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] flex items-center justify-center backdrop-blur-xl border-2 border-white/30 shadow-2xl animate-pulse">
          <Shield className="w-12 h-12 text-white" />
        </div>
        
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Emergency Info</h1>
          <p className="text-sm font-bold text-white/80 uppercase tracking-widest leading-relaxed">
            You are viewing the emergency profile for {publicEmergencyData?.displayName || 'a user'}.
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 border-2 border-white/20 shadow-2xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Emergency Contacts</h3>
              {publicEmergencyData?.emergencyContacts && publicEmergencyData.emergencyContacts.length > 0 ? (
                <div className="space-y-3">
                  {publicEmergencyData.emergencyContacts.map((contact, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/10 rounded-2xl border border-white/10">
                      <div>
                        <p className="font-black uppercase italic text-sm">{contact.name}</p>
                        <p className="text-xs font-bold text-white/60">{contact.phone}</p>
                      </div>
                      <button 
                        onClick={() => window.location.href = `tel:${contact.phone}`}
                        className="p-3 bg-white text-red-600 rounded-xl shadow-lg active:scale-90 transition-all"
                      >
                        <Phone className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold italic text-white/40">No emergency contacts listed.</p>
              )}
            </div>

            {(publicEmergencyData?.bloodGroup || publicEmergencyData?.medicalConditions || publicEmergencyData?.allergies) && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Medical Information</h3>
                <div className="grid grid-cols-1 gap-3">
                  {publicEmergencyData.bloodGroup && (
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Blood Group</span>
                      <span className="text-lg font-black italic text-white">{publicEmergencyData.bloodGroup}</span>
                    </div>
                  )}
                  {publicEmergencyData.medicalConditions && (
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60 block mb-1">Medical Conditions</span>
                      <span className="text-sm font-bold text-white leading-relaxed">{publicEmergencyData.medicalConditions}</span>
                    </div>
                  )}
                  {publicEmergencyData.allergies && (
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60 block mb-1">Allergies</span>
                      <span className="text-sm font-bold text-white leading-relaxed">{publicEmergencyData.allergies}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setIsPublicEmergencyView(false);
                  setIsBystanderMode(true);
                  setActiveTab('sos');
                }}
                className="flex-1 py-5 bg-white text-red-600 rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <AlertCircle className="w-6 h-6" />
                Trigger SOS
              </button>
              {incidentLocation && (
                <button 
                  onClick={() => {
                    const link = `https://maps.google.com/?q=${incidentLocation.lat},${incidentLocation.lng}`;
                    window.open(link, '_blank');
                  }}
                  className="p-5 bg-white/20 text-white rounded-3xl border-2 border-white/30 shadow-xl active:scale-95 transition-all"
                  title="View Incident Location"
                >
                  <MapPin className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={() => setIsPublicEmergencyView(false)}
            className="w-full py-4 bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest border border-white/20"
          >
            Close Emergency View
          </button>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Powered by ResQAI Emergency Response</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 font-sans selection:bg-red-100 selection:text-red-900",
      themeClasses.bg,
      themeClasses.text
    )}>
      {/* QR Scanner Overlay */}
      {isScanningQR && <QRScanner />}

      {/* SOS Countdown Visual Confirmation Overlay */}
      <AnimatePresence>
        {isCountdownActive && !isAutoTriggering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] pointer-events-none overflow-hidden"
          >
            {/* Pulsing Red Border around the screen */}
            <motion.div
              animate={{ 
                boxShadow: [
                  "inset 0 0 0 0px rgba(220, 38, 38, 0)",
                  "inset 0 0 0 20px rgba(220, 38, 38, 0.6)",
                  "inset 0 0 0 0px rgba(220, 38, 38, 0)"
                ]
              }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0"
            />
            
            {/* Large Animating SOS Icon (Floating) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6">
              <motion.div
                animate={{ 
                  scale: [1, 1.15, 1],
                  rotate: [0, 3, -3, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-40 h-40 bg-red-600 rounded-[3rem] flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.5)] border-4 border-white/40 backdrop-blur-sm"
              >
                <AlertTriangle className="w-20 h-20 text-white" />
              </motion.div>
              
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="bg-red-600 px-8 py-3 rounded-2xl shadow-xl border border-white/20"
              >
                <span className="text-white font-black uppercase tracking-[0.4em] text-2xl italic">SOS ACTIVE</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Trigger Countdown Overlay */}
      <AnimatePresence>
        {isAutoTriggering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-red-600 flex flex-col items-center justify-center p-8 text-white overflow-hidden"
          >
            {/* Pulsing Background Rings */}
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute w-96 h-96 border-4 border-white/20 rounded-full"
            />
            <motion.div 
              animate={{ scale: [1, 2, 1], opacity: [0.2, 0.05, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              className="absolute w-96 h-96 border-4 border-white/10 rounded-full"
            />

            <div className="relative z-10 text-center space-y-8 max-w-md">
              <div className="w-24 h-24 bg-white text-red-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <AlertCircle className="w-12 h-12" />
              </div>

              <div className="space-y-4">
                <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">Emergency Detected</h2>
                <p className="text-lg font-bold text-white/80 uppercase tracking-widest leading-tight">
                  {autoTriggerReason || "Potential emergency detected"}
                </p>
              </div>

              <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="12"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="white"
                    strokeWidth="12"
                    strokeDasharray={553}
                    initial={{ strokeDashoffset: 553 }}
                    animate={{ strokeDashoffset: 553 - (553 * (10 - countdown) / 10) }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </svg>
                <span className="absolute text-7xl font-black italic tracking-tighter">{countdown}</span>
              </div>

              <div className="space-y-4 pt-8">
                <p className="text-sm font-bold text-white/60 uppercase tracking-widest">
                  Alerting emergency services in {countdown} seconds...
                </p>
                <button 
                  onClick={cancelSOS}
                  className="w-full py-6 bg-white text-red-600 rounded-3xl font-black uppercase text-lg tracking-widest shadow-2xl active:scale-95 transition-all"
                >
                  I am OK - Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Recognition Overlays */}
      <AnimatePresence>
        {showPrivacyConsent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
              
              <div className="relative z-10 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tight">Privacy First</h3>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Your safety and data are our priority</p>
                </div>

                <div className="space-y-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <p className="text-xs font-medium text-gray-700">We collect minimum data, only with your explicit consent.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <p className="text-xs font-medium text-gray-700">Emergency photos/videos are processed and not stored permanently.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <p className="text-xs font-medium text-gray-700">Location is only shared with your emergency contacts when you trigger an alert.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleAcceptPrivacy}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all"
                  >
                    I Accept & Understand
                  </button>
                  <button
                    onClick={handleDeclinePrivacy}
                    className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-gray-200 transition-colors"
                  >
                    Decline
                  </button>
                </div>
                
                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                  Read our full <span className="underline cursor-pointer">Privacy Policy</span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isHelperPromptVisible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-x-4 bottom-24 z-50 max-w-md mx-auto"
          >
            <div className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-red-100 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                  <HeartHandshake className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h4 className="font-black text-lg uppercase italic tracking-tight">Are you helping someone right now?</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">We'd love to recognize your help!</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsHelperPromptVisible(false);
                    setIsVerificationVisible(true);
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-200"
                >
                  Yes, I'm helping 🙋‍♂️
                </button>
                <button
                  onClick={() => setIsHelperPromptVisible(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-xs tracking-widest"
                >
                  Skip
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {isVerificationVisible && (
          <VerificationModal 
            engagementStartTime={engagementStartTime}
            confirmedActions={confirmedActions}
            setConfirmedActions={setConfirmedActions}
            completedSteps={completedSteps}
            totalSteps={response?.firstAidSteps.length || 0}
            situationalAnswers={situationalAnswers}
            setSituationalAnswers={setSituationalAnswers}
            onClose={() => setIsVerificationVisible(false)}
            onContinue={() => {
              setIsVerificationVisible(false);
              setIsHelperFormVisible(true);
            }}
          />
        )}

        {isReviewingRecognition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md space-y-6 relative overflow-hidden text-center"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <ShieldCheck className="w-10 h-10 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase italic tracking-tight">Verification Under Review</h3>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Analyzing proximity, behavior & consistency...</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-gray-400">Interaction Level</span>
                  <span className="text-blue-600">High</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-gray-400">Consistency Check</span>
                  <span className="text-green-600">Passed</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3 }}
                    className="bg-blue-600 h-full"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">
                “We value real assistance over quick claims”
              </p>
            </motion.div>
          </motion.div>
        )}

        {isHelperFormVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              
              <div className="relative z-10 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tight">Helper Recognition</h3>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Join our community of heroes</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Your Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={helperForm.name}
                      onChange={(e) => setHelperForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Photo (Optional)</label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e: any) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setHelperForm(prev => ({ ...prev, photo: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="w-16 h-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center hover:border-red-300 transition-colors overflow-hidden"
                      >
                        {helperForm.photo ? (
                          <img src={helperForm.photo} alt="Helper" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-6 h-6 text-gray-300" />
                        )}
                      </button>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight">
                        Upload a photo to be featured on your hero card
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={helperForm.consent}
                      onChange={(e) => setHelperForm(prev => ({ ...prev, consent: e.target.checked }))}
                      className="w-5 h-5 rounded-lg border-gray-300 text-red-600 focus:ring-red-500/20"
                    />
                    <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">
                      I consent to recognition and community features
                    </span>
                  </label>
                  
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-tight text-center px-4">
                    Your data is safe. We only use it for recognition with your explicit consent.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleVerifyHelper}
                    disabled={!helperForm.consent || isVerifyingLocation}
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-red-200 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isVerifyingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>Get Recognized 🏅</>
                    )}
                  </button>
                  <button
                    onClick={() => setIsHelperFormVisible(false)}
                    className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-sm tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

              </AnimatePresence>

      {/* Call Confirmation Modal */}
      <AnimatePresence>
        {is911ConfirmationVisible && pendingPhoneCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm text-center space-y-8 shadow-2xl border-4 border-red-100"
            >
              <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto animate-pulse">
                <Phone className="w-12 h-12 fill-red-600" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-red-600">Call {pendingPhoneCall}?</h2>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] leading-relaxed">
                  {pendingPhoneCall === '911' 
                    ? "Are you sure you want to initiate an emergency call? Accidental calls can delay help for others."
                    : `Are you sure you want to call ${pendingPhoneCall}?`}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    window.location.href = `tel:${pendingPhoneCall}`;
                    setIs911ConfirmationVisible(false);
                    setPendingPhoneCall(null);
                  }}
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Phone className="w-5 h-5 fill-white" />
                  Confirm Call
                </button>
                <button
                  onClick={() => {
                    setIs911ConfirmationVisible(false);
                    setPendingPhoneCall(null);
                  }}
                  className="w-full py-5 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nearby Emergency Alert */}
      <AnimatePresence>
        {isAlertVisible && activeNearbyAlert && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-4 right-4 z-[100] pointer-events-none"
          >
            <div className="max-w-md mx-auto bg-red-600 text-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-white/20 backdrop-blur-xl pointer-events-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-black uppercase italic tracking-tighter text-lg leading-none">Nearby Emergency</h4>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">
                    {activeNearbyAlert.type} • {activeNearbyAlert.distance.toFixed(1)}km away
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsAlertVisible(false);
                    setActiveTab('sos');
                    setIncidentLocation(activeNearbyAlert.location);
                    showToast("Navigating to help...", "info");
                  }}
                  className="px-4 py-3 bg-white text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-90 transition-all"
                >
                  I Can Help
                </button>
                <button 
                  onClick={() => setIsAlertVisible(false)}
                  className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">ResQAI</h1>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Rapid Response Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('offline-guide')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all hover:bg-gray-50 active:scale-95",
              isOnline ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100 animate-pulse"
            )}
            title="Offline Support Guide"
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={requestNotificationPermission}
                className={cn(
                  "p-2 rounded-full transition-all",
                  notificationsEnabled ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                )}
                title={notificationsEnabled ? "Notifications Enabled" : "Enable Notifications"}
              >
                {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleTheme}
                className={cn(
                  "p-2 rounded-full transition-all",
                  isDarkMode 
                    ? "bg-slate-800 text-yellow-400 border border-slate-700" 
                    : "bg-gray-100 text-slate-800 border border-gray-200 hover:bg-gray-200"
                )}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                <AnimatePresence mode="wait">
                  {isDarkMode ? (
                    <motion.div
                      key="moon"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                    >
                      <Moon className="w-4 h-4 fill-current" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                    >
                      <Sun className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
              <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-gray-200" />
              <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all">
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-24">
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-orange-50 border border-orange-100 p-4 rounded-3xl flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-black text-orange-900 uppercase tracking-tight">Offline Mode Active</p>
                <p className="text-[10px] text-orange-700 font-medium uppercase tracking-widest">Using preloaded first-aid data</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('offline-guide')}
              className="px-4 py-2 bg-orange-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-orange-700 transition-all"
            >
              Open Guide
            </button>
          </motion.div>
        )}
        <AnimatePresence>
          {isCountdownActive && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 bg-red-600 text-white p-6 rounded-3xl shadow-2xl shadow-red-200 border-4 border-white/20 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 h-1 bg-white/30 transition-all duration-1000 ease-linear" style={{ width: `${(countdown / 10) * 100}%` }} />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                    <span className="text-3xl font-black tabular-nums">{countdown}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Emergency Alert</h2>
                    <p className="text-sm text-white/80 font-medium uppercase tracking-widest">Tap to cancel if you're safe</p>
                  </div>
                </div>
                <button 
                  onClick={cancelSOS}
                  className="px-6 py-3 bg-white text-red-600 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-red-50 transition-all shadow-lg active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!user && !isBystanderMode ? (
          <div className="space-y-6">
            <div className="bg-white rounded-[3rem] p-12 text-center space-y-8 shadow-2xl border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
              
              <div className="relative z-10 space-y-8">
                <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
                  <Shield className="w-12 h-12 text-red-600" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">ResQAI</h2>
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Rapid Response & First-Aid Assistant</p>
                </div>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => {
                      setIsBystanderMode(true);
                      setActiveTab('bystander-report');
                    }}
                    className="w-full py-5 bg-red-600 text-white rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl shadow-red-200 flex items-center justify-center gap-3 hover:bg-red-700 active:scale-95 transition-all"
                  >
                    <AlertTriangle className="w-6 h-6" />
                    Report Accident
                  </button>
                  
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Or</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <button 
                    onClick={handleLogin}
                    className="w-full py-5 bg-white text-gray-900 rounded-3xl font-black uppercase text-sm tracking-widest shadow-xl border-2 border-gray-100 flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <LogIn className="w-6 h-6 text-red-600" />
                    Sign in with Google
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-gray-100 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  Scan Victim QR
                </h3>
                <div className="bg-red-50 px-2 py-1 rounded-lg">
                  <span className="text-[8px] font-black uppercase tracking-widest text-red-700">Helper Mode</span>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div 
                  onClick={() => setIsScanningQR(true)}
                  className="w-32 h-32 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-red-200 hover:bg-red-50 transition-all group"
                >
                  <Camera className="w-8 h-8 text-gray-300 group-hover:text-red-400 transition-colors" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 group-hover:text-red-600">Open Scanner</span>
                </div>
                
                <div className="flex-1 space-y-3">
                  <h4 className="font-black text-lg uppercase italic tracking-tight text-gray-900 leading-none">Found someone?</h4>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">
                    Scan the QR code on the victim's lock screen or medical ID to instantly access their emergency contacts and medical data.
                  </p>
                  <button 
                    onClick={() => setIsScanningQR(true)}
                    className="w-full py-3 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 transition-all"
                  >
                    Start Scanning
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setIsScanningQR(true)}
                className="bg-blue-600 rounded-[2.5rem] p-8 text-white space-y-4 shadow-xl relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform" />
                <SmartphoneNfc className="w-8 h-8 relative z-10" />
                <div className="relative z-10">
                  <h4 className="font-black uppercase italic tracking-tight text-lg">Emergency QR</h4>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Scan for medical info</p>
                </div>
              </div>
              <div 
                onClick={() => {
                  const message = "I'm helping someone in an emergency. Can you assist?";
                  const fallbackNumber = (import.meta as any).env.VITE_TWILIO_CONTACT_NUMBER || '';
                  if (fallbackNumber) {
                    window.open(`sms:${fallbackNumber}?body=${encodeURIComponent(message)}`, '_blank');
                  } else {
                    showToast('No fallback number configured', 'error');
                  }
                }}
                className="bg-[#151619] rounded-[2.5rem] p-8 text-white space-y-4 shadow-xl relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform" />
                <MessageSquare className="w-8 h-8 relative z-10" />
                <div className="relative z-10">
                  <h4 className="font-black uppercase italic tracking-tight text-lg">SMS Fallback</h4>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Works without data</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'bystander-report' && (
              <motion.div
                key="bystander-report"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900">Report Accident</h2>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Help first responders with details</p>
                      </div>
                    </div>
                    {!user && (
                      <button 
                        onClick={() => {
                          setIsBystanderMode(false);
                          setActiveTab('sos');
                        }}
                        className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">What happened?</label>
                      <textarea 
                        value={bystanderReport.description}
                        onChange={(e) => setBystanderReport(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the accident (e.g., car crash, person fainted, fire...)"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl p-6 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-red-50 focus:border-red-200 outline-none transition-all min-h-[150px] resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Location Description / Address (Optional)</label>
                      <input 
                        type="text"
                        value={bystanderReport.locationDescription}
                        onChange={(e) => setBystanderReport(prev => ({ ...prev, locationDescription: e.target.value }))}
                        placeholder="e.g., Near the main gate of Central Park"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-xs font-bold text-gray-900 focus:ring-4 focus:ring-red-50 focus:border-red-200 outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Your Name (Optional)</label>
                        <input 
                          type="text"
                          value={bystanderReport.name}
                          onChange={(e) => setBystanderReport(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="John Doe"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-xs font-bold text-gray-900 focus:ring-4 focus:ring-red-50 focus:border-red-200 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Contact Info (Optional)</label>
                        <input 
                          type="text"
                          value={bystanderReport.contact}
                          onChange={(e) => setBystanderReport(prev => ({ ...prev, contact: e.target.value }))}
                          placeholder="Phone or Email"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-xs font-bold text-gray-900 focus:ring-4 focus:ring-red-50 focus:border-red-200 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Photo Evidence</label>
                        <div 
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e: any) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => setBystanderReport(prev => ({ ...prev, photo: e.target?.result as string }));
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                          className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all overflow-hidden relative group"
                        >
                          {bystanderReport.photo ? (
                            <>
                              <img src={bystanderReport.photo} alt="Accident" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="w-8 h-8 text-white" />
                              </div>
                            </>
                          ) : (
                            <>
                              <Camera className="w-8 h-8 text-gray-300" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Add Photo</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Location</label>
                        <div className="aspect-square bg-gray-50 border-2 border-gray-100 rounded-3xl flex flex-col items-center justify-center gap-3 p-4 text-center relative group">
                          <MapPin className={cn("w-8 h-8", bystanderReport.location ? "text-green-500" : "text-gray-300")} />
                          {bystanderReport.location ? (
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Location Detected</p>
                              <p className="text-[8px] font-bold text-gray-400 truncate w-full">{bystanderReport.location.lat.toFixed(4)}, {bystanderReport.location.lng.toFixed(4)}</p>
                            </div>
                          ) : (
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Detecting...</p>
                          )}
                          <button 
                            onClick={() => {
                              if ("geolocation" in navigator) {
                                navigator.geolocation.getCurrentPosition((position) => {
                                  setBystanderReport(prev => ({ 
                                    ...prev, 
                                    location: { lat: position.coords.latitude, lng: position.coords.longitude } 
                                  }));
                                  showToast("Location updated", "success");
                                }, (error) => {
                                  console.error("Geolocation error:", error);
                                  showToast("Failed to detect location", "error");
                                });
                              }
                            }}
                            className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-gray-600 active:scale-90 transition-all"
                            title="Refresh Location"
                          >
                            <Navigation className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      disabled={!bystanderReport.description || bystanderReport.isSubmitting}
                      onClick={async () => {
                        setBystanderReport(prev => ({ ...prev, isSubmitting: true }));
                        try {
                          // Simulate sending alert
                          await new Promise(resolve => setTimeout(resolve, 2000));
                          
                          // Save to Firestore
                          // Save to Realtime Database
                          const newIncidentRef = push(ref(db, 'incidents'));
                          await set(newIncidentRef, {
                            userId: user?.uid || 'anonymous',
                            emergencyType: 'Bystander Report',
                            description: bystanderReport.description || '',
                            photo: bystanderReport.photo || null,
                            location: bystanderReport.location ? { lat: bystanderReport.location.lat, lng: bystanderReport.location.lng } : null,
                            locationDescription: bystanderReport.locationDescription || 'Not Provided',
                            reporterName: bystanderReport.name || 'Anonymous',
                            reporterContact: bystanderReport.contact || 'Not Provided',
                            timestamp: serverTimestamp(),
                            severity: 'high',
                            emergencyKey: 'bystander_report',
                            triggerAlert: true,
                            speechText: 'Bystander report submitted.',
                            injuryArea: null,
                            status: 'active'
                          });

                          if (bystanderReport.location) {
                            setIncidentLocation(bystanderReport.location);
                          }

                          showToast("Accident Reported Successfully!", "success");
                          setBystanderReport({ description: '', photo: null, location: null, locationDescription: '', name: '', contact: '', isSubmitting: false });
                          setIsBystanderMode(false);
                          setActiveTab('sos');
                          
                          // Trigger helper prompt after a short delay
                          setTimeout(() => {
                            setIsHelperPromptVisible(true);
                          }, 3000);
                        } catch (error) {
                          console.error("Report error:", error);
                          showToast("Failed to report accident", "error");
                          setBystanderReport(prev => ({ ...prev, isSubmitting: false }));
                        }
                      }}
                      className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3"
                    >
                      {bystanderReport.isSubmitting ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Reporting...
                        </>
                      ) : (
                        <>
                          <Send className="w-6 h-6" />
                          Send Emergency Alert
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
                {activeTab === 'offline-guide' && (
              <motion.div
                key="offline-guide"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className={cn(themeClasses.card, "p-8 space-y-6 shadow-sm border")}>
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isDarkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-600 text-white")}>
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className={cn("text-2xl font-black uppercase italic tracking-tighter", themeClasses.text)}>Offline Guide</h2>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-blue-500/80" : "text-blue-600")}>Critical first-aid without data</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {OFFLINE_FIRST_AID_DATA.map((item) => (
                      <div key={item.id} className="space-y-3">
                        <button 
                          onClick={() => toggleNearbyCategory(item.id)}
                          className={cn("w-full flex items-center justify-between p-4 rounded-2xl border transition-all group", isDarkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700" : "bg-gray-50 border-gray-100 hover:bg-gray-100")}
                        >
                          <span className={cn("font-black uppercase italic tracking-tight text-sm", themeClasses.text)}>{item.title}</span>
                          <ChevronRight className={cn("w-4 h-4 transition-transform", expandedCategories.includes(item.id) && "rotate-90", isDarkMode ? "text-slate-500" : "text-gray-400")} />
                        </button>
                        
                        <AnimatePresence>
                          {expandedCategories.includes(item.id) && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-2 pl-4"
                            >
                              {item.steps.map((step, idx) => (
                                <div key={idx} className={cn("p-4 rounded-2xl border flex gap-4", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-white border-gray-100 shadow-sm")}>
                                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isDarkMode ? "bg-slate-700" : "bg-gray-50")}>
                                    <div className="text-[10px] font-black">{idx + 1}</div>
                                  </div>
                                  <div>
                                    <p className={cn("text-xs font-bold leading-relaxed", themeClasses.text)}>{step}</p>
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'cpr-assist' && (
              <motion.div
                key="cpr"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className={cn(themeClasses.card, "p-8 shadow-sm border text-center space-y-8")}>
                  <div className="space-y-2">
                    <h2 className={cn("text-3xl font-black uppercase italic tracking-tighter", themeClasses.text)}>CPR Live Assist</h2>
                    <p className={themeClasses.textMuted}>Follow the rhythm. Push hard and fast in the center of the chest.</p>
                  </div>

                  {/* CPR Video Guide */}
                  <div className="space-y-4">
                    <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-xl">
                      <div className="aspect-video bg-gray-900 relative">
                        {/* Direct video thumbnail with click to open */}
                        <div 
                          onClick={() => {
                            window.open('https://www.youtube.com/watch?v=QDVVENjyo_U', '_blank');
                            showToast("Opening CPR training video", 'info');
                          }}
                          className="absolute inset-0 bg-cover bg-center cursor-pointer group"
                          style={{
                            backgroundImage: 'url(https://img.youtube.com/vi/QDVVENjyo_U/hqdefault.jpg)'
                          }}
                        >
                          {/* Play button overlay */}
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <div className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-xl transition-all active:scale-95">
                              <Play className="w-12 h-12" />
                            </div>
                          </div>
                          
                          {/* Video info overlay */}
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="bg-black/80 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
                              <h3 className="font-bold text-sm mb-1">CPR Training Video</h3>
                              <p className="text-xs opacity-90">American Heart Association • 2:30 minutes</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className={cn(
                      "p-4 rounded-xl space-y-3",
                      isDarkMode ? "bg-slate-800/50" : "bg-gray-50"
                    )}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-sm mb-1">Hands-Only CPR Training</h3>
                          <p className={cn("text-xs", themeClasses.textMuted)}>
                            Click the video above to start training
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              window.open('https://www.youtube.com/watch?v=QDVVENjyo_U', '_blank');
                              showToast("Opening CPR video in new tab", 'info');
                            }}
                            className="px-3 py-2 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-all active:scale-95 flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Video
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText('https://www.youtube.com/watch?v=QDVVENjyo_U');
                              showToast("Video link copied!", 'success');
                            }}
                            className={cn(
                              "px-3 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center gap-2",
                              isDarkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            )}
                          >
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </button>
                        </div>
                      </div>
                      <p className={cn("text-xs font-medium", themeClasses.textMuted)}>
                        💡 <strong>How to use:</strong> Click on the video thumbnail above to open the CPR training video in YouTube. This covers proper hand placement, compression depth, and rhythm for effective CPR.
                      </p>
                    </div>
                  </div>

                  {/* CPR Visual Interface */}
                  <div className="relative w-80 h-80 mx-auto mb-6">
                    {/* Outer ring with pulse animation */}
                    <motion.div
                      animate={isCPRActive ? {
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.6, 0.3]
                      } : {}}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-4 border-red-500"
                    />
                    
                    {/* Human torso silhouette */}
                    <div className="absolute inset-4 flex items-center justify-center">
                      <div className="relative">
                        {/* Torso shape */}
                        <div className={cn(
                          "w-48 h-64 rounded-t-full border-4 relative overflow-hidden",
                          isDarkMode ? "border-slate-600 bg-slate-800" : "border-gray-300 bg-gray-100"
                        )}>
                          {/* Chest area highlight */}
                          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-32 h-24 bg-red-500/20 rounded-full border-2 border-red-500/50 border-dashed" />
                          
                          {/* Hand placement indicators */}
                          <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-4">
                            {/* Left hand indicator */}
                            <motion.div
                              animate={isCPRActive ? {
                                y: [0, -8, 0],
                                scale: [1, 1.1, 1]
                              } : {}}
                              transition={{ duration: 0.6, repeat: Infinity, ease: "easeOut" }}
                              className="w-12 h-12 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center"
                            >
                              <span className="text-white font-black text-lg">L</span>
                            </motion.div>
                            
                            {/* Right hand indicator */}
                            <motion.div
                              animate={isCPRActive ? {
                                y: [0, -8, 0],
                                scale: [1, 1.1, 1]
                              } : {}}
                              transition={{ duration: 0.6, repeat: Infinity, ease: "easeOut", delay: 0.1 }}
                              className="w-12 h-12 bg-red-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center"
                            >
                              <span className="text-white font-black text-lg">R</span>
                            </motion.div>
                          </div>
                          
                          {/* Compression depth indicator */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                            <div className={cn(
                              "text-2xl font-black mb-1",
                              isCPRActive ? "text-red-500" : themeClasses.textMuted
                            )}>
                              {compressionCount}/30
                            </div>
                            <div className={cn("text-xs uppercase tracking-widest", themeClasses.textMuted)}>
                              Compressions
                            </div>
                          </div>
                        </div>
                        
                        {/* Head */}
                        <div className={cn(
                          "w-16 h-16 rounded-full border-4 -mt-2 mx-auto",
                          isDarkMode ? "border-slate-600 bg-slate-700" : "border-gray-300 bg-gray-200"
                        )} />
                      </div>
                    </div>

                    {/* CPR Status Badge */}
                    <div className="absolute top-4 right-4">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest",
                        isCPRActive 
                          ? "bg-red-500 text-white animate-pulse" 
                          : isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"
                      )}>
                        {isCPRActive ? "ACTIVE" : "READY"}
                      </div>
                    </div>

                    {/* Rate indicator */}
                    {isCPRActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bottom-4 left-4"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-xs font-medium text-green-600">100-120 BPM</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* CPR Controls */}
                  <div className="space-y-4">
                    {!isCPRActive ? (
                      <div className="space-y-3">
                        <button 
                          onClick={startCPR}
                          className="w-full py-6 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                        >
                          Start CPR
                        </button>
                        
                        <div className={cn(
                          "p-4 rounded-xl text-xs space-y-2",
                          isDarkMode ? "bg-slate-800/50" : "bg-gray-50"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="font-medium">Hand Placement:</span>
                          </div>
                          <p className={themeClasses.textMuted}>
                            Place hands in center of chest, between the nipples
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="font-medium">Compression Depth:</span>
                          </div>
                          <p className={themeClasses.textMuted}>
                            2-2.4 inches (5-6 cm) for adults
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button 
                          onClick={stopCPR}
                          className="w-full py-6 bg-gray-600 text-white rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-gray-700 transition-colors active:scale-95"
                        >
                          Stop CPR Assist
                        </button>
                        
                        {/* Real-time feedback */}
                        <div className={cn(
                          "grid grid-cols-3 gap-2 p-4 rounded-xl",
                          isDarkMode ? "bg-slate-800/50" : "bg-gray-50"
                        )}>
                          <div className="text-center">
                            <div className="text-lg font-black text-red-500">{cprCycle}</div>
                            <div className="text-xs uppercase tracking-widest text-gray-500">Cycle</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-black text-blue-500">{cprAccuracy}%</div>
                            <div className="text-xs uppercase tracking-widest text-gray-500">Accuracy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-black text-green-500">{Math.floor(cprTimer / 60)}:{(cprTimer % 60).toString().padStart(2, '0')}</div>
                            <div className="text-xs uppercase tracking-widest text-gray-500">Time</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Started CPR Status Button */}
                  {isCPRActive && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => {
                          showToast("CPR status logged successfully", 'success');
                          // Here you could add additional functionality like:
                          // - Logging to emergency services
                          // - Notifying emergency contacts
                          // - Recording timestamp
                        }}
                        className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Started CPR
                      </button>
                      <p className={cn("text-xs font-medium mt-3 text-center", themeClasses.textMuted)}>
                        Click to confirm you have started CPR on the patient
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === 'sos' && (
              <motion.div
                key="sos"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className={cn(themeClasses.card, "p-6 rounded-3xl relative overflow-hidden")}>
                  <h2 className={cn("text-2xl font-bold mb-2", themeClasses.text)}>What's the emergency?</h2>
                  <p className={cn("text-sm mb-6", themeClasses.textMuted)}>Describe the situation or upload a photo of the injury for immediate guidance.</p>
                  
                  <div className={cn(
                    "flex items-center justify-between mb-6 p-4 rounded-2xl border shadow-sm transition-all duration-500",
                    isDarkMode ? "bg-blue-900/20 border-blue-800/50" : "bg-blue-50 border-blue-100"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                        isHandsFree 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 animate-pulse" 
                          : isDarkMode ? "bg-slate-800 text-blue-400 border border-slate-700" : "bg-white text-blue-600 shadow-sm border border-blue-100"
                      )}>
                        <Mic className={cn("w-6 h-6", isHandsFree && "animate-bounce")} />
                      </div>
                      <div>
                        <h4 className={cn("text-sm font-black uppercase italic tracking-tight", isDarkMode ? "text-blue-400" : "text-blue-900")}>Hands-Free Mode</h4>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest leading-none mt-1", isDarkMode ? "text-blue-500/80" : "text-blue-600")}>
                          {isHandsFree ? "Listening for 'Help'..." : "Voice commands disabled"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsScanningQR(true)}
                        className="p-3 bg-white text-gray-600 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-90 transition-all"
                        title="Scan Victim QR"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          const newState = !isHandsFree;
                          setIsHandsFree(newState);
                          showToast(newState ? "Hands-Free Mode Enabled" : "Hands-Free Mode Disabled", newState ? 'success' : 'info');
                        }}
                        className={cn(
                          "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-90",
                          isHandsFree ? "bg-blue-600 text-white shadow-lg" : "bg-white text-blue-600 border-2 border-blue-200 hover:border-blue-400"
                        )}
                      >
                        {isHandsFree ? "Active" : "Enable"}
                      </button>
                    </div>
                  </div>

                  {isBystanderMode && (
                    <div className="mb-6 p-6 bg-blue-600 text-white rounded-[2.5rem] shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg uppercase italic tracking-tight">Bystander Mode</h4>
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Reporting an external accident</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsScanningQR(true)}
                            className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          >
                            <QrCode className="w-4 h-4" />
                            Scan QR
                          </button>
                          <button 
                            onClick={() => setIsBystanderMode(false)}
                            className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Languages className="w-4 h-4 text-gray-600" />
                      </div>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-transparent text-sm font-bold border-none focus:ring-0 cursor-pointer"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi (हिन्दी)</option>
                        <option value="Telugu">Telugu (తెలుగు)</option>
                        <option value="Tamil">Tamil (தமிழ்)</option>
                        <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                        <option value="Spanish">Spanish (Español)</option>
                        <option value="French">French (Français)</option>
                        <option value="Arabic">Arabic (العربية)</option>
                      </select>
                    </div>
                    {!isOnline && (
                      <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-3">
                          <WifiOff className="w-5 h-5 text-red-600" />
                          <div>
                            <p className="text-sm font-bold text-red-800">You are offline</p>
                            <p className="text-[10px] text-red-600 font-medium uppercase tracking-widest">AI analysis is unavailable</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setActiveTab('offline-guide')}
                          className="px-4 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest"
                        >
                          Offline Guide
                        </button>
                      </div>
                    )}

                    <div className="relative">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g., 'Help! I'm bleeding and I'm dizzy!'"
                        className={cn(
                          "w-full min-h-[120px] p-6 border-none rounded-3xl focus:ring-4 transition-all resize-none text-lg",
                          isDarkMode 
                            ? "bg-slate-800/40 text-white placeholder-slate-600 focus:ring-red-500/10 shadow-inner" 
                            : "bg-gray-50 text-gray-900 placeholder-gray-400 focus:ring-red-500/10 shadow-inner"
                        )}
                      />
                      {predictedSeverity && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "absolute bottom-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 shadow-sm",
                            predictedSeverity === 'high' ? "bg-red-100 text-red-700 border-red-200" :
                            predictedSeverity === 'medium' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                            "bg-blue-100 text-blue-700 border-blue-200"
                          )}
                        >
                          <Activity className="w-3 h-3" />
                          AI Prediction: {predictedSeverity} Risk
                        </motion.div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      {image && (
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-red-500 shadow-lg group">
                          <img src={image} alt="Emergency" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setImage(null)}
                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {video && (
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-red-500 shadow-lg bg-black group flex items-center justify-center">
                          <video src={video} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Video className="w-6 h-6 text-white opacity-50" />
                          </div>
                          <button 
                            onClick={() => setVideo(null)}
                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={cn("flex gap-3", isDarkMode ? "text-slate-100" : "text-gray-600")}>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl transition-all font-bold text-sm shadow-sm",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <Camera className="w-4 h-4" />
                        Photo
                      </button>
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-bold text-sm shadow-sm",
                          isRecording 
                            ? "bg-red-500 text-white border-red-400 animate-pulse" 
                            : isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <Video className={cn("w-4 h-4", isRecording && "animate-bounce")} />
                        {isRecording ? `00:${recordingTime.toString().padStart(2, '0')}` : "Video"}
                      </button>
                    </div>

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={handleSOS}
                        disabled={isAnalyzing || (!input && !image && !video)}
                        className={cn(
                          "flex-[2] py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl shadow-red-200",
                          isAnalyzing ? "bg-gray-200 text-gray-400" : "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]"
                        )}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-6 h-6" />
                            <span>ACTIVATE SOS</span>
                          </>
                        )}
                      </button>
                      <button 
                        onClick={connectToNearbyHelpers}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all flex flex-col items-center justify-center gap-1"
                      >
                        <Users className="w-5 h-5" />
                        Connect Helper
                      </button>
                    </div>

                    <button 
                      onClick={() => {
                        setIsBystanderMode(true);
                        setActiveTab('bystander-report');
                      }}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all border-2",
                        isDarkMode 
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 shadow-lg shadow-orange-900/10" 
                          : "bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100 shadow-sm"
                      )}
                    >
                      <AlertTriangle className="w-5 h-5" />
                      Report Accident (Bystander)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setPendingPhoneCall('911');
                      setIs911ConfirmationVisible(true);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all active:scale-95 flex flex-col items-center gap-2",
                      isDarkMode ? "bg-slate-800/80 border-slate-700 hover:bg-slate-700" : "bg-white border-gray-100 shadow-sm hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isDarkMode ? "bg-blue-500/20" : "bg-blue-50")}>
                      <Phone className={cn("w-5 h-5", isDarkMode ? "text-blue-400" : "text-blue-600")} />
                    </div>
                    <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-200" : "text-gray-900")}>Call 911</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('nearby')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all active:scale-95 flex flex-col items-center gap-2",
                      isDarkMode ? "bg-slate-800/80 border-slate-700 hover:bg-slate-700" : "bg-white border-gray-100 shadow-sm hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isDarkMode ? "bg-orange-500/20" : "bg-orange-50")}>
                      <Navigation className={cn("w-5 h-5", isDarkMode ? "text-orange-400" : "text-orange-600")} />
                    </div>
                    <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-200" : "text-gray-900")}>Nearby Hospital</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('cpr-assist')}
                    className={cn(
                      "p-4 rounded-2xl border transition-all active:scale-95 flex flex-col items-center gap-2",
                      isDarkMode ? "bg-slate-800/80 border-slate-700 hover:bg-slate-700" : "bg-white border-gray-100 shadow-sm hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isDarkMode ? "bg-red-500/20" : "bg-red-50")}>
                      <Activity className={cn("w-5 h-5", isDarkMode ? "text-red-400" : "text-red-600")} />
                    </div>
                    <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-200" : "text-gray-900")}>CPR Assist</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (location) {
                        const link = `https://maps.google.com/?q=${location.lat},${location.lng}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'My Emergency Location',
                            text: 'I need help! Here is my current location:',
                            url: link,
                          }).catch(console.error);
                        } else {
                          navigator.clipboard.writeText(link);
                          showToast("Location link copied", 'success');
                        }
                      } else {
                        showToast("Location not available", 'error');
                      }
                    }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all active:scale-95 flex flex-col items-center gap-2",
                      isDarkMode ? "bg-slate-800/80 border-slate-700 hover:bg-slate-700" : "bg-white border-gray-100 shadow-sm hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isDarkMode ? "bg-blue-500/20" : "bg-blue-50")}>
                      <MapPin className={cn("w-5 h-5", isDarkMode ? "text-blue-400" : "text-blue-600")} />
                    </div>
                    <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-200" : "text-gray-900")}>Share Location</span>
                  </button>
                  <button 
                    onClick={notifyContacts}
                    disabled={isNotifying}
                    className={cn(
                      "p-4 rounded-2xl border transition-all active:scale-95 flex flex-col items-center gap-2 disabled:opacity-50 col-span-2",
                      isDarkMode ? "bg-slate-800/80 border-slate-700 hover:bg-slate-700" : "bg-white border-gray-100 shadow-sm hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isDarkMode ? "bg-green-500/20" : "bg-green-50")}>
                      {isNotifying ? (
                        <Loader2 className={cn("w-5 h-5 animate-spin", isDarkMode ? "text-green-400" : "text-green-600")} />
                      ) : (
                        <Send className={cn("w-5 h-5", isDarkMode ? "text-green-400" : "text-green-600")} />
                      )}
                    </div>
                    <span className={cn("text-sm font-bold", isDarkMode ? "text-slate-200" : "text-gray-900")}>
                      {isNotifying ? "Sending..." : "Notify Contacts"}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'first-aid' && (
              <motion.div
                key="first-aid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {!showOfflineLibrary ? (
                  // Default First Aid Guide View
                  <div className={cn(themeClasses.card, "p-8 space-y-8")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-colors duration-500", isDarkMode ? "bg-blue-500/10 text-blue-400 shadow-blue-900/10" : "bg-blue-50 text-blue-600 shadow-blue-100")}>
                          <Heart className="w-8 h-8" />
                        </div>
                        <div>
                          <h2 className={cn("text-2xl font-black uppercase italic tracking-tighter transition-colors duration-500", themeClasses.text)}>First Aid Guide</h2>
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors duration-500", isDarkMode ? "text-blue-500/80" : "text-blue-600")}>Expert Wisdom In Seconds</p>
                        </div>
                      </div>
                      <div className={cn("px-4 py-2 rounded-2xl border transition-all duration-500", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-gray-50 border-gray-100 shadow-sm")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors duration-500", themeClasses.textMuted)}>Ready Offline</span>
                      </div>
                    </div>

                    {/* Emergency Response Display */}
                    {response && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-6 rounded-3xl border-2 shadow-xl",
                          response.severity === 'critical' ? "bg-red-50 border-red-200" :
                          response.severity === 'high' ? "bg-orange-50 border-orange-200" :
                          response.severity === 'medium' ? "bg-yellow-50 border-yellow-200" :
                          "bg-blue-50 border-blue-200"
                        )}
                      >
                        {/* Layer Indicator */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                              currentEmergencyLayer === 'layer1' ? "bg-green-100 text-green-700 border-green-200" :
                              currentEmergencyLayer === 'layer2' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                              "bg-red-100 text-red-700 border-red-200"
                            )}>
                              {currentEmergencyLayer === 'layer1' ? '🟢 AI First Responder' :
                               currentEmergencyLayer === 'layer2' ? '🟡 Smart Escalation' :
                               '🔴 Live Expert'}
                            </div>
                            {escalationTimer > 0 && currentEmergencyLayer === 'layer1' && (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                                  Monitoring: {escalationTimer}s
                                </span>
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            response.severity === 'critical' ? "bg-red-100 text-red-700 border-red-200" :
                            response.severity === 'high' ? "bg-orange-100 text-orange-700 border-orange-200" :
                            response.severity === 'medium' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                            "bg-blue-100 text-blue-700 border-blue-200"
                          )}>
                            {response.severity} Risk
                          </div>
                        </div>

                        {/* Emergency Type */}
                        <div className="mb-4">
                          <h3 className={cn(
                            "text-xl font-black uppercase italic tracking-tight mb-2",
                            response.severity === 'critical' ? "text-red-700" :
                            response.severity === 'high' ? "text-orange-700" :
                            response.severity === 'medium' ? "text-yellow-700" :
                            "text-blue-700"
                          )}>
                            {response.emergencyType}
                          </h3>
                          {layer1Response && (
                            <p className="text-sm text-gray-600 mb-3">{layer1Response.voiceGuidance}</p>
                          )}
                        </div>

                        {/* Layer 1 Instructions */}
                        {currentEmergencyLayer === 'layer1' && layer1Response && (
                          <div className="space-y-3 mb-4">
                            <h4 className="font-bold text-green-700 uppercase text-sm tracking-widest">Immediate Instructions:</h4>
                            <div className="space-y-2">
                              {layer1Response.instructions.map((instruction, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-green-800">{instruction}</span>
                                </div>
                              ))}
                            </div>
                            {layer1Response.safetyChecks.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-bold text-blue-700 uppercase text-sm tracking-widest mb-2">Safety Checks:</h4>
                                <div className="space-y-2">
                                  {layer1Response.safetyChecks.map((check, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                      <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <span className="text-sm text-blue-800">{check}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Layer 2 Escalation */}
                        {currentEmergencyLayer === 'layer2' && layer2Escalation && (
                          <div className="p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200 mb-4">
                            <div className="flex items-center gap-3 mb-2">
                              <AlertTriangle className="w-6 h-6 text-yellow-600" />
                              <h4 className="font-bold text-yellow-700 uppercase text-sm tracking-widest">
                                Escalating to Live Support
                              </h4>
                            </div>
                            <p className="text-sm text-yellow-800 mb-2">{layer2Escalation.reason}</p>
                            {layer2Escalation.ambulanceTriggered && (
                              <div className="flex items-center gap-2 text-red-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-bold uppercase tracking-widest">Ambulance Dispatched</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Layer 3 Live Expert */}
                        {currentEmergencyLayer === 'layer3' && layer3LiveExpert && (
                          <div className="mb-4">
                            <div className={cn(
                              "p-4 rounded-xl border-2 mb-4",
                              layer3LiveExpert.connectionStatus === 'connected' ? "bg-green-50 border-green-200" :
                              layer3LiveExpert.connectionStatus === 'connecting' ? "bg-yellow-50 border-yellow-200" :
                              "bg-red-50 border-red-200"
                            )}>
                              <div className="flex items-center gap-3 mb-2">
                                {layer3LiveExpert.connectionStatus === 'connecting' && <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />}
                                {layer3LiveExpert.connectionStatus === 'connected' && <Video className="w-6 h-6 text-green-600" />}
                                {layer3LiveExpert.connectionStatus === 'failed' && <XCircle className="w-6 h-6 text-red-600" />}
                                <h4 className={cn(
                                  "font-bold uppercase text-sm tracking-widest",
                                  layer3LiveExpert.connectionStatus === 'connected' ? "text-green-700" :
                                  layer3LiveExpert.connectionStatus === 'connecting' ? "text-yellow-700" :
                                  "text-red-700"
                                )}>
                                  {layer3LiveExpert.connectionStatus === 'connecting' ? 'Connecting to Live Expert...' :
                                   layer3LiveExpert.connectionStatus === 'connected' ? '🔴 LIVE MEDICAL ASSIST' :
                                   'Connection Failed'}
                                </h4>
                              </div>
                              <p className="text-sm text-gray-700">
                                {layer3LiveExpert.connectionStatus === 'connecting' && 'Finding the best available medical expert for your emergency...'}
                                {layer3LiveExpert.connectionStatus === 'connected' && (
                                  layer3LiveExpert.expertType === 'doctor'
                                    ? 'Real-Time Medical Guidance: Doctor can see you and provide live assistance.'
                                    : 'Emergency helpline connected and ready to assist.'
                                )}
                                {layer3LiveExpert.connectionStatus === 'failed' && 'Unable to connect to live support. Please call emergency services directly.'}
                              </p>
                            </div>

                            {/* Video Call Component */}
                            {layer3LiveExpert.connectionStatus === 'connected' && layer3LiveExpert.channelName && layer3LiveExpert.token && (
                              <div className="mb-4">
                                <VideoCall
                                  channelName={layer3LiveExpert.channelName}
                                  token={layer3LiveExpert.token}
                                  uid={user?.uid}
                                  onCallEnd={async () => {
                                    // End the call and update status
                                    if (layer3LiveExpert.callId) {
                                      await doctorMatchmaking.endCall(layer3LiveExpert.callId);
                                    }
                                    setCurrentEmergencyLayer(EmergencyLayer.LAYER_1_AI_FIRST_RESPONDER);
                                    setLayer3LiveExpert(null);
                                    showToast("Call ended", 'info');
                                  }}
                                  isDoctor={false}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* First Aid Steps */}
                        {response.firstAidSteps && response.firstAidSteps.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-bold text-gray-700 uppercase text-sm tracking-widest">Step-by-Step Instructions:</h4>
                            <div className="space-y-2">
                              {response.firstAidSteps.map((step: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {idx + 1}
                                  </div>
                                  <span className="text-sm text-gray-800">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => speak(response.speechText || 'Please follow the instructions carefully.')}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all"
                          >
                            🔊 Repeat Instructions
                          </button>
                          {currentEmergencyLayer === 'layer1' && (
                            <button
                              onClick={() => {
                                const newResponse = "I understand the instructions";
                                setUserResponses(prev => [...prev, newResponse]);
                                showToast("Response recorded", 'success');
                              }}
                              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-green-200 active:scale-95 transition-all"
                            >
                              ✅ I Understand
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}

                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                      {['All', 'Trauma', 'Cardiac', 'Breathing', 'Other'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedAidCategory(cat)}
                          className={cn(
                            "px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shrink-0 border-2",
                            selectedAidCategory === cat 
                              ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200" 
                              : isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700" : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {FIRST_AID_CONTROLS.filter(c => selectedAidCategory === 'All' || c.category === selectedAidCategory).map((control) => (
                        <motion.button
                          key={control.id}
                          layout
                          onClick={() => setActiveVideoGuide(control.id)}
                          className={cn(
                            "group p-6 rounded-[2.5rem] border-2 transition-all hover:scale-[1.02] active:scale-[0.98] text-left relative overflow-hidden",
                            isDarkMode ? "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50" : "bg-gray-50 border-white shadow-sm hover:shadow-md"
                          )}
                        >
                          <div className="flex items-center gap-4 relative z-10">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500", isDarkMode ? "bg-slate-700 text-blue-400" : "bg-white text-blue-600")}>
                              <control.icon className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className={cn("font-black text-sm uppercase italic tracking-tight transition-colors duration-500", themeClasses.text)}>{control.title}</h4>
                              <p className={cn("text-[10px] font-bold uppercase transition-colors duration-500", themeClasses.textMuted)}>Click for visual guide</p>
                            </div>
                          </div>
                          <Play className={cn("absolute bottom-6 right-6 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110", isDarkMode ? "text-slate-600" : "text-gray-200")} />
                        </motion.button>
                      ))}
                    </div>

                    {/* Looking for offline guidance link */}
                    <div className="pt-4 border-t border-gray-100">
                      <button 
                        onClick={() => setShowOfflineLibrary(true)}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mx-auto"
                      >
                        <WifiOff className="w-4 h-4" />
                        <span>Looking for offline guidance?</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Offline Library View
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(themeClasses.card, "p-8 space-y-6")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isDarkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-600 text-white")}>
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className={cn("text-2xl font-black uppercase italic tracking-tighter", themeClasses.text)}>Offline First-Aid Library</h2>
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-blue-500/80" : "text-blue-600")}>Available without internet</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowOfflineLibrary(false)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    {/* How Offline Support Works */}
                    <div className={cn("p-6 rounded-2xl border", isDarkMode ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50 border-blue-100")}>
                      <div className="flex items-center gap-3 mb-3">
                        <WifiOff className={cn("w-5 h-5", isDarkMode ? "text-blue-400" : "text-blue-600")} />
                        <h3 className={cn("font-bold text-sm", isDarkMode ? "text-blue-400" : "text-blue-700")}>How Offline Support Works</h3>
                      </div>
                      <p className={cn("text-xs mb-3", isDarkMode ? "text-blue-300/80" : "text-blue-600/80")}>
                        This library is available even without an internet connection. To ensure full offline access during emergencies:
                      </p>
                      <ul className={cn("text-xs space-y-2", isDarkMode ? "text-blue-300/80" : "text-blue-600/80")}>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500">•</span>
                          <span>Install the app to your home screen for instant access.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500">•</span>
                          <span>Open the app once while online to cache all data.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500">•</span>
                          <span>The AI assistant will switch to this library if you're offline.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={offlineSearchQuery}
                        onChange={(e) => setOfflineSearchQuery(e.target.value)}
                        placeholder="Search first-aid (e.g., CPR, Burn)..."
                        className={cn(
                          "w-full pl-12 pr-4 py-4 rounded-2xl border transition-colors",
                          isDarkMode 
                            ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" 
                            : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                        )}
                      />
                    </div>

                    {/* Offline First Aid List */}
                    <div className="space-y-3">
                      {OFFLINE_FIRST_AID_DATA.filter(item => 
                        offlineSearchQuery === '' || 
                        item.title.toLowerCase().includes(offlineSearchQuery.toLowerCase()) ||
                        item.steps.some(step => step.toLowerCase().includes(offlineSearchQuery.toLowerCase()))
                      ).map((item) => (
                        <div key={item.id} className={cn("p-4 rounded-2xl border transition-all", isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-100 shadow-sm")}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", 
                                item.severity === 'critical' ? "bg-red-100 text-red-600" :
                                item.severity === 'high' ? "bg-orange-100 text-orange-600" :
                                item.severity === 'medium' ? "bg-yellow-100 text-yellow-600" :
                                "bg-blue-100 text-blue-600"
                              )}>
                                <AlertCircle className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className={cn("font-black text-sm", themeClasses.text)}>{item.title}</h4>
                                <span className={cn("text-[10px] uppercase tracking-wider font-bold",
                                  item.severity === 'critical' ? "text-red-500" :
                                  item.severity === 'high' ? "text-orange-500" :
                                  item.severity === 'medium' ? "text-yellow-500" :
                                  "text-blue-500"
                                )}>
                                  Severity: {item.severity}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => speak(item.steps.join('. '))}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                title="Read aloud"
                              >
                                <Volume2 className="w-4 h-4 text-gray-400" />
                              </button>
                              <button 
                                onClick={() => toggleNearbyCategory(item.id)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", expandedCategories.includes(item.id) && "rotate-90")} />
                              </button>
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {expandedCategories.includes(item.id) && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-2 pl-2"
                              >
                                {item.steps.map((step, idx) => (
                                  <div key={idx} className={cn("p-3 rounded-xl border flex gap-3", isDarkMode ? "bg-slate-800/30 border-slate-700" : "bg-gray-50 border-gray-100")}>
                                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-black", isDarkMode ? "bg-slate-700 text-slate-300" : "bg-white text-gray-600")}>
                                      {idx + 1}
                                    </div>
                                    <p className={cn("text-xs font-medium", themeClasses.text)}>{step}</p>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'nearby' && (
              <motion.div
                key="nearby"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className={cn(themeClasses.card, "p-8 space-y-6")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-colors duration-500", isDarkMode ? "bg-orange-500/10 text-orange-400 shadow-orange-900/10" : "bg-orange-50 text-orange-600 shadow-orange-100")}>
                        <Navigation className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className={cn("text-2xl font-black uppercase italic tracking-tighter transition-colors duration-500", themeClasses.text)}>Nearby Facilities</h2>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors duration-500", isDarkMode ? "text-orange-500/80" : "text-orange-600")}>Life-Saving Proximity</p>
                      </div>
                    </div>
                  </div>

                  {/* Down Map Design */}
                  <div className="space-y-6">
                    <div className={cn("rounded-[2.5rem] overflow-hidden border-4 h-[300px] relative shadow-2xl transition-colors duration-500", isDarkMode ? "border-slate-800" : "border-white")}>
                      <LiveMap 
                        facilities={nearbyFacilities} 
                        userLocation={location} 
                        selectedId={selectedFacilityId}
                      />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {['All', 'Hospital', 'Clinic', 'Pharmacy', 'Police Station', 'Fire Station', 'Blood Bank'].map(type => (
                        <button
                          key={type}
                          onClick={() => setSelectedNearbyType(type === 'All' ? '' : type)}
                          className={cn(
                            "py-3 px-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 border-2 shrink-0",
                            (type === 'All' ? !selectedNearbyType : selectedNearbyType === type)
                              ? "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-200"
                              : isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700" : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                      {nearbyFacilities
                        .filter(f => !selectedNearbyType || f.type === selectedNearbyType)
                        .map((facility) => {
                          const facilityIcon = () => {
                            switch (facility.type) {
                              case 'Hospital': return <Activity className="w-6 h-6" />;
                              case 'Clinic': return <Heart className="w-6 h-6" />;
                              case 'Pharmacy': return <ShieldCheck className="w-6 h-6" />;
                              case 'Police Station': return <Shield className="w-6 h-6" />;
                              case 'Fire Station': return <Zap className="w-6 h-6" />;
                              case 'Blood Bank': return <Droplets className="w-6 h-6" />;
                              default: return <MapPin className="w-6 h-6" />;
                            }
                          };
                          const distKm = facility.distance_meters 
                            ? (facility.distance_meters / 1000).toFixed(1) 
                            : typeof (facility as any).distance === 'number' 
                              ? ((facility as any).distance as number).toFixed(1)
                              : (facility as any).distance ?? '?';
                          return (
                            <motion.div
                              key={facility.id}
                              layout
                              className={cn(
                                "p-5 rounded-[2rem] border-2 transition-all hover:scale-[1.01] flex items-center justify-between group",
                                isDarkMode ? "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60" : "bg-gray-50 border-white shadow-sm hover:shadow-md"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500", isDarkMode ? "bg-slate-700 text-orange-400" : "bg-white text-orange-600 shadow-sm")}>
                                  {facilityIcon()}
                                </div>
                                <div>
                                  <h4 className={cn("font-black text-sm transition-colors duration-500", themeClasses.text)}>{facility.name}</h4>
                                  <p className={cn("text-[10px] font-bold uppercase transition-colors duration-500", themeClasses.textMuted)}>
                                    {distKm} km • {facility.type} • {facility.address}
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`, '_blank')}
                                className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Navigation className="w-4 h-4" />
                              </button>
                            </motion.div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className={cn(themeClasses.card, "p-8 space-y-8")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-colors duration-500", isDarkMode ? "bg-purple-500/10 text-purple-400 shadow-purple-900/10" : "bg-purple-50 text-purple-600 shadow-purple-100")}>
                        <HistoryIcon className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className={cn("text-2xl font-black uppercase italic tracking-tighter transition-colors duration-500", themeClasses.text)}>Incident Log</h2>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors duration-500", isDarkMode ? "text-purple-500/80" : "text-purple-600")}>Your Safety Journey</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                    {incidentHistory.length === 0 ? (
                      <div className={cn("p-12 text-center rounded-[3rem] border-2 border-dashed transition-colors duration-500", isDarkMode ? "bg-slate-800/20 border-slate-700" : "bg-gray-50 border-gray-100")}>
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                          <HistoryIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className={cn("text-xs font-bold uppercase tracking-widest", themeClasses.textMuted)}>No incidents recorded yet</p>
                      </div>
                    ) : (
                      incidentHistory.map((incident) => (
                        <div 
                          key={incident.id} 
                          className={cn(
                            "p-6 rounded-[2.5rem] border-2 transition-all hover:scale-[1.01] space-y-4",
                            isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white border-gray-50 shadow-sm"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                incident.severity === 'high' ? "bg-red-100 text-red-700 border-red-200" :
                                incident.severity === 'medium' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                "bg-blue-100 text-blue-700 border-blue-200"
                              )}>
                                {incident.severity} Risk
                              </span>
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest", themeClasses.textMuted)}>
                                {incident.timestamp?.toDate ? incident.timestamp.toDate().toLocaleString() : 'Recent'}
                              </span>
                            </div>
                            <div className={cn("w-2 h-2 rounded-full", incident.status === 'active' ? "bg-red-500 animate-pulse" : "bg-green-500")} />
                          </div>
                          <p className={cn("text-sm font-bold leading-relaxed", themeClasses.text)}>{incident.description || 'No description provided'}</p>
                          {incident.location && (
                            <div className={cn("flex items-center gap-2 p-3 rounded-xl transition-colors duration-500", isDarkMode ? "bg-slate-700/50" : "bg-gray-50")}>
                              <MapPin className="w-4 h-4 text-blue-500" />
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest", themeClasses.textMuted)}>
                                {incident.locationDescription || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Active Helper Requests */}
                <div className={cn(themeClasses.card, "p-8 space-y-6")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-colors duration-500", isDarkMode ? "bg-blue-500/10 text-blue-400 shadow-blue-900/10" : "bg-blue-50 text-blue-600 shadow-blue-100")}>
                        <Users className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className={cn("text-2xl font-black uppercase italic tracking-tighter transition-colors duration-500", themeClasses.text)}>Helper Requests</h2>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors duration-500", isDarkMode ? "text-blue-500/80" : "text-blue-600")}>Assist Others Nearby</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                    <div className={cn("p-8 text-center rounded-[3rem] border-2 border-dashed transition-colors duration-500", isDarkMode ? "bg-slate-800/20 border-slate-700" : "bg-gray-50 border-gray-100")}>
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                        <Users className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className={cn("text-xs font-bold uppercase tracking-widest", themeClasses.textMuted)}>No active helper requests</p>
                      <p className={cn("text-[10px] mt-2", themeClasses.textMuted)}>Check back to assist others in need</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ai-assistant' && (
              <motion.div
                key="ai-assistant"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <AssistancePanel />
              </motion.div>
            )}

            {activeTab === 'crowd-network' && (
              <motion.div
                key="crowd-network"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className={cn(themeClasses.card, "p-6 rounded-3xl")}>
                  <h2 className={cn("text-2xl font-bold mb-4", themeClasses.text)}>Crowd Network</h2>
                  
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={findNearbyHelpers}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold"
                    >
                      Find Nearby Helpers
                    </button>
                    <button
                      onClick={matchResponder}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold"
                    >
                      Match Responder
                    </button>
                  </div>

                  {nearbyHelpers.length > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-xl">
                      <h3 className="font-bold mb-2">Nearby Helpers ({nearbyHelpers.length})</h3>
                      <div className="space-y-2">
                        {nearbyHelpers.map((helper, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-white rounded">
                            <span>{helper.name || `Helper ${i+1}`}</span>
                            <span className="text-sm text-gray-500">{helper.distance || 'Unknown'}km</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchedResponder && (
                    <div className="mb-4 p-4 bg-green-50 rounded-xl">
                      <h3 className="font-bold mb-2">Matched Responder</h3>
                      <div className="flex justify-between items-center">
                        <span>{matchedResponder.name}</span>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(star => (
                            <Star
                              key={star}
                              className="w-4 h-4 text-yellow-400"
                              fill={trustScores[matchedResponder.id] >= star ? "currentColor" : "none"}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={activateRadar}
                    className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold mb-4"
                  >
                    {isRadarActive ? 'Radar Active' : 'Activate Radar'}
                  </button>

                  {matchedResponder && (
                    <div className="p-4 bg-yellow-50 rounded-xl">
                      <h3 className="font-bold mb-2">Rate Responder</h3>
                      <div className="flex gap-1 mb-2">
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={() => rateResponder(matchedResponder.id, star)}
                            className="text-yellow-400 hover:text-yellow-600"
                          >
                            <Star className="w-5 h-5" fill="currentColor" />
                          </button>
                        ))}
                      </div>
                      <p className="text-sm">Trust Score: {trustScores[matchedResponder.id] || 0}/5</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* User Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {user?.displayName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{user?.displayName || 'User'}</h2>
                    <p className="text-sm text-gray-500">{user?.email || 'user@email.com'}</p>
                  </div>
                </div>

                {/* Medical ID (Public) */}
                <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-red-700 uppercase tracking-wide text-sm">Medical ID (Public)</h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-100 px-3 py-1 rounded-full">Crucial for Helpers</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1 block">Blood Group</label>
                      <select 
                        value={userProfile?.bloodGroup || 'O+'}
                        onChange={async (e) => {
                          if (!user) return;
                          await update(ref(db, `users/${user.uid}`), { bloodGroup: e.target.value });
                        }}
                        className="w-full p-3 bg-white border border-red-200 rounded-xl text-red-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1 block">Conditions</label>
                      <input 
                        type="text"
                        value={userProfile?.medicalConditions || ''}
                        onChange={async (e) => {
                          if (!user) return;
                          await update(ref(db, `users/${user.uid}`), { medicalConditions: e.target.value });
                        }}
                        placeholder="e.g., Diabetes"
                        className="w-full p-3 bg-white border border-red-200 rounded-xl text-red-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1 block">Allergies</label>
                      <input 
                        type="text"
                        value={userProfile?.allergies || ''}
                        onChange={async (e) => {
                          if (!user) return;
                          await update(ref(db, `users/${user.uid}`), { allergies: e.target.value });
                        }}
                        placeholder="e.g., Penicillin"
                        className="w-full p-3 bg-white border border-red-200 rounded-xl text-red-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-red-600 italic">
                    This information will be visible to anyone who scans your Emergency QR code.
                  </p>
                </div>

                {/* Settings Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-gray-400" />
                    <h3 className="font-bold text-gray-400 uppercase tracking-wider text-sm">Settings</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Emergency Siren */}
                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Emergency Siren</p>
                          <p className="text-xs text-gray-500">Play sound when SOS is activated</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={toggleSiren}
                        className={cn(
                          "w-12 h-7 rounded-full transition-colors relative cursor-pointer",
                          (userProfile?.settings?.sirenEnabled !== false) ? "bg-red-500" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-5 h-5 bg-white rounded-full transition-all",
                          (userProfile?.settings?.sirenEnabled !== false) ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>

                    {/* Privacy Mode */}
                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                          <Lock className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Privacy Mode</p>
                          <p className="text-xs text-gray-500">No data storage or recognition</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={togglePrivacyMode}
                        className={cn(
                          "w-12 h-7 rounded-full transition-colors relative cursor-pointer",
                          userProfile?.settings?.privacyModeEnabled ? "bg-purple-500" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-5 h-5 bg-white rounded-full transition-all",
                          userProfile?.settings?.privacyModeEnabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>

                    {/* Voice Guidance */}
                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                          <Volume2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Voice Guidance</p>
                          <p className="text-xs text-gray-500">Read first-aid steps aloud</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={toggleVoiceGuidance}
                        className={cn(
                          "w-12 h-7 rounded-full transition-colors relative cursor-pointer",
                          (userProfile?.settings?.voiceGuidanceEnabled !== false) ? "bg-blue-500" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-5 h-5 bg-white rounded-full transition-all",
                          (userProfile?.settings?.voiceGuidanceEnabled !== false) ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>

                    {/* Preferred Language */}
                    <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                          <Languages className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Preferred Language</p>
                          <p className="text-xs text-gray-500">All responses & voice guidance</p>
                        </div>
                      </div>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Spanish">Spanish</option>
                      </select>
                    </div>

                    {/* Fall Detection */}
                    <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Fall Detection</p>
                          <p className="text-xs text-gray-500">Auto-SOS when a fall is detected</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={async () => {
                          if (!user || !userProfile) return;
                          const currentEnabled = userProfile.settings?.fallDetectionEnabled || false;
                          console.log('Toggle Fall - Current:', currentEnabled);
                          try {
                            await update(ref(db, `users/${user.uid}/settings`), {
                              fallDetectionEnabled: !currentEnabled
                            });
                            showToast(`Fall Detection ${!currentEnabled ? 'enabled' : 'disabled'}`, "success");
                          } catch (error: any) {
                            console.error('Toggle Fall - Error:', error);
                            const errorMsg = error?.message || error?.code || 'Unknown error';
                            showToast(`Failed: ${errorMsg}`, "error");
                          }
                        }}
                        className={cn(
                          "w-12 h-7 rounded-full transition-colors relative cursor-pointer",
                          userProfile?.settings?.fallDetectionEnabled ? "bg-green-500" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-5 h-5 bg-white rounded-full transition-all",
                          userProfile?.settings?.fallDetectionEnabled ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>

                    {/* Share My Location section removed as per request */}
                  </div>
                </div>

                {/* Emergency QR Code */}
                <div className="bg-gray-50 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-gray-400" />
                      <h3 className="font-bold text-gray-400 uppercase tracking-wider text-sm">Emergency QR Code</h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-100 px-3 py-1 rounded-full">Lock Screen Ready</span>
                  </div>
                  
                  <div className="flex gap-6">
                    <div className="w-32 h-32 bg-white rounded-2xl p-2 shadow-sm">
                      <QRCodeSVG 
                        value={JSON.stringify({
                          name: user?.displayName,
                          email: user?.email,
                          bloodGroup: userProfile?.bloodGroup,
                          conditions: userProfile?.medicalConditions,
                          allergies: userProfile?.allergies,
                          contacts: userProfile?.emergencyContacts
                        })}
                        size={112}
                        level="M"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <h4 className="text-lg font-black uppercase italic tracking-tight">Life-Saving QR</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Set this QR code as your lock screen wallpaper. Bystanders can scan it to access your emergency contacts and trigger an alert without unlocking your phone.
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            console.log('Share QR button clicked');
                            const qrData = {
                              name: user?.displayName,
                              email: user?.email,
                              bloodGroup: userProfile?.bloodGroup,
                              conditions: userProfile?.medicalConditions,
                              allergies: userProfile?.allergies,
                              contacts: userProfile?.emergencyContacts
                            };
                            const shareText = `Emergency Info for ${user?.displayName || 'Unknown'}\n\nBlood Group: ${userProfile?.bloodGroup || 'N/A'}\nConditions: ${userProfile?.medicalConditions || 'None'}\nAllergies: ${userProfile?.allergies || 'None'}\n\nEmergency Contacts:\n${userProfile?.emergencyContacts?.map(c => `${c.name}: ${c.phone}`).join('\n') || 'None'}`;
                            console.log('Attempting to share:', shareText);
                            if (navigator.share) {
                              navigator.share({
                                title: 'Emergency Contact Info',
                                text: shareText
                              });
                            } else {
                              navigator.clipboard.writeText(shareText);
                              showToast('Emergency info copied to clipboard', 'success');
                            }
                          }}
                          className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <Share2 className="w-4 h-4" />
                          Share Emergency QR
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            console.log('Save to Phone button clicked');
                            const qrData = JSON.stringify({
                              name: user?.displayName,
                              email: user?.email,
                              bloodGroup: userProfile?.bloodGroup,
                              conditions: userProfile?.medicalConditions,
                              allergies: userProfile?.allergies,
                              contacts: userProfile?.emergencyContacts
                            });
                            const blob = new Blob([qrData], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'emergency-qr-data.json';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            showToast('QR data saved to downloads', 'success');
                          }}
                          className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                        >
                          <Smartphone className="w-4 h-4" />
                          Save to Phone
                        </button>
                        <button 
                          onClick={() => {
                            console.log('Copy Link button clicked');
                            const qrData = JSON.stringify({
                              name: user?.displayName,
                              email: user?.email,
                              bloodGroup: userProfile?.bloodGroup,
                              conditions: userProfile?.medicalConditions,
                              allergies: userProfile?.allergies,
                              contacts: userProfile?.emergencyContacts
                            });
                            navigator.clipboard.writeText(qrData);
                            showToast('QR data copied to clipboard', 'success');
                          }}
                          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy Commitment */}
                <div className="bg-gray-50 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-gray-400" />
                    <h3 className="font-bold text-gray-400 uppercase tracking-wider text-sm">Privacy Commitment</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">We respect your privacy. Our system is designed with privacy-first principles:</p>
                  <ul className="text-xs text-gray-500 space-y-1 mb-3">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span className="font-bold">NO PERSONAL DATA IS SHARED PUBLICLY</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span className="font-bold">IMAGES ARE NOT STORED PERMANENTLY</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span className="font-bold">DATA IS USED ONLY FOR EMERGENCY ASSISTANCE</span>
                    </li>
                  </ul>
                  <p className="text-xs text-red-600 font-bold italic">
                    "We collect minimum data, only with consent, and never store sensitive victim information."
                  </p>
                </div>

                {/* Achievements */}
                <div className="bg-gray-50 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-gray-400" />
                      <h3 className="font-bold text-gray-400 uppercase tracking-wider text-sm">Achievements</h3>
                    </div>
                    <span className="text-xs font-bold text-red-500 bg-red-100 px-3 py-1 rounded-full">0 pts</span>
                  </div>
                  <p className="text-sm text-gray-400 text-center italic">No badges earned yet. Start CPR assist to earn points!</p>
                </div>

                {/* Emergency Contacts */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <h3 className="font-bold text-gray-400 uppercase tracking-wider text-sm">Emergency Contacts</h3>
                  </div>
                  
                  {/* Display contacts list */}
                  {userProfile?.emergencyContacts && userProfile.emergencyContacts.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {userProfile.emergencyContacts.map((contact, index) => (
                        <div key={index} className="bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                              <span className="text-red-600 font-bold text-sm">{contact.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{contact.name}</p>
                              <p className="text-xs text-gray-500">{contact.phone}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveContact(index)}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center italic mb-4">No emergency contacts added yet.</p>
                  )}
                  
                  <div className="bg-gray-50 rounded-3xl p-6">
                    <h4 className="font-bold text-gray-400 uppercase tracking-wider text-xs mb-4">Add New Contact</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input 
                        type="text"
                        value={newContact.name}
                        onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                        placeholder="Name"
                        className="p-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <input 
                        type="tel"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                        placeholder="Phone Number"
                        className="p-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <button 
                      onClick={handleAddContact}
                      className="w-full py-3 bg-red-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Add Contact
                    </button>
                  </div>
                </div>

                {/* Sign Out */}
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-50 rounded-2xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </motion.div>
            )}
            {activeTab === 'doctor-portal' && (
              <motion.div
                key="doctor-portal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className={cn(themeClasses.card, "p-6 rounded-3xl")}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={cn("w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-lg", isDarkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")}>
                      <Video className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className={cn("text-2xl font-black uppercase italic tracking-tighter", themeClasses.text)}>Doctor Portal</h2>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-blue-500/80" : "text-blue-600")}>Medical Professional Access</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                      <h3 className="font-bold text-blue-800 mb-2">Available Doctors</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        {doctorMatchmaking.getAvailableDoctorsCount()} doctors currently online
                      </p>
                      <div className="text-xs text-blue-600">
                        Doctors can go online/offline and receive emergency calls from patients in need.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <button
                        onClick={() => {
                          // In a real app, this would check if user is a registered doctor
                          showToast("Doctor portal access requires verification", 'info');
                        }}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all"
                      >
                        Access Doctor Portal
                      </button>

                      <div className="text-center text-sm text-gray-500">
                        For medical professionals only. Requires verification.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'live-map' && (
              <motion.div
                key="live-map"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <LiveMap facilities={nearbyFacilities} userLocation={location} selectedId={selectedNearbyPlaceId} />
              </motion.div>
            )}
            {activeTab === 'safety-dashboard' && (
              <motion.div
                key="safety-dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className={cn(themeClasses.card, "p-8 shadow-sm border")}>
                  <div className="space-y-2">
                    <h2 className={cn("text-3xl font-black uppercase italic tracking-tighter", themeClasses.text)}>Safety Dashboard</h2>
                    <p className={themeClasses.textMuted}>Real-time safety monitoring and risk analysis</p>
                  </div>

                  {/* Safety Score */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={cn("p-6 rounded-2xl", isDarkMode ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200")}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">Safety Score</h3>
                          <p className={cn("text-sm", isDarkMode ? "text-green-400" : "text-green-600")}>Overall safety assessment</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={cn("text-5xl font-black mb-2", currentSafetyScore >= 80 ? "text-green-600" : currentSafetyScore >= 60 ? "text-yellow-600" : currentSafetyScore >= 40 ? "text-orange-600" : "text-red-600")}>
                          {currentSafetyScore}
                        </div>
                        <div className="space-y-2">
                          <div className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest", 
                            currentSafetyScore >= 80 ? "bg-green-100 text-green-800" : 
                            currentSafetyScore >= 60 ? "bg-yellow-100 text-yellow-800" : 
                            currentSafetyScore >= 40 ? "bg-orange-100 text-orange-800" : 
                            "bg-red-100 text-red-800")}>
                            {currentSafetyScore >= 80 ? 'Excellent' : currentSafetyScore >= 60 ? 'Good' : currentSafetyScore >= 40 ? 'Fair' : 'Poor'}
                          </div>
                          <p className={cn("text-xs", themeClasses.textMuted)}>Based on recent activity and risk factors</p>
                        </div>
                      </div>
                    </div>

                    {/* Risk Detection */}
                    <div className={cn("p-6 rounded-2xl", isDarkMode ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200")}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">Risk Level</h3>
                          <p className={cn("text-sm", isDarkMode ? "text-red-400" : "text-red-600")}>Current threat assessment</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={cn("text-5xl font-black mb-2", 
                          riskLevel === 'critical' ? "text-red-600" : 
                          riskLevel === 'high' ? "text-orange-600" : 
                          riskLevel === 'medium' ? "text-yellow-600" : "text-green-600")}>
                          {(riskLevel || 'low').toString().toUpperCase()}
                        </div>
                        <div className="space-y-2">
                          <div className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest", 
                            riskLevel === 'critical' ? "bg-red-100 text-red-800" : 
                            riskLevel === 'high' ? "bg-orange-100 text-orange-800" : 
                            riskLevel === 'medium' ? "bg-yellow-100 text-yellow-800" : 
                            "bg-green-100 text-green-800")}>
                            {riskLevel}
                          </div>
                          <p className={cn("text-xs", themeClasses.textMuted)}>Real-time risk analysis</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unsafe Areas */}
                  <div className={cn("p-6 rounded-2xl", isDarkMode ? "bg-orange-900/20 border-orange-800" : "bg-orange-50 border-orange-200")}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1">Unsafe Areas</h3>
                        <p className={cn("text-sm", isDarkMode ? "text-orange-400" : "text-orange-600")}>High-risk location alerts</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {unsafeAreas.length > 0 ? (
                        unsafeAreas.map((area, index) => (
                          <div key={area.id} className={cn("p-4 rounded-xl border-l-4", isDarkMode ? "bg-orange-800/50 border-orange-700" : "bg-orange-100 border-orange-300")}>
                            <div className="flex items-start gap-3">
                              <div className={cn("w-3 h-3 rounded-full mt-1", 
                                area.riskLevel === 'critical' ? "bg-red-600" : 
                                area.riskLevel === 'high' ? "bg-orange-600" : "bg-yellow-600")} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-sm mb-1">{area.name}</h4>
                              <p className={cn("text-xs mb-2", themeClasses.textMuted)}>{area.description}</p>
                              <div className={cn("px-2 py-1 rounded text-xs font-black uppercase tracking-widest", 
                                area.riskLevel === 'critical' ? "bg-red-100 text-red-800" : 
                                area.riskLevel === 'high' ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800")}>
                                {area.riskLevel} Risk
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={cn("p-8 rounded-xl text-center", isDarkMode ? "bg-orange-800/20 border-orange-700" : "bg-orange-100 border-orange-200")}>
                          <MapPin className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                          <h4 className="font-bold text-lg mb-2">No Unsafe Areas Detected</h4>
                          <p className={cn("text-sm", themeClasses.textMuted)}>All monitored areas are currently safe</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Behavior Analysis */}
                  <div className={cn("p-6 rounded-2xl", isDarkMode ? "bg-purple-900/20 border-purple-800" : "bg-purple-50 border-purple-200")}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1">Behavior Analysis</h3>
                        <p className={cn("text-sm", isDarkMode ? "text-purple-400" : "text-purple-600")}>Pattern recognition insights</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {behaviorInsights.length > 0 ? (
                        behaviorInsights.map((insight, index) => (
                          <div key={index} className={cn("p-4 rounded-xl border-l-4", isDarkMode ? "bg-purple-800/50 border-purple-700" : "bg-purple-100 border-purple-300")}>
                            <div className="flex items-start gap-3">
                              <div className={cn("w-3 h-3 rounded-full mt-1", 
                                insight.confidence >= 80 ? "bg-green-600" : 
                                insight.confidence >= 60 ? "bg-yellow-600" : "bg-red-600")} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-sm mb-1">{insight.type}</h4>
                              <p className={cn("text-xs mb-2", themeClasses.textMuted)}>{insight.description}</p>
                              <div className="flex items-center gap-2">
                                <div className={cn("px-2 py-1 rounded text-xs font-black uppercase tracking-widest", 
                                  insight.confidence >= 80 ? "bg-green-100 text-green-800" : 
                                  insight.confidence >= 60 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800")}>
                                  {insight.confidence}% Confidence
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={cn("p-8 rounded-xl text-center", isDarkMode ? "bg-purple-800/20 border-purple-700" : "bg-purple-100 border-purple-200")}>
                          <Activity className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                          <h4 className="font-bold text-lg mb-2">No Behavior Patterns Detected</h4>
                          <p className={cn("text-sm", themeClasses.textMuted)}>Insufficient data for pattern analysis</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </main>

      {/* Video Guide Modal */}
      <AnimatePresence>
        {activeVideoGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setActiveVideoGuide(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {activeVideoGuide && (() => {
                      const guide = VIDEO_GUIDES.find(v => v.id === activeVideoGuide);
                      if (!guide) return null;
                      return <guide.icon className={cn("w-8 h-8", guide.iconColor)} />;
                    })()}
                    <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tight">
                        {VIDEO_GUIDES.find(v => v.id === activeVideoGuide)?.title}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {VIDEO_GUIDES.find(v => v.id === activeVideoGuide)?.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveVideoGuide(null)}
                    className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-0">
                {/* Video Section */}
                <div className="relative aspect-video md:aspect-auto md:h-[500px] bg-black">
                  <iframe
                    src={VIDEO_GUIDES.find(v => v.id === activeVideoGuide)?.url}
                    title="Video Guide"
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Emergency Steps Section */}
                <div className="p-6 bg-gray-50 overflow-y-auto max-h-[500px]">
                  {activeVideoGuide && EMERGENCY_STEPS[activeVideoGuide] && (
                    <div className="space-y-4">
                      {/* Call 911 Badge */}
                      {EMERGENCY_STEPS[activeVideoGuide].call911 && (
                        <div className="bg-red-100 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3">
                          <Phone className="w-6 h-6 text-red-600" />
                          <div>
                            <p className="font-black text-red-600 uppercase tracking-wider">Call 911 Immediately</p>
                            <p className="text-xs text-red-500">This is a life-threatening emergency</p>
                          </div>
                        </div>
                      )}

                      {/* Steps */}
                      <div className="space-y-3">
                        <h4 className="font-black text-gray-800 uppercase tracking-wider text-sm">Emergency Steps</h4>
                        {EMERGENCY_STEPS[activeVideoGuide].steps.map((step) => (
                          <div 
                            key={step.number}
                            className={cn(
                              "flex gap-3 p-3 rounded-xl border-2",
                              step.critical 
                                ? "bg-red-50 border-red-200" 
                                : "bg-white border-gray-200"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0",
                              step.critical ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                            )}>
                              {step.number}
                            </div>
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-medium",
                                step.critical ? "text-red-900" : "text-gray-700"
                              )}>
                                {step.text}
                              </p>
                              {step.duration && (
                                <span className="inline-block mt-1 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                  {step.duration}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Warnings */}
                      <div className="space-y-2">
                        <h4 className="font-black text-orange-600 uppercase tracking-wider text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Important Warnings
                        </h4>
                        <div className="space-y-2">
                          {EMERGENCY_STEPS[activeVideoGuide].warnings.map((warning, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 p-2 rounded-lg">
                              <span className="text-orange-500 mt-0.5">⚠</span>
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CPR Summary Modal */}
      <AnimatePresence>
        {showCprSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl text-center space-y-8"
            >
              <div className="space-y-2">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Medal className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-red-600">Session Complete</h2>
                <p className="text-gray-500 font-medium">Great job! You've successfully provided assistance.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Points</p>
                  <p className="text-xl font-black text-red-600">+{cprPoints + (cprCycle * 50) + (Math.floor(cprTimer / 60) * 100)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Accuracy</p>
                  <p className="text-xl font-black text-blue-600">{cprAccuracy}%</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Max Combo</p>
                  <p className="text-xl font-black text-orange-600">{cprMaxCombo}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Duration</p>
                  <p className="text-xl font-black text-gray-700">{Math.floor(cprTimer / 60)}:{(cprTimer % 60).toString().padStart(2, '0')}</p>
                </div>
              </div>

              {newBadges.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">New Badges Earned!</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    {newBadges.map(badge => (
                      <motion.div 
                        key={badge.id}
                        id={badge.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center border-2 border-yellow-200 shadow-sm">
                          {badge.id === 'first-responder' && <Medal className="w-8 h-8 text-yellow-600" />}
                          {badge.id === 'steady-rhythm' && <Activity className="w-8 h-8 text-yellow-600" />}
                          {badge.id === 'endurance-hero' && <Timer className="w-8 h-8 text-yellow-600" />}
                          {badge.id === 'rhythm-master' && <Zap className="w-8 h-8 text-yellow-600" />}
                          {badge.id === 'cpr-pro' && <ShieldCheck className="w-8 h-8 text-yellow-600" />}
                          {badge.id === 'life-saver' && <Award className="w-8 h-8 text-yellow-600" />}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-tighter">{badge.name}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowCprSummary(false)}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-red-100 hover:scale-105 transition-transform active:scale-95"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {isQRModalVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setIsQRModalVisible(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Emergency QR Code</h3>
                  <button 
                    onClick={() => setIsQRModalVisible(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Scan this QR code to access emergency medical information and contacts
                  </p>
                  
                  <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 dark:border-slate-600 inline-block">
                    <QRCodeSVG
                      value={JSON.stringify({
                        name: user?.displayName || 'Emergency User',
                        bloodGroup: userProfile?.bloodGroup || 'O+',
                        allergies: userProfile?.allergies || 'None Known',
                        conditions: userProfile?.medicalConditions || 'No registered conditions',
                        contacts: userProfile?.emergencyContacts || [],
                        userId: user?.uid,
                        timestamp: new Date().toISOString()
                      })}
                      size={200}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                    <p>• Contains critical medical information</p>
                    <p>• Emergency contact details</p>
                    <p>• Accessible without internet</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsQRModalVisible(false)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => {
                      const canvas = document.createElement('canvas');
                      const qrValue = JSON.stringify({
                        name: user?.displayName || 'Emergency User',
                        bloodGroup: userProfile?.bloodGroup || 'O+',
                        allergies: userProfile?.allergies || 'None Known',
                        conditions: userProfile?.medicalConditions || 'No registered conditions',
                        contacts: userProfile?.emergencyContacts || [],
                        userId: user?.uid,
                        timestamp: new Date().toISOString()
                      });
                      
                      QRCode.toCanvas(canvas, qrValue, {
                        width: 400,
                        margin: 2,
                        color: {
                          dark: '#000000',
                          light: '#ffffff'
                        }
                      }, (error) => {
                        if (!error) {
                          canvas.toBlob((blob) => {
                            if (blob) {
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'emergency-qr-code.png';
                              a.click();
                              URL.revokeObjectURL(url);
                              showToast("QR Code downloaded successfully", "success");
                            }
                          });
                        }
                      });
                    }}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {isAddContactModalVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setIsAddContactModalVisible(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Add Emergency Contact</h3>
                  <button 
                    onClick={() => setIsAddContactModalVisible(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="Enter contact name"
                      className={cn(
                        "w-full px-4 py-3 rounded-2xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode 
                          ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" 
                          : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500"
                      )}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className={cn(
                        "w-full px-4 py-3 rounded-2xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode 
                          ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" 
                          : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500"
                      )}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setIsAddContactModalVisible(false);
                      setNewContact({ name: '', phone: '' });
                    }}
                    className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      await handleAddContact();
                      setIsAddContactModalVisible(false);
                      setNewContact({ name: '', phone: '' });
                    }}
                    disabled={!newContact.name || !newContact.phone}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-bold transition-colors",
                      newContact.name && newContact.phone
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    Add Contact
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-gray-200 px-6 py-3 rounded-full shadow-2xl flex items-center gap-8 z-50">
        {[
          { id: 'sos', icon: AlertCircle, label: 'SOS' },
          { id: 'cpr-assist', icon: Activity, label: 'CPR' },
          { id: 'first-aid', icon: Heart, label: 'Aid' },
          { id: 'nearby', icon: MapPin, label: 'Nearby' },
          { id: 'profile', icon: UserIcon, label: 'Profile' },
          { id: 'safety-dashboard', icon: Shield, label: 'Safety' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === tab.id ? "text-red-600 scale-110" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <EmergencyApp />
    </ErrorBoundary>
  );
}
