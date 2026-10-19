import { useEffect, useState } from "react";
import { TrainFront } from "lucide-react";
import "./MetroLoader.css";

const STAGES = [
  "Connecting to the metro network...",
  "Preparing stations and routes...",
  "Getting your journey ready...",
];

export default function MetroLoader({ ready, error, onRetry }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (error) return;
    if (ready) {
      setProgress(100);
      return;
    }
    const timer = window.setInterval(() => {
      setProgress((previous) => Math.min(90, previous + Math.max(1, Math.round((90 - previous) / 12))));
    }, 240);
    return () => window.clearInterval(timer);
  }, [ready, error]);

  const stage = error
    ? "Unable to connect to the metro network"
    : ready
      ? "All aboard!"
      : STAGES[Math.min(2, Math.floor(progress / 32))];

  return (
    <div className="mm-loader" role="status" aria-live="polite" aria-label="Loading MetroMind AI">
      <div className="mm-loader__content">
        <div className="mm-loader__brand">
          <span className="mm-loader__brand-icon"><TrainFront size={28} /></span>
          <h1>MetroMind <span>AI</span></h1>
        </div>
        <p className="mm-loader__tagline">Navigate smarter. Travel better.</p>
        <div className="mm-loader__scene" aria-hidden="true">
          <div className="mm-loader__train">
            <div className="mm-loader__windows"><i /><i /><i /></div>
            <div className="mm-loader__signature">SHREY MADAAN</div>
            <div className="mm-loader__train-stripe" />
            <div className="mm-loader__wheel mm-loader__wheel--front" />
            <div className="mm-loader__wheel mm-loader__wheel--rear" />
          </div>
          <div className="mm-loader__tracks" />
        </div>
        <div className="mm-loader__progress-heading">
          <span>{stage}</span><strong>{progress}%</strong>
        </div>
        <div className="mm-loader__progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="mm-loader__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {error && (
          <div className="mm-loader__error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRetry}>Retry connection</button>
          </div>
        )}
        <p className="mm-loader__credit">Crafted by <strong>Shrey Madaan</strong></p>
      </div>
    </div>
  );
}
