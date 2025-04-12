/**
 * Creates a JSON backup file containing the user's identity credentials and triggers download.
 * The identity object should contain at least userId, certificate, and privateKey.
 * It might also contain rootCertificate.
 *
 * @param {object} identity - The identity object to back up.
 * @param {string} identity.userId - The user's unique identifier.
 * @param {string} identity.certificate - The user's PEM-encoded certificate.
 * @param {string} identity.privateKey - The user's PEM-encoded private key.
 * @param {string} [identity.rootCertificate] - Optional: The PEM-encoded root CA certificate.
 */
export const downloadIdentityBackup = (identity) => {
  // Basic validation before proceeding
  if (!identity || !identity.userId || !identity.certificate || !identity.privateKey) {
    console.error('Invalid identity object provided for backup:', identity);
    alert('Error: Cannot download backup due to invalid identity data.'); // User feedback
    return;
  }

  // The identity object is stringified, including any fields it has (like rootCertificate)
  const identityJson = JSON.stringify(identity, null, 2); // Pretty print JSON
  const blob = new Blob([identityJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Consistent and informative filename
  a.download = `stepup-identity-backup-${identity.userId}.json`;
  document.body.appendChild(a); // Append to body to ensure click works reliably
  a.click();
  document.body.removeChild(a); // Clean up the element
  URL.revokeObjectURL(url); // Free up memory
};

/**
 * Reads an identity backup file (JSON) and parses its content.
 * Validates that the parsed object contains the essential identity fields.
 *
 * @param {File} file - The file object selected by the user (e.g., from <input type="file">).
 * @returns {Promise<object>} A promise that resolves with the validated identity object
 * or rejects with an error message.
 */
export const importIdentityFromFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      return reject('No file selected.');
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      let parsed;
      try {
        // Attempt to parse the file content as JSON
        parsed = JSON.parse(event.target.result);
      } catch (err) {
        // Handle JSON parsing errors
        console.error('Failed to parse backup file:', err);
        return reject('Invalid backup file: Not valid JSON.');
      }

      // **Validate the structure of the parsed JSON**
      if (!parsed || typeof parsed !== 'object') {
           return reject('Invalid backup file: Content is not a valid object.');
      }
      if (!parsed.userId || typeof parsed.userId !== 'string') {
           return reject('Invalid backup file: Missing or invalid "userId".');
      }
      if (!parsed.certificate || typeof parsed.certificate !== 'string') {
           return reject('Invalid backup file: Missing or invalid "certificate".');
      }
      if (!parsed.privateKey || typeof parsed.privateKey !== 'string') {
          return reject('Invalid backup file: Missing or invalid "privateKey".');
      }
      // rootCertificate is optional, so we don't strictly require it,
      // but if present, it should ideally be a string.
      if (parsed.rootCertificate && typeof parsed.rootCertificate !== 'string') {
          console.warn('Backup file contains an invalid "rootCertificate" field.');
          // Decide if you want to reject or just ignore/remove it
          // delete parsed.rootCertificate; // Option: remove invalid field
      }

      // If all checks pass, resolve with the parsed and validated identity
      resolve(parsed);
    };

    reader.onerror = (event) => {
      // Handle file reading errors
      console.error('Error reading file:', event.target.error);
      reject(`Error reading file: ${event.target.error.message || 'Unknown error'}`);
    };

    // Read the file as text
    reader.readAsText(file);
  });