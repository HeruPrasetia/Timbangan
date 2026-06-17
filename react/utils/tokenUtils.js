import { jwtDecode } from 'jwt-decode';
export const Token = localStorage.getItem("TokenNaylaTools");

/**
 * Validate JWT token expiration
 * @param {string} token - JWT token to validate
 * @returns {boolean} - True if token is valid, False if expired or invalid
 */
export const isTokenValid = (token) => {
    if (!token) return false;

    // Check if it's a JWT (has 3 parts separated by dots)
    if (typeof token !== 'string' || token.split('.').length !== 3) {
        return true; // Not a JWT, assume valid custom token
    }

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

export const isDevMode = () => {
    if (window.electronAPI && typeof window.electronAPI.isPackagedSync === 'boolean') {
        return !window.electronAPI.isPackagedSync;
    }
    return !!(import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
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

function getShiftFromToken() {
    if (!Token) return 3;
    let sum = 0;
    for (let i = 0; i < Token.length; i++) {
        sum += Token.charCodeAt(i);
    }
    let shift = sum % 26;
    if (shift === 0) return 3;
    return shift;
}

export function decrypt(text, shift) {
    if (shift === undefined) {
        shift = getShiftFromToken(Token);
    }
    if (isDevMode()) return JSON.parse(text);

    return JSON.parse(encrypt(text, 26 - shift));
}

export const apiGo = (url, data, isRaw = false) => {
    const isDev = isDevMode();
    const host = isDev ? 'http://localhost:3002/' : 'https://apigo.naylatools.com/';
    // const host = 'https://apigo.naylatools.com/';
    try {
        return new Promise((resolve, reject) => {
            fetch(encodeURI(host + url), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Token}`
                },
                body: isRaw ? data : jsonToForm(data),
            }).then(response => response.text()).then(hasil => {
                resolve(decrypt(hasil));
            }).catch((error) => {
                reject(error)
            });
        });
    } catch (e) {
        console.log(e);
    }
}

export const isJson = (str) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function jsonToForm(data) {
    const formData = new FormData();
    for (let dt in data) formData.append(dt, data[dt]);
    return formData;
}