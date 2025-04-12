// Import necessary classes/functions
import { getAdminIdentity } from './fabric-wallet'; // Assuming this gets admin credentials
import { FabricCAServices } from 'fabric-ca-client';
import path from 'path'; // path is imported but not used in this snippet, maybe needed elsewhere

// Configuration
const caURL = 'http://localhost:7054'; // Your Fabric CA URL
const caName = 'ca-org1'; // The name of your CA instance (check config)
const ca = new FabricCAServices(caURL, undefined, caName); // Use undefined for tlsOptions if not using TLS client auth here

// Function to register and enroll a user
export const registerAndEnrollUser = async (userId) => {
  try {
    // 1. Get Admin Identity (must have registrar role)
    console.log('Retrieving admin identity...');
    const adminIdentity = await getAdminIdentity();
    if (!adminIdentity) {
        throw new Error('Admin identity not found in wallet. Make sure admin is enrolled.');
    }
    console.log('Admin identity retrieved.');


    // 2. Register the user with the CA using the admin identity
    console.log(`Registering user "${userId}" with CA "${caName}"...`);
    const registerRequest = {
      enrollmentID: userId,
      affiliation: 'org1.department1', // *** ADJUST affiliation if needed ***
      role: 'client',                   // *** ADJUST role if needed ***
      maxEnrollments: -1                // Use -1 for unlimited, 0 for default from CA, 1 for one-time, etc.
    };
    // The register function requires the registrar (admin) identity object
    const secret = await ca.register(registerRequest, adminIdentity);
    // console.log(`Successfully registered user "${userId}". Secret: [Protected - Do Not Log in Prod]`); // Avoid logging secrets

    // 3. Enroll the user with the CA using the obtained secret
    console.log(`Enrolling user "${userId}" with CA "${caName}"...`);
    /**
     * @type {import('fabric-ca-client').IEnrollmentRequest}
     */
    const enrollRequest = {
      enrollmentID: userId,
      enrollmentSecret: secret,
      // profile: 'tls' // Optional: Specify 'tls' profile if you need a TLS certificate
    };
    const enrollment = await ca.enroll(enrollRequest);
    console.log(`Successfully enrolled user "${userId}".`);

    // 4. Extract the certificate and private key (both in PEM format)
    // The enrollment object structure is { key: SigningIdentityPrivateKey, certificate: string, rootCertificate: string }
    const certificate = enrollment.certificate; // User's certificate (PEM)
    const privateKey = enrollment.key.toBytes(); // User's private key (PEM)
    const rootCertificate = enrollment.rootCertificate; // Issuing CA's root certificate (PEM)

    // 5. Return the cryptographic materials
    // It's common practice to return the cert and key. Returning the root cert is optional but can be helpful.
    return {
        userId: userId, // Good practice to return the ID associated with the creds
        certificate: certificate,
        privateKey: privateKey,
        rootCertificate: rootCertificate // Client might need this to verify server certs later
    };

  } catch (error) {
    // Provide more context in error messages
    console.error(`Failed to register or enroll user "${userId}" with CA "${caName}":`, error);
    let errorMsg = error.message || (error.errors && error.errors[0] && error.errors[0].message) || 'Unknown error';

    // Specific check for common authorization failure
    if (errorMsg.includes('Authorization failure') || (error.details && error.details.includes('Authorization failure'))) {
        throw new Error(`Authorization failure for admin user during registration of "${userId}". Ensure the admin identity has the 'hf.Registrar' role and attributes to manage the target affiliation.`);
    }
    // Specific check if user might already be registered on the CA (enrollment would still proceed if secret matches)
    if (errorMsg.includes('is already registered')) {
         console.warn(`User "${userId}" was already registered according to the CA. Attempting enrollment...`);
         // Potentially modify logic here if registration failure means you stop
    }

    // General error
    throw new Error(`Failed operation for user "${userId}": ${errorMsg}`);
  }
};
