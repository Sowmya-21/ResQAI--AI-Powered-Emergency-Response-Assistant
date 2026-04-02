import React, { useState } from 'react';
import { CPRGuidance, CPR_STEPS } from '../features/cprGuidance';
import { FirstAidInstructions } from '../features/firstAidInstructions';
import { AIGuidedAssistance } from '../features/aiAssistance';
import { VoiceGuidance } from '../features/voiceGuidance';
import { Heart, Bandage, Bot, Volume2, VolumeX, ArrowLeft, ArrowRight } from 'lucide-react';

const cpr = new CPRGuidance();
const firstAid = new FirstAidInstructions();
const aiAssist = new AIGuidedAssistance();
const voice = new VoiceGuidance();

const ASSISTANCE_TYPES = [
  { key: 'cpr', label: 'CPR Guidance', icon: Heart, color: 'bg-red-600' },
  { key: 'firstaid', label: 'First Aid', icon: Bandage, color: 'bg-green-600' },
  { key: 'ai', label: 'AI Assistance', icon: Bot, color: 'bg-blue-600' }
];

export default function AssistancePanel() {
  const [type, setType] = useState('cpr');
  const [input, setInput] = useState('');
  const [steps, setSteps] = useState<string[]>(CPR_STEPS);
  const [currentStep, setCurrentStep] = useState(0);
  const [aiResult, setAiResult] = useState<any>(null);
  const [firstAidType, setFirstAidType] = useState('Bleeding');
  const [autoVoice, setAutoVoice] = useState(true);

  const handleTypeChange = async (t: string) => {
    setType(t);
    if (t === 'cpr') {
      setSteps(CPR_STEPS);
      setCurrentStep(0);
    } else if (t === 'firstaid') {
      const fa = firstAid.getInstructions(firstAidType);
      const faSteps = fa?.firstAidSteps || ['No instructions found.'];
      setSteps(faSteps);
      setCurrentStep(0);
    } else if (t === 'ai') {
      setSteps([]);
      setCurrentStep(0);
    }
    setAiResult(null);
  };

  const handleAI = async () => {
    if (!input.trim()) return;
    const result = await aiAssist.getAssistance(input);
    setAiResult(result);
    setSteps(result.steps);
    setCurrentStep(0);
    if (autoVoice && result.steps.length > 0) voice.speak(result.steps[0]);
  };

  const handleSpeak = () => {
    if (steps.length > 0) voice.speak(steps[currentStep]);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => {
        const next = s + 1;
        if (autoVoice) voice.speak(steps[next]);
        return next;
      });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => {
        const prev = s - 1;
        if (autoVoice) voice.speak(steps[prev]);
        return prev;
      });
    }
  };

  const progress = { current: steps.length ? currentStep + 1 : 0, total: steps.length };
  const percent = steps.length ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-3xl shadow-2xl border border-gray-100 animate-fade-in">
      <h2 className="text-3xl font-extrabold mb-6 text-center tracking-tight">Emergency Assistance</h2>
      <div className="flex gap-2 mb-6 justify-center">
        {ASSISTANCE_TYPES.map(opt => (
          <button
            key={opt.key}
            className={`flex flex-col items-center px-4 py-2 rounded-2xl font-bold shadow transition-all duration-200 ${type === opt.key ? opt.color + ' text-white scale-110' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => handleTypeChange(opt.key)}
          >
            <opt.icon className="w-7 h-7 mb-1" />
            {opt.label}
          </button>
        ))}
      </div>

      {type === 'firstaid' && (
        <div className="mb-4">
          <label className="block mb-1 font-bold">Emergency Type:</label>
          <input
            className="border px-2 py-1 rounded w-full"
            value={firstAidType}
            onChange={e => setFirstAidType(e.target.value)}
            onBlur={() => handleTypeChange('firstaid')}
            placeholder="e.g. Bleeding, Burn, Fracture"
          />
        </div>
      )}

      {type === 'ai' && (
        <div className="mb-4">
          <label className="block mb-1 font-bold">Describe the Emergency:</label>
          <input
            className="border px-2 py-1 rounded w-full"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g. Someone fainted, there is a fire..."
          />
          <button
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded font-bold w-full"
            onClick={handleAI}
          >
            Get AI Assistance
          </button>
        </div>
      )}

      {(steps.length > 0 || aiResult) && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-lg">Step {progress.current} of {progress.total}</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full mx-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #2563eb, #22d3ee)' }} />
            </div>
            <button
              className={`ml-2 p-2 rounded-full ${autoVoice ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}
              onClick={() => setAutoVoice(v => !v)}
              title={autoVoice ? 'Mute Voice' : 'Enable Voice'}
            >
              {autoVoice ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
          <div className="p-6 bg-blue-50 rounded-2xl mb-4 min-h-[70px] text-lg font-semibold shadow-inner animate-fade-in">
            {steps[currentStep]}
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 bg-gray-200 rounded-xl py-3 font-bold flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-300 transition-all"
              onClick={handlePrev}
              disabled={progress.current === 1}
            >
              <ArrowLeft className="w-5 h-5" /> Previous
            </button>
            <button
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
              onClick={handleNext}
              disabled={progress.current === progress.total}
            >
              Next <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
