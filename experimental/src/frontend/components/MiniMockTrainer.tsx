import React, { useState, useEffect } from 'react';

interface Question {
  id: string;
  course: string;
  facts: string;
}

const SAMPLE_MOCK_QUESTIONS: Question[] = [
  {
    id: "Q1_EU_GOODS",
    course: "Substantive EU Law",
    facts: "A French domestic regulation prohibits the sale of energy drinks containing unapproved hemp extracts. A Dutch artisanal manufacturer challenges this border restriction under Art. 34 TFEU. Evaluate the Member State's public health defense."
  },
  {
    id: "Q2_NL_TORT",
    course: "Dutch Law of Obligations",
    facts: "An agent exceeds their explicit written proxy authority to sign a commercial lease agreement on behalf of a principal. The third-party landlord seeks direct performance or damages under Article 6:162 BW (Onrechtmatige daad). Analyze liability."
  }
];

export const MiniMockTrainer: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(450);
  const [isExamLocked, setIsExamLocked] = useState<boolean>(false);
  const [studentResponse, setStudentResponse] = useState<string>('');

  useEffect(() => {
    if (timeLeft <= 0) {
      handleStepTimeout();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleStepTimeout = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      setTimeLeft(450);
      setStudentResponse('');
    } else {
      setIsExamLocked(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isExamLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-zinc-950 border border-red-900/50 p-8 rounded-lg text-zinc-100 font-mono">
        <h2 className="text-2xl font-bold text-red-500 uppercase tracking-wider mb-2">Exam Window Locked</h2>
        <p className="text-zinc-400 text-center text-sm max-w-md">Time limit reached. Response saved to diagnostic storage.</p>
      </div>
    );
  }

  const activeQuestion = SAMPLE_MOCK_QUESTIONS[currentStep];

  return (
    <div className="w-full max-w-3xl mx-auto bg-zinc-950 border border-zinc-800 p-6 rounded-xl font-sans text-zinc-100 shadow-2xl">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
        <div>
          <span className="text-xs font-mono uppercase bg-zinc-800 px-2 py-1 rounded text-amber-400 font-semibold tracking-wider">
            Mini Mock Drill: {currentStep + 1} of 2
          </span>
          <h1 className="text-lg font-bold font-mono mt-2 text-zinc-200">{activeQuestion.course}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono uppercase text-zinc-500">Remaining Section Time</p>
          <p className={`text-2xl font-mono font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-zinc-100'}`}>
            {formatTime(timeLeft)}
          </p>
        </div>
      </div>
      <div className="bg-zinc-900 border-l-2 border-zinc-500 p-4 rounded-r-md mb-6">
        <p className="text-zinc-300 leading-relaxed text-sm font-serif">{activeQuestion.facts}</p>
      </div>
      <textarea
        className="w-full h-48 bg-zinc-900 border border-zinc-800 p-4 rounded-md text-zinc-200 font-mono text-sm resize-none focus:outline-none focus:border-zinc-600"
        placeholder="Establish threshold jurisdictional gates before identifying final remedies..."
        value={studentResponse}
        onChange={(e) => setStudentResponse(e.target.value)}
      />
      <div className="flex justify-end mt-4">
        <button onClick={handleStepTimeout} className="bg-zinc-100 text-zinc-950 font-mono text-xs font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-zinc-300 transition-colors">
          {currentStep === 0 ? "Commit & Switch Context" : "Submit Final Active Mock"}
        </button>
      </div>
    </div>
  );
};
