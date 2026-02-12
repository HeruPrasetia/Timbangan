const { app } = require('electron');

// In Electron Main Process, app.isPackaged is the standard way to check for production
const __DEV__ = app ? !app.isPackaged : process.env.NODE_ENV === 'development';
const host = __DEV__ ? "http://192.168.1.2/pos/" : "https://apps.gijutsusoftware.com/";

function encrypt(text, shift) {
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

function decrypt(text, shift) {
    return encrypt(text, 26 - shift);
}

function saiki(first = null, hasil = "hari") {
    var today = new Date();
    var dd = first == null ? today.getDate() : first;
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    var H = ('0' + today.getHours()).slice(-2);
    var i = ('0' + today.getMinutes()).slice(-2);
    var s = ('0' + today.getSeconds()).slice(-2);

    if (dd < 10) { dd = '0' + dd; }
    if (mm < 10) { mm = '0' + mm; }

    if (hasil == "hari") {
        return yyyy + '-' + mm + '-' + dd;
    } else if (hasil == "time") {
        return H + ':' + i + ':' + s;
    } else if (hasil == 'timestamp') {
        return yyyy + '-' + mm + '-' + dd + " " + H + ':' + i + ':' + s;
    }
    return yyyy + '-' + mm + '-' + dd;
}

module.exports = {
    host,
    __DEV__,
    encrypt,
    decrypt,
    saiki
};
