const StatusIndicator = ({ status }) => {
    const isFire = status === 'FIRE';

    return (
        <div className="flex flex-col items-center">
            {/* Status Circle */}
            <div
                className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${isFire
                        ? 'bg-gradient-to-br from-red-500 to-orange-600 fire-glow'
                        : 'bg-gradient-to-br from-green-500 to-emerald-600 safe-glow'
                    }`}
            >
                <div className="text-center">
                    {isFire ? (
                        <svg className="w-20 h-20 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                        </svg>
                    ) : (
                        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Status Text */}
            <div className="mt-6 text-center">
                <h2 className={`text-4xl font-bold ${isFire ? 'text-red-500' : 'text-green-500'}`}>
                    {isFire ? 'FIRE DETECTED!' : 'ALL SAFE'}
                </h2>
                <p className="mt-2 text-slate-400">
                    {isFire
                        ? 'Emergency! Fire has been detected in the monitored area.'
                        : 'No fire detected. The system is monitoring.'}
                </p>
            </div>

            {/* Pulse Ring Animation for Fire */}
            {isFire && (
                <div className="absolute w-48 h-48 rounded-full border-4 border-red-500 animate-ping-slow opacity-50" />
            )}
        </div>
    );
};

export default StatusIndicator;
