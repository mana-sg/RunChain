import React, { useEffect, useState, useCallback } from 'react';
import { getIdentity, getAllUserIds, saveIdentity } from '../utils/indexedDB'; // Adjust path
import { importIdentityFromFile } from '../utils/backup'; // Adjust path
import { useNavigate } from 'react-router-dom';
// *** IMPORT JSRSASIGN for signing ***
import { KJUR, KEYUTIL } from 'jsrsasign';

// Helper: ArrayBuffer/View to Base64
const arrayBufferToBase64 = (buffer) => {
    console.log(`arrayBufferToBase64: Encoding buffer/view of length ${buffer.byteLength}...`); // DEBUG
    let binary = '';
    const bytes = (buffer instanceof ArrayBuffer) ? new Uint8Array(buffer) : buffer;
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    const base64 = window.btoa(binary);
    console.log(`arrayBufferToBase64: Encoding successful. Output Base64: ${base64}`); // DEBUG
    return base64;
};

// Helper: String to ArrayBuffer (UTF-8)
const strToArrayBuffer = (str) => {
    console.log("strToArrayBuffer: Encoding string to ArrayBuffer (UTF-8)..."); // DEBUG
    if (typeof str !== 'string') {
        console.error("strToArrayBuffer: Input is not a string:", str);
        throw new Error("Cannot encode non-string to ArrayBuffer.");
    }
    const buffer = new TextEncoder().encode(str);
    console.log(`strToArrayBuffer: Encoding successful. Output ArrayBuffer length: ${buffer.byteLength}`); // DEBUG
    return buffer; // Returns Uint8Array view
};

// Helper: ArrayBuffer/View to Hex String
const bufferToHex = (buffer) => {
     if (!buffer || (!ArrayBuffer.isView(buffer) && !(buffer instanceof ArrayBuffer))) {
         console.error("bufferToHex: Input is not a valid ArrayBuffer or TypedArray:", buffer);
         return 'Invalid buffer';
     }
     const uint8Array = (buffer instanceof ArrayBuffer) ? new Uint8Array(buffer) : buffer;
    return Array.prototype.map.call(uint8Array, x => ('00' + x.toString(16)).slice(-2)).join('');
}

// Helper: Hex String to Uint8Array
const hexToUint8Array = (hexString) => {
    if (typeof hexString !== 'string' || hexString.length % 2 !== 0) {
        console.error("hexToUint8Array: Invalid hex string input:", hexString);
        throw new Error("Hex string must be valid and have an even number of characters");
    }
    try {
        const byteArray = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
            byteArray[i / 2] = parseInt(hexString.substr(i, 2), 16);
        }
        return byteArray;
    } catch(e) {
        console.error("hexToUint8Array: Failed to parse hex string:", e);
        throw new Error(`Failed to parse hex signature: ${e.message}`);
    }
}

