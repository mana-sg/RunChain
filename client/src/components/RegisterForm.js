import React, { useState } from 'react';
// Assuming these functions are correctly implemented to handle the identity object
import { saveIdentity } from '../utils/indexedDB';
import { downloadIdentityBackup } from '../utils/backup';

const Register = () => {
  const [formData, setFormData] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    email: ''
  });

  // State to hold the complete identity object received from the backend
  const [identityReady, setIdentityReady] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Added loading state

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIdentityReady(null); // Reset identity state on new submission
    setIsLoading(true); // Set loading true

    // Basic client-side validation (already present)
    if (!/^[a-z0-9_]{3,20}$/i.test(formData.userId)) {
      setError('User ID must be 3-20 characters (letters, numbers, underscores)');
      setIsLoading(false);
      return;
    }

    try {
      // Call the backend API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Send necessary data for registration (backend decides what it needs)
          userId: formData.userId,
          firstName: formData.firstName, // Optional: Send if backend uses it
          lastName: formData.lastName,   // Optional: Send if backend uses it
          email: formData.email         // Optional: Send if backend uses it
        })
      });

      // Parse the response
      const data = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        // Use error message from backend response if available
        throw new Error(data.error || data.message || `Registration failed with status ${response.status}`);
      }

      console.log('Registration success response:', data);

      // ** === KEY CHANGE START === **
      // Validate the received data structure
      if (!data.userId || !data.certificate || !data.privateKey) {
          console.error("Incomplete identity data received:", data);
          throw new Error('Incomplete identity data received from server. Cannot proceed.');
      }

      // Construct the identity object from the API response
      // Include rootCertificate if provided and if your utils expect it
      const identity = {
        userId: data.userId, // Use userId from response (should match formData.userId)
        certificate: data.certificate,
        privateKey: data.privateKey,
        rootCertificate: data.rootCertificate // Include if available and needed by save/backup
      };
      // ** === KEY CHANGE END === **

      // Save the identity locally (e.g., IndexedDB)
      // Ensure `saveIdentity` can handle the `rootCertificate` field if present
      await saveIdentity(identity);

      // Update state to show success message and enable download
      setIdentityReady(identity);

    } catch (err) {
      console.error('Registration process failed:', err);
      // Display the specific error message caught
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false); // Set loading false
    }
  };

  // Handle download button click
  const handleDownloadClick = () => {
    if (identityReady) {
      // Ensure `downloadIdentityBackup` can handle the identity object structure,
      // including `rootCertificate` if you decided to include it.
      downloadIdentityBackup(identityReady);
    }
  };

  // --- JSX Render ---
  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Register for StepUp</h2>

      {/* Display Error Messages */}
      {error && (
        <div style={{ color: 'red', backgroundColor: '#ffebee', border: '1px solid red', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {/* User ID Input */}
        <div>
          <label htmlFor="userId" style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>User ID:</label>
          <input
            id="userId"
            type="text"
            name="userId"
            value={formData.userId}
            onChange={handleChange}
            pattern="^[a-z0-9_]{3,20}$"
            title="3-20 characters (letters, numbers, underscores)"
            required
            disabled={isLoading} // Disable during loading
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          <small style={{ color: '#666' }}>Must be 3-20 letters, numbers, or underscores.</small>
        </div>

        {/* First Name Input */}
        <div>
          <label htmlFor="firstName" style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>First Name:</label>
          <input
            id="firstName"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        {/* Last Name Input */}
        <div>
          <label htmlFor="lastName" style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Last Name:</label>
          <input
            id="lastName"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        {/* Email Input */}
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 'bold' }}>Email:</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading} // Disable button while loading
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: isLoading ? '#ccc' : '#4CAF50', // Grey out when loading
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>

      {/* Success Message and Download Button */}
      {identityReady && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #4CAF50', backgroundColor: '#e8f5e9', borderRadius: '4px', textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: '#2e7d32', fontWeight: 'bold' }}>
            ✅ Registration successful for user "{identityReady.userId}"! Your identity credentials have been generated and saved locally.
          </p>
          <button
            onClick={handleDownloadClick}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Download Identity Backup File
          </button>
          <p style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: '#666' }}>
            ⚠️ **Important:** Save this backup file securely. It contains your private key and is essential for recovery or using your identity on other devices.
          </p>
        </div>
      )}
    </div>
  );
};

export default Register;