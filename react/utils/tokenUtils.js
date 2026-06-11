import { jwtDecode } from 'jwt-decode';

/**
 * Validate JWT token expiration
 * @param {string} token - JWT token to validate
 * @returns {boolean} - True if token is valid, False if expired or invalid
 */
export const isTokenValid = (token) => {
    if (!token) return false;
    
    try {
        const decoded = jwtDecode(token);
        
        // Check if token has exp claim
        if (!decoded.exp) {
            return true; // Token has no expiration, consider it valid
        }
        
        // Convert exp (seconds) to milliseconds and compare with current time
        const expirationTime = decoded.exp * 1000;
        const currentTime = Date.now();
        
        // Token is valid if expiration time is in the future
        return expirationTime > currentTime;
    } catch (error) {
        console.error('Token validation error:', error);
        return false; // Invalid token format or decode error
    }
};

/**
 * Get token expiration time in seconds remaining
 * @param {string} token - JWT token
 * @returns {number} - Seconds remaining until expiration, or -1 if invalid
 */
export const getTokenExpiresIn = (token) => {
    if (!token) return -1;
    
    try {
        const decoded = jwtDecode(token);
        
        if (!decoded.exp) {
            return Infinity; // No expiration
        }
        
        const expirationTime = decoded.exp * 1000;
        const currentTime = Date.now();
        const secondsRemaining = Math.ceil((expirationTime - currentTime) / 1000);
        
        return secondsRemaining > 0 ? secondsRemaining : 0;
    } catch (error) {
        console.error('Token expiration check error:', error);
        return -1;
    }
};

export function encrypt(text, shift) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        let charCode = text.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) {
            result += String.fromCharCode((charCode - 65 + shift) % 26 + 65);
        } else if (charCode >= 97 && charCode <= 122) {
            result += String.fromCharCode((charCode - 97 + shift) % 26 + 97);
        } else {
            result += text[i];
        }
    }
    return result;
}

export function getShiftFromToken(token) {
    if (!token) return 3;
    let sum = 0;
    for (let i = 0; i < token.length; i++) {
        sum += token.charCodeAt(i);
    }
    let shift = sum % 26;
    if (shift === 0) return 3;
    return shift;
}

export function decrypt(text, shift, token) {
    if (shift === undefined) {
        shift = getShiftFromToken(token);
    }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        try {
            return JSON.parse(text);
        } catch (e) {
            // Fallback to decrypt if it's encrypted on localhost
        }
    }

    return JSON.parse(encrypt(text, 26 - shift));
}
