import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getDatabase, ref, set, update, push, get, child, query, orderByChild, equalTo, limitToLast, onValue, off, serverTimestamp, remove } from 'firebase/database';

// Import the Firebase configuration
import firebaseConfig from './firebase-config';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  ref, 
  set, 
  update, 
  push, 
  get, 
  child, 
  query, 
  orderByChild, 
  equalTo, 
  limitToLast, 
  onValue, 
  off, 
  serverTimestamp,
  remove 
};
export type { User };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DatabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: DatabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// RTDB doesn't require complex doc()/collection() setup, just path strings.

import { SituationUnderstanding } from './features/situationUnderstanding';
import { EmergencyClassification } from './features/emergencyClassification';
import { DecisionEngine } from './features/decisionEngine';

const situationUnderstanding = new SituationUnderstanding();
const emergencyClassification = new EmergencyClassification();
const decisionEngine = new DecisionEngine();

// Example integration with voice recognition
async function handleVoiceInput(voiceInput: string) {
  console.log('Received voice input:', voiceInput);

  // Step 1: Analyze the situation
  const situation = await situationUnderstanding.analyzeSituation(voiceInput);
  console.log('Interpreted situation:', situation);

  // Step 2: Classify the emergency
  const category = await emergencyClassification.classifyEmergency(situation);
  console.log('Classified emergency category:', category);

  // Step 3: Get recommendations
  const recommendations = decisionEngine.getRecommendations(category);
  console.log('Recommended actions:', recommendations);

  // Example: Display recommendations to the user
  recommendations.forEach((action) => console.log(`- ${action}`));
}

export { handleVoiceInput };
