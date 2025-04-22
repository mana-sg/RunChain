import React, { useState, useEffect } from 'react';

function StepTracker({ account }) {
    const [steps, setSteps] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(10000);
    const [manualSteps, setManualSteps] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [points, setPoints] = useState(0);

    // Point conversion rate: steps to points
    const STEPS_PER_POINT = 100; // 100 steps = 1 point

    // Point thresholds for rewards (these will be visible in RedeemRewards)
    const pointThresholds = [
        { points: 50, reward: "0.001 ETH", claimed: false },
        { points: 200, reward: "0.005 ETH", claimed: false },
        { points: 500, reward: "0.01 ETH", claimed: false }
    ];

    // Load data from localStorage on component mount
    useEffect(() => {
        loadFromLocalStorage();
    }, []);


    // Load steps and points from localStorage
    const loadFromLocalStorage = () => {
        const savedSteps = localStorage.getItem('runchain_steps');
        const savedPoints = localStorage.getItem('runchain_points');
        console.log(localStorage.getItem('runchain_steps'));
        console.log(localStorage.getItem('runchain_points'));

        if (savedSteps) {
            setSteps(parseInt(savedSteps, 10));
        }
        if (savedPoints) {
            setPoints(parseInt(savedPoints, 10));
        }
    };


    // Update points directly (if needed)
    const updatePointsInStorage = (newPoints, newSteps) => {
        localStorage.setItem('runchain_points', newPoints);
        localStorage.setItem('runchain_steps', newSteps);
    };

    const addSteps = (e) => {
        e.preventDefault();
        const stepsToAdd = parseInt(manualSteps, 10);
        if (isNaN(stepsToAdd) || stepsToAdd <= 0) {
            setMessage({ text: 'Please enter a valid number of steps', type: 'error' });
            return;
        }
        const newTotalSteps = steps + stepsToAdd;
        setSteps(prevSteps => prevSteps + stepsToAdd);
        setManualSteps('');

        // Calculate new points earned from these steps
        const pointsEarned = Math.floor(stepsToAdd / STEPS_PER_POINT);
        const newTotalPoints = points + pointsEarned;
        setPoints(newTotalPoints);
        updatePointsInStorage(newTotalPoints, newTotalSteps);

        if (pointsEarned > 0) {
            setMessage({
                text: `Added ${stepsToAdd} steps successfully! You earned ${pointsEarned} points.`,
                type: 'success'
            });
        } else {
            setMessage({
                text: `Added ${stepsToAdd} steps successfully!`,
                type: 'success'
            });
        }
    };

    const resetProgress = () => {
        if (window.confirm('Are you sure you want to reset your step progress and points?')) {
            setSteps(0);
            setPoints(0);
            localStorage.removeItem('runchain_steps');
            localStorage.removeItem('runchain_points');
            setMessage({ text: 'Progress has been reset', type: 'info' });
        }
    };

    return (
        <div className="step-tracker-container">
            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : message.type === 'error' ? 'alert-danger' : 'alert-info'} mb-4`}>
                    {message.text}
                </div>
            )}

            {/* Rest of your component remains unchanged... */}
            <div className="step-stats">
                <div className="stat-box">
                    <div className="stat-value">{steps.toLocaleString()}</div>
                    <div className="stat-label">Total Steps</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{Math.round((steps / dailyGoal) * 100)}%</div>
                    <div className="stat-label">Daily Goal</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{points}</div>
                    <div className="stat-label">Points Earned</div>
                </div>
            </div>

            <div className="progress mb-4">
                <progress value={steps} max={dailyGoal} style={{ width: '100%' }}></progress>
                <div className="text-center mt-2">
                    <small>{steps} / {dailyGoal.toLocaleString()} steps</small>
                </div>
            </div>

            <div className="step-input mb-4">
                <h5>Add Steps Manually</h5>
                <form onSubmit={addSteps}>
                    <div className="input-group">
                        <input
                            type="number"
                            value={manualSteps}
                            onChange={(e) => setManualSteps(e.target.value)}
                            placeholder="Enter steps"
                            className="form-control"
                            min="1"
                        />
                        <button type="submit" className="btn btn-primary" >Add Steps</button>
                    </div>
                </form>
                <div className="mt-2">
                    <small className="text-muted">Every {STEPS_PER_POINT} steps = 1 reward point</small>
                </div>
            </div>

            <div className="info-card mb-4">
                <div className="card">
                    <div className="card-header bg-info text-white">
                        <h5 className="mb-0">Points & Rewards</h5>
                    </div>
                    <div className="card-body">
                        <p>You currently have <strong>{points} points</strong>.</p>
                        <p>Visit the <strong>Redeem Rewards</strong> page to exchange your points for ETH rewards!</p>
                        <ul className="list-group">
                            {pointThresholds.map((threshold, index) => (
                                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                    <span>{threshold.reward}</span>
                                    <span className={`badge ${points >= threshold.points ? 'bg-success' : 'bg-secondary'}`}>
                                        {threshold.points} points
                                        {points >= threshold.points && " (Available)"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="text-center mt-4">
                <button className="btn btn-sm btn-outline-danger" onClick={resetProgress}>
                    Reset Progress
                </button>
            </div>
        </div>
    );
}

export default StepTracker;