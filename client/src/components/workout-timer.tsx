import { useState, useEffect } from "react";

interface WorkoutTimerProps {
  startTime: string;
}

export default function WorkoutTimer({ startTime }: WorkoutTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      setElapsed(elapsedSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex items-center bg-accent/10 px-3 py-1 rounded-full">
      <div className="w-2 h-2 bg-accent rounded-full mr-2 timer-circle" />
      <span className="text-sm font-medium" data-testid="text-workout-timer">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
