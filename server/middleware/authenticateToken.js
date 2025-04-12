import jwt from 'jsonwebtoken';

// IMPORTANT: Load your JWT secret from environment variables for security!
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-jwt-secret-key-CHANGE-ME';


/**
 * Express middleware to authenticate requests using JWT.
 * Looks for 'Bearer <token>' in the Authorization header.
 * Verifies the token using JWT_SECRET.
 * If valid, attaches the decoded payload to `req.user` and calls `next()`.
 * If invalid or missing, sends a 401 or 403 response.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const authenticateToken = (req, res, next) => {
    const requestPath = `${req.method} ${req.originalUrl}`; // For logging context
    console.log(`[AuthMiddleware] Checking request to: ${requestPath}`); // DEBUG

    // 1. Get token from 'Authorization' header
    // Format is typically: Bearer <JWT_TOKEN>
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // 2. Check if token exists
    if (token == null) {
        console.warn(`[AuthMiddleware] Denied: No token provided for ${requestPath}`); // DEBUG
        // 401 Unauthorized - Needs authentication credentials
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    console.log(`[AuthMiddleware] Token found for ${requestPath}. Verifying...`); // DEBUG (Don't log the token itself!)

    // 3. Verify the token
    jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
        // 'decodedPayload' will contain the data you put in it when signing (e.g., { userId: '...' })
        // plus 'iat' (issued at) and 'exp' (expiry) timestamps.

        if (err) {
            console.warn(`[AuthMiddleware] Denied: Token verification failed for ${requestPath}. Error: ${err.name} - ${err.message}`); // DEBUG
            // 403 Forbidden - Token was provided but is invalid (e.g., expired, signature mismatch)
            let clientErrorMessage = 'Invalid or expired token.';
            if (err instanceof jwt.TokenExpiredError) {
                clientErrorMessage = 'Token has expired.';
            } else if (err instanceof jwt.JsonWebTokenError) {
                // Covers malformed tokens, invalid signatures, etc.
                clientErrorMessage = 'Token is invalid.';
            }
            // It's generally better to send 401 if the token simply couldn't be validated,
            // reserving 403 for cases where the user IS authenticated but lacks specific permission.
            // However, sometimes 403 is used for any invalid token after an initial 401 for missing token.
            // Let's use 401 for consistency indicating authentication failure.
            return res.status(401).json({ error: `Authentication failed: ${clientErrorMessage}` });
        }

        // 4. Token is valid! Attach payload to request object
        // IMPORTANT: Make sure the payload signed earlier actually contains useful info like userId
        console.log(`[AuthMiddleware] Success: Token verified for ${requestPath}. Payload:`, decodedPayload); // DEBUG
        req.user = decodedPayload; // Makes user info available to subsequent route handlers

        // 5. Proceed to the next middleware or the actual route handler
        next();
    });
};

// Export the middleware function
export default authenticateToken;