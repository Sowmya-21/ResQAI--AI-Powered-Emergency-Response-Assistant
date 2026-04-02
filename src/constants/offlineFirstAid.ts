export interface OfflineFirstAid {
  id: string;
  title: string;
  steps: string[];
  dos: string[];
  donts: string[];
  severity: "low" | "medium" | "high" | "critical";
}

export const OFFLINE_FIRST_AID_DATA: OfflineFirstAid[] = [
  {
    id: "cpr",
    title: "CPR (Adult)",
    severity: "critical",
    steps: [
      "Check the scene for safety.",
      "Check for responsiveness (tap and shout).",
      "Call emergency services immediately.",
      "Check for breathing (no more than 10 seconds).",
      "If not breathing, start chest compressions: 30 compressions at a rate of 100-120 per minute.",
      "Push hard (at least 2 inches deep) and push fast.",
      "Give 2 rescue breaths if trained.",
      "Continue cycles of 30 compressions and 2 breaths until help arrives or an AED is available."
    ],
    dos: [
      "Push in the center of the chest.",
      "Allow full chest recoil between compressions.",
      "Minimize interruptions in compressions."
    ],
    donts: [
      "Do not stop compressions for more than 10 seconds.",
      "Do not lean on the chest between compressions."
    ]
  },
  {
    id: "choking",
    title: "Choking (Heimlich Maneuver)",
    severity: "critical",
    steps: [
      "Ask 'Are you choking?'",
      "If they can't speak or breathe, stand behind them.",
      "Wrap your arms around their waist.",
      "Make a fist and place it just above the navel.",
      "Grasp your fist with your other hand.",
      "Perform quick, upward thrusts until the object is forced out or the person becomes unconscious."
    ],
    dos: [
      "Act quickly.",
      "Keep thrusts firm and upward."
    ],
    donts: [
      "Do not give water or food.",
      "Do not slap them on the back if they are coughing forcefully."
    ]
  },
  {
    id: "bleeding",
    title: "Severe Bleeding",
    severity: "high",
    steps: [
      "Put on gloves if available.",
      "Apply direct pressure to the wound with a clean cloth or bandage.",
      "Maintain pressure until bleeding stops.",
      "If blood soaks through, add more bandages on top (do not remove the old ones).",
      "Secure the bandage with tape or a wrap.",
      "Seek medical help immediately."
    ],
    dos: [
      "Keep the limb elevated if possible.",
      "Use a tourniquet only as a last resort for life-threatening limb bleeding."
    ],
    donts: [
      "Do not remove embedded objects.",
      "Do not wash a severe wound."
    ]
  },
  {
    id: "burns",
    title: "Burns (Thermal)",
    severity: "medium",
    steps: [
      "Stop the burning process (remove from heat source).",
      "Cool the burn with cool (not cold) running water for at least 10-20 minutes.",
      "Remove jewelry or tight clothing before the area swells.",
      "Cover the burn loosely with a sterile, non-stick bandage or plastic wrap.",
      "Take over-the-counter pain relief if needed."
    ],
    dos: [
      "Use cool running water.",
      "Keep the person warm to prevent shock."
    ],
    donts: [
      "Do not use ice, butter, or ointments on the burn.",
      "Do not break blisters."
    ]
  },
  {
    id: "seizure",
    title: "Seizure",
    severity: "medium",
    steps: [
      "Keep other people out of the way.",
      "Clear the area of hard or sharp objects.",
      "Don't try to hold the person down or stop their movements.",
      "Place the person on their side to keep their airway clear.",
      "Time the seizure. If it lasts longer than 5 minutes, call emergency services.",
      "Stay with them until they are fully awake and alert."
    ],
    dos: [
      "Cushion their head.",
      "Loosen tight clothing around the neck."
    ],
    donts: [
      "Do not put anything in the person's mouth.",
      "Do not give food or water until they are fully alert."
    ]
  },
  {
    id: "fracture",
    title: "Fractures / Broken Bones",
    severity: "medium",
    steps: [
      "Do not try to realign the bone.",
      "Stop any bleeding with direct pressure.",
      "Immobilize the injured area using a splint or sling.",
      "Apply ice packs to reduce swelling (wrap in a cloth, do not apply directly to skin).",
      "Treat for shock if the person feels faint or is breathing shallowly."
    ],
    dos: [
      "Keep the injured area still.",
      "Seek medical attention."
    ],
    donts: [
      "Do not move the person if a neck or back injury is suspected.",
      "Do not test the bone by moving it."
    ]
  }
];
