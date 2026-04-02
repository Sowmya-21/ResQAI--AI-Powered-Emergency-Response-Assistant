export interface FirstAidGuideline {
  emergencyType: string;
  severity: "low" | "medium" | "high" | "critical";
  firstAidSteps: string[];
  dos: string[];
  donts: string[];
  nearbyServicesNeeded: string[];
  source: string;
}

export const FIRST_AID_KNOWLEDGE_BASE: Record<string, FirstAidGuideline> = {
  "severe_bleeding": {
    "emergencyType": "Severe Bleeding",
    "severity": "high",
    "firstAidSteps": [
      "Apply firm, direct pressure to the wound using a clean cloth or bandage.",
      "Maintain pressure until the bleeding stops.",
      "If the cloth becomes soaked, do not remove it. Add more layers on top.",
      "Elevate the injured limb above the level of the heart if possible.",
      "If bleeding is life-threatening and on a limb, apply a tourniquet if trained."
    ],
    "dos": [
      "Use clean materials",
      "Keep the person calm",
      "Call emergency services immediately"
    ],
    "donts": [
      "Do not remove embedded objects",
      "Do not wash a severe wound",
      "Do not remove original bandages"
    ],
    "nearbyServicesNeeded": ["Ambulance", "Trauma Center"],
    "source": "Red Cross Guidelines"
  },
  "choking": {
    "emergencyType": "Choking (Adult/Child)",
    "severity": "critical",
    "firstAidSteps": [
      "Give 5 back blows: Strike the person between the shoulder blades with the heel of your hand.",
      "Give 5 abdominal thrusts (Heimlich maneuver).",
      "Repeat 5 and 5 until the object is forced out or the person becomes unconscious.",
      "If unconscious, start CPR immediately."
    ],
    "dos": [
      "Encourage coughing if they can breathe",
      "Stand behind the person for thrusts",
      "Call 911 if they can't breathe"
    ],
    "donts": [
      "Do not give water",
      "Do not try to reach for the object unless visible",
      "Do not slap their back if they are coughing strongly"
    ],
    "nearbyServicesNeeded": ["Ambulance"],
    "source": "Red Cross Guidelines"
  },
  "unconscious_cpr": {
    "emergencyType": "Unconscious / Cardiac Arrest",
    "severity": "critical",
    "firstAidSteps": [
      "Check the scene for safety.",
      "Check for responsiveness and breathing.",
      "Call 911 and get an AED if available.",
      "Start CPR: Push hard and fast in the center of the chest (100-120 bpm).",
      "Continue until professional help arrives or an AED is ready."
    ],
    "dos": [
      "Push at least 2 inches deep",
      "Allow full chest recoil",
      "Use an AED as soon as it arrives"
    ],
    "donts": [
      "Do not stop compressions for more than 10 seconds",
      "Do not wait for a pulse if not breathing",
      "Do not give up until help arrives"
    ],
    "nearbyServicesNeeded": ["Ambulance", "Advanced Life Support"],
    "source": "AHA / Red Cross Guidelines"
  },
  "burns": {
    "emergencyType": "Thermal Burns",
    "severity": "medium",
    "firstAidSteps": [
      "Cool the burn with cool (not cold) running water for at least 10-20 minutes.",
      "Remove jewelry or tight clothing before the area starts to swell.",
      "Cover the burn loosely with a sterile bandage or clean cloth.",
      "Seek medical attention if the burn is large, deep, or on the face/hands."
    ],
    "dos": [
      "Use cool running water",
      "Protect the area from friction",
      "Take pain relievers if needed"
    ],
    "donts": [
      "Do not apply ice directly",
      "Do not break blisters",
      "Do not apply butter, ointments, or home remedies"
    ],
    "nearbyServicesNeeded": ["Urgent Care", "Burn Center"],
    "source": "WHO First Aid Guidelines"
  },
  "fracture": {
    "emergencyType": "Possible Fracture / Broken Bone",
    "severity": "medium",
    "firstAidSteps": [
      "Keep the injured area still. Do not try to realign the bone.",
      "Apply a cold pack wrapped in a cloth to reduce swelling.",
      "Splint the injury in the position found if you must move the person.",
      "Seek professional medical help immediately."
    ],
    "dos": [
      "Control any bleeding first",
      "Immobilize the joint above and below the injury",
      "Watch for signs of shock"
    ],
    "donts": [
      "Do not move the person if a back/neck injury is suspected",
      "Do not test the bone by moving it",
      "Do not apply ice directly to skin"
    ],
    "nearbyServicesNeeded": ["Orthopedic Clinic", "ER"],
    "source": "Red Cross Guidelines"
  },
  "allergic_reaction": {
    "emergencyType": "Severe Allergic Reaction (Anaphylaxis)",
    "severity": "critical",
    "firstAidSteps": [
      "Call 911 immediately.",
      "Help the person use their epinephrine auto-injector (EpiPen) if they have one.",
      "Have the person sit up or lie down with legs elevated.",
      "Monitor breathing and pulse until help arrives."
    ],
    "dos": [
      "Note the time of injection",
      "Keep the person warm",
      "Stay with them until help arrives"
    ],
    "donts": [
      "Do not give oral medication if they are struggling to breathe",
      "Do not wait to see if symptoms improve",
      "Do not let them walk or stand"
    ],
    "nearbyServicesNeeded": ["Ambulance", "ER"],
    "source": "Red Cross Guidelines"
  },
  "seizure": {
    "emergencyType": "Seizure",
    "severity": "medium",
    "firstAidSteps": [
      "Clear the area of hard or sharp objects.",
      "Place something soft under the person's head.",
      "Turn the person gently onto one side to keep the airway clear.",
      "Time the seizure. Call 911 if it lasts more than 5 minutes."
    ],
    "dos": [
      "Stay calm and stay with the person",
      "Loosen tight clothing around the neck",
      "Note the duration and characteristics"
    ],
    "donts": [
      "Do not restrain the person",
      "Do not put anything in their mouth",
      "Do not give water or food until fully alert"
    ],
    "nearbyServicesNeeded": ["Neurology", "ER"],
    "source": "CDC / Red Cross Guidelines"
  },
  "stroke": {
    "emergencyType": "Stroke (F.A.S.T.)",
    "severity": "critical",
    "firstAidSteps": [
      "Face: Ask the person to smile. Does one side droop?",
      "Arms: Ask the person to raise both arms. Does one drift downward?",
      "Speech: Ask the person to repeat a simple phrase. Is it slurred?",
      "Time: If any of these are present, call 911 immediately.",
      "Note the time when symptoms first started."
    ],
    "dos": [
      "Keep the person calm",
      "Monitor breathing",
      "Note the exact time of onset"
    ],
    "donts": [
      "Do not give food or drink",
      "Do not give aspirin",
      "Do not wait to see if symptoms go away"
    ],
    "nearbyServicesNeeded": ["Stroke Center", "Ambulance"],
    "source": "American Stroke Association"
  },
  "general_emergency": {
    "emergencyType": "General Emergency",
    "severity": "medium",
    "firstAidSteps": [
      "Ensure the scene is safe for you and the victim.",
      "Call emergency services (911) immediately.",
      "Stay with the person and keep them calm.",
      "Monitor their breathing and level of consciousness."
    ],
    "dos": [
      "Stay on the line with dispatchers",
      "Provide clear location details",
      "Follow dispatcher instructions"
    ],
    "donts": [
      "Do not move the person unless in immediate danger",
      "Do not give medication unless directed by professionals",
      "Do not panic"
    ],
    "nearbyServicesNeeded": ["Emergency Services"],
    "source": "Standard First Aid Protocol"
  }
};
