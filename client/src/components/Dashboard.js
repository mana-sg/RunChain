import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [userId, setUserId] = useState('');
    const [token, setToken] = useState('');
    const [userDetails, setUserDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Start true to show loading initially
    const [error, setError] = useState('');

    const navigate = useNavigate();

    // Define logout handler using useCallback
    const handleLogout = useCallback((logoutMessage = 'You have been logged out.') => {
        console.log(`[Dashboard] Logging out user: ${sessionStorage.getItem('currentUser') || 'Unknown'}`);
        sessionStorage.removeItem('sessionToken');
        sessionStorage.removeItem('currentUser');
        // Optional: Clear context/redux state if used
        navigate('/login', { state: { message: logoutMessage } });
    }, [navigate]); // Include navigate in dependency array


    // Define fetchUserDetails using useCallback
    const fetchUserDetails = useCallback(async (authToken) => {
        console.log("[Dashboard] Fetching user details from API...");
        setIsLoading(true); // Set loading true when fetching starts
        setError('');
        try {
            const response = await fetch('/api/user/profile', { // Call the protected endpoint
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`, // Send the JWT
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json(); // Attempt to parse JSON always

            if (!response.ok) {
                console.error("[Dashboard] API Error Response:", data);
                // Handle specific auth errors (401/403) by logging out
                if (response.status === 401 || response.status === 403) {
                    throw new Error(data.error || `Authentication error (${response.status}). Session may be invalid.`);
                }
                throw new Error(data.error || `Failed to fetch profile (${response.status})`);
            }

            console.log("[Dashboard] User details received:", data);
            setUserDetails(data); // Store the received user details

        } catch (err) {
            console.error("[Dashboard] Error fetching user details:", err);
            setError(`Could not load user details: ${err.message}`);
            // If it was an auth error, log out
            if (err.message.includes('Authentication error') || err.message.includes('401') || err.message.includes('403')) {
                 handleLogout('Session expired or invalid. Please log in again.');
            }
        } finally {
             setIsLoading(false); // Set loading false when fetch ends (success or fail)
        }
    }, [handleLogout]); // Include handleLogout dependency


    // useEffect for initial auth check and data fetching
    useEffect(() => {
        console.log("[Dashboard Effect] Checking auth and fetching data...");
        const storedToken = sessionStorage.getItem('sessionToken');
        const storedUserId = sessionStorage.getItem('currentUser');

        if (!storedToken || !storedUserId) {
            console.warn("[Dashboard Effect] Not authenticated. Redirecting...");
            handleLogout('Please log in to view the dashboard.'); // Use logout handler to redirect
        } else {
            console.log(`[Dashboard Effect] User "${storedUserId}" authenticated.`);
            setToken(storedToken);
            setUserId(storedUserId);
            // Fetch details now that we know we have a token
            fetchUserDetails(storedToken);
        }
    }, [navigate, fetchUserDetails, handleLogout]); // Add fetchUserDetails & handleLogout to dependency array


    // Display loading state while checking auth or fetching data
    // And before userId/token are confirmed by the effect hook
    if (isLoading && !userDetails && !error) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Dashboard...</div>;
    }

     // Display error state if fetching failed (and not loading anymore)
     if (error && !isLoading) {
         return (
             <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
                 <h2>Error</h2>
                 <p>{error}</p>
                 <button onClick={() => handleLogout('Please try logging in again.')}>Go to Login</button>
             </div>
         );
     }

    // This should ideally not be reached if useEffect redirect works,
    // but included as a safeguard before userDetails are loaded.
    if (!token || !userId) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Redirecting...</div>;
    }

    // --- JSX Render when authenticated and data loaded (or failed with error already handled) ---
    return (
        <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'sans-serif' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Dashboard</h1>
                <button onClick={() => handleLogout()} /* ... logout button styles ... */ >
                    Logout
                </button>
            </div>

            {/* Use userId from state */}
            <h2 style={{ marginBottom: '1rem' }}>Welcome, {userId}!</h2>

            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <h3>Your Details</h3>
                {/* Display fetched details */}
                {userDetails ? (
                     <ul style={{ listStyle: 'none', padding: 0 }}>
                         <li><strong>User ID:</strong> {userDetails.userId}</li>
                         <li><strong>First Name:</strong> {userDetails.firstName}</li>
                         <li><strong>Last Name:</strong> {userDetails.lastName}</li>
                         <li><strong>Email:</strong> {userDetails.email}</li>
                         <li><strong>Joined:</strong> {new Date(userDetails.createdAt).toLocaleDateString()}</li>
                         {/* Add more fields if returned by API */}
                     </ul>
                 ) : (
                    // This case might be shown briefly if loading finishes before error is set, or if API returns null/empty
                    <p>User details could not be loaded.</p>
                 )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <h3>Certificate Information</h3>
                {userDetails && userDetails.publicCertificate ? (
                    <div>
                        <p>Your public certificate (first/last lines):</p>
                        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#eee', padding: '0.5rem', fontSize: '0.8em', maxHeight: '100px', overflowY: 'auto' }}>
                            {`${userDetails.publicCertificate.split('\n')[0]}\n...\n${userDetails.publicCertificate.split('\n').slice(-2).join('\n')}`}
                        </pre>
                        {/* Add expiry parsing/display if possible */}
                    </div>
                ) : (
                     <p>(Certificate data not available)</p>
                 )}
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h3>Actions</h3>
                <p>(Placeholder: Add buttons or links for actions...)</p>
                {/* <button style={{ marginRight: '1rem', padding: '0.6rem 1.2rem' }}>Do Something</button> */}
            </div>

        </div>
    );
};

export default Dashboard;