const LoginForm = () => {
    const [userId, setUserId] = useState('');
    const [userIds, setUserIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Fetch user IDs on mount
    useEffect(() => {
        const fetchUserIds = async () => {
            console.log("[Effect] Fetching user IDs..."); // Basic Log
            try {
                setIsLoading(true);
                const ids = await getAllUserIds();
                setUserIds(ids);
                if (ids.length > 0 && !userId) {
                    setUserId(ids[0]);
                }
            } catch (err) {
                console.error('[Effect] Failed to load user IDs:', err);
                setError('Failed to load saved identities');
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserIds();
    }, []); // Run only once

    // --- Authentication Logic ---
    const handleLogin = useCallback(async () => {
        console.log(`\n===== [handleLogin START] Attempting login for userId: "${userId}" =====`); // Normal Log
        setError(''); setSuccess('');

        if (!userId) {
            setError('Please select a user identity');
            return;
        }

        setIsLoading(true);
        let challenge = '';
        try {
            // --- Step 1: Fetch RANDOM Challenge ---
            console.log(`[handleLogin Step 1] Requesting challenge for user: ${userId}`);
            try {
                const challengeResponse = await fetch('/api/login-challenge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId }),
                });
                console.log(`[handleLogin Step 1] Challenge request status: ${challengeResponse.status}`);
                const responseBody = await challengeResponse.json();
                if (!challengeResponse.ok) throw new Error(responseBody.error || `Failed to get challenge (${challengeResponse.status})`);
                challenge = responseBody.challenge;
                if (!challenge || typeof challenge !== 'string') throw new Error('No valid challenge received.');
                console.log(`[handleLogin Step 1] Random challenge received: "${challenge}"`);
                console.log("[handleLogin Step 1] Challenge for comparison (JSON):", JSON.stringify(challenge));
            } catch (fetchError) { throw new Error(`Network/server error fetching challenge: ${fetchError.message}`); }


            // --- Step 2: Retrieve Private Key ---
            console.log(`[handleLogin Step 2] Retrieving identity for "${userId}"...`);
            let privateKeyPem = '';
            try {
                const storedIdentity = await getIdentity(userId);
                if (!storedIdentity || !storedIdentity.privateKey) throw new Error('Identity or private key not found locally.');
                privateKeyPem = storedIdentity.privateKey;
                console.log(`[handleLogin Step 2] Private key PEM retrieved. Length: ${privateKeyPem?.length}`);
            } catch (dbError) { throw new Error(`Failed to retrieve local identity: ${dbError.message}`); }


            // --- Step 3 & 4: Sign using jsrsasign ---
            console.log("[handleLogin Step 3&4] Signing challenge using jsrsasign...");
            let signatureHex = '';
            try {
                console.log("[handleLogin Step 3a] Loading PEM private key...");
                const prvKey = KEYUTIL.getKey(privateKeyPem); // Load/parse PEM

                console.log("[handleLogin Step 4a] Initializing Signature (SHA256withECDSA)...");
                const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
                sig.init(prvKey); // Init with key object
                console.log("[handleLogin Step 4c] Updating signature with challenge string:", JSON.stringify(challenge));
                const challengeBufferForSigning = strToArrayBuffer(challenge);
                console.log("[handleLogin Step 4d] Challenge buffer for signing (HEX):", bufferToHex(challengeBufferForSigning));
                sig.updateString(challenge); // Pass challenge string
                console.log("[handleLogin Step 4e] Calling sig.sign()...");
                signatureHex = sig.sign(); // Get hex encoded DER signature
                console.log(`[handleLogin Step 4f] Signing successful. Signature HEX: ${signatureHex.substring(0, 20)}...`);
            } catch (signError) { throw new Error(`Failed to sign challenge: ${signError.message}`); }


            // --- Step 5: Convert Signature Hex to Base64 ---
            console.log("[handleLogin Step 5] Converting signature HEX to Base64...");
            let signatureBase64 = '';
            try {
                 const sigUint8Array = hexToUint8Array(signatureHex);
                 signatureBase64 = arrayBufferToBase64(sigUint8Array); // Reuse existing helper
                 console.log("[handleLogin Step 5] Conversion successful.");
            } catch (encError) { throw new Error(`Failed to encode signature: ${encError.message}`); }


            // --- Step 6: Send Verification Request to Backend ---
            const verificationPayload = { userId, challenge, signature: signatureBase64 };
            console.log("[handleLogin Step 6] Sending verification request:", { ...verificationPayload, signature: `${signatureBase64.substring(0,10)}...` });
            let verifyData;
            try {
                // ***** FIX IS HERE *****
                const verifyResponse = await fetch('/api/verify-login', {
                    method: 'POST', // <--- ADDED THIS LINE
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(verificationPayload),
                });
                // ***** END FIX *****

                console.log(`[handleLogin Step 6] Verification status: ${verifyResponse.status}`);
                verifyData = await verifyResponse.json();
                if (!verifyResponse.ok) {
                    console.error("[handleLogin Step 6] Verification failed response body:", verifyData);
                    throw new Error(verifyData.error || `Verification failed (${verifyResponse.status})`);
                }
                console.log("[handleLogin Step 6] Verification successful response:", verifyData);
            } catch (verifyFetchError) { throw new Error(`Network or server error during verification: ${verifyFetchError.message}`); }


            // --- Step 7: Handle Successful Login ---
            console.log("[handleLogin Step 7] Handling successful login...");
            if (!verifyData.token) { throw new Error('Login successful, but no token received.'); }
            setSuccess(`Successfully logged in as ${userId}`);
            sessionStorage.setItem('sessionToken', verifyData.token);
            sessionStorage.setItem('currentUser', userId);
            console.log("[handleLogin Step 7] Login successful, token stored.");
            setTimeout(() => navigate('/dashboard'), 1000);

        } catch (err) {
            console.error('[handleLogin] Process error:', err);
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
            console.log("===== [handleLogin END] =====");
        }
    }, [userId, navigate]);

    // --- File Import Logic ---
    const handleFileImport = useCallback(async (event) => {
        // ... (keep existing import logic with logs) ...
    }, []);


    // --- Form Submission ---
    const handleSubmit = (e) => {
        console.log("[handleSubmit] Form submitted."); // DEBUG
        e.preventDefault();
        handleLogin();
    };

    // --- JSX Render ---
    // No changes needed in JSX from the previous version
    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>StepUp Login</h2>
             {error && <p style={{ color: 'red', backgroundColor: '#ffebee', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>{error}</p>}
             {success && <p style={{ color: 'green', backgroundColor: '#e8f5e9', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>{success}</p>}
             <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div>
                     <label htmlFor="user-select" style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Select Your Identity:</label>
                     <select
                         id="user-select"
                         value={userId}
                         onChange={(e) => setUserId(e.target.value)}
                         required
                         disabled={isLoading || userIds.length === 0}
                         style={{ width: '100%', padding: '0.75rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                     >
                         <option value="" disabled={userIds.length > 0}>
                             {userIds.length === 0 ? '-- No identities found --' : '-- Select User --'}
                         </option>
                         {userIds.map(id => ( <option key={id} value={id}> {id} </option> ))}
                     </select>
                 </div>
                 <button type="submit" disabled={isLoading || !userId} style={{ /* ... styles ... */ }}>
                     {isLoading ? 'Processing...' : 'Login'}
                 </button>
             </form>
              <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                 <h3 style={{ marginBottom: '0.5rem' }}>Restore Identity</h3>
                 <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                     If you have a backup file (`.json`), select it here...
                 </p>
                 <input type="file" accept=".json" onChange={handleFileImport} disabled={isLoading} style={{ display: 'block', width: '100%' }} />
              </div>
          </div>
      );
 };

 export default LoginForm;