import { openDB } from 'idb';

const DB_NAME = 'StepUpIdentityDB';
const STORE_NAME = 'identities';
const DB_VERSION = 1; // Keep track of DB version

/**
 * Initializes the IndexedDB database connection.
 * Creates or upgrades the object store if necessary.
 */
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`);
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.log(`Creating object store: ${STORE_NAME}`);
        // Use userId as the key path. The rest of the object structure is flexible.
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
        // Example: If you needed to search by email later, you could add an index:
        // store.createIndex('email', 'email', { unique: false });
      }
      // Add more upgrade logic here based on oldVersion if needed in the future
    },
    blocked() {
      // Handle cases where the DB is blocked by another tab
      alert('Database is blocked. Please close other tabs using this application.');
      console.error('Database connection blocked.');
    },
    blocking() {
        // Handle cases where this tab is blocking others (e.g., during upgrade)
       console.warn('Database connection is blocking other tabs.');
       // Optionally close the DB connection if blocking for too long
       // db.close();
    },
    terminated() {
         // Handle cases where the browser unexpectedly terminates the connection
         alert('Database connection terminated unexpectedly. Please refresh the page.');
         console.error('Database connection terminated.');
    }
  });
}

/**
 * Saves (adds or updates) an identity object in the IndexedDB store.
 *
 * @param {object} identity - The identity object to save. Must contain a 'userId'.
 */
export async function saveIdentity(identity) {
  // Validate basic structure before saving
  if (!identity || typeof identity !== 'object' || !identity.userId) {
      console.error('Attempted to save invalid identity object:', identity);
      throw new Error('Invalid identity object: Cannot save to database.');
  }
  // The object (including certificate, privateKey, and optionally rootCertificate)
  // will be stored.
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.put(identity); // 'put' adds or updates based on the keyPath ('userId')
  await tx.done; // Ensure transaction completes
  console.log(`Identity for user "${identity.userId}" saved successfully.`);
}

/**
 * Retrieves a specific identity object from the store by userId.
 *
 * @param {string} userId - The userId of the identity to retrieve.
 * @returns {Promise<object|undefined>} The identity object if found, otherwise undefined.
 */
export async function getIdentity(userId) {
  if (!userId) {
    console.warn('getIdentity called with null or empty userId');
    return undefined;
  }
  const db = await initDB();
  // Use readonly transaction unless modifying
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const identity = await store.get(userId);
  await tx.done;
  // The retrieved identity object will contain all fields it was saved with.
  return identity;
}

/**
 * Retrieves a list of all userIds (keys) stored in the identity store.
 *
 * @returns {Promise<string[]>} An array of userIds.
 */
export async function getAllUserIds() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const allKeys = await store.getAllKeys(); // Efficiently gets only the keys
  await tx.done;
  return allKeys; // These are the userIds
}

/**
 * Deletes an identity from the store by userId.
 *
 * @param {string} userId - The userId of the identity to delete.
 * @returns {Promise<void>}
 */
export async function deleteIdentity(userId) {
    if (!userId) {
        console.warn('deleteIdentity called with null or empty userId');
        return;
    }
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.delete(userId);
    await tx.done;
    console.log(`Identity for user "${userId}" deleted successfully.`);
}