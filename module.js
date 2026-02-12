const AsyncStorage = {
    getItem: async (key) => localStorage.getItem(key),
    setItem: async (key, value) => localStorage.setItem(key, value),
    removeItem: async (key) => localStorage.removeItem(key),
};

const Appearance = {
    getColorScheme: () => (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
};

// Check if we are in Vite development mode
export const __DEV__ = import.meta.env.DEV;

export const host = __DEV__ ? "http://192.168.1.2/pos/" : "https://apps.gijutsusoftware.com/";

export const colorScheme = Appearance.getColorScheme();

/**
 * Menampilkan pesan toast/pemberitahuan
 * @param {string} text - Pesan yang akan ditampilkan
 * @param {string} jenis - Tipe pesan: 'success', 'danger', 'info', 'warning'
 */
export const Pesan = (text, jenis = 'info') => {
    // Cari atau buat container toast
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Buat elemen toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${jenis}`;

    // Warna berdasarkan jenis
    const colors = {
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };

    toast.style.cssText = `
        background: ${colors[jenis] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        min-width: 250px;
        max-width: 400px;
        pointer-events: auto;
        animation: toast-fade-in 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
    `;

    toast.innerHTML = `
        <span>${text}</span>
        <button style="background:transparent; border:none; color:white; cursor:pointer; margin-left:10px; font-weight:bold;">&times;</button>
    `;

    // Tambahkan animasi ke head jika belum ada
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.innerHTML = `
            @keyframes toast-fade-in {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes toast-fade-out {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(toast);

    // Close button logic
    toast.querySelector('button').onclick = () => {
        toast.style.animation = 'toast-fade-out 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    };

    // Auto remove
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'toast-fade-out 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
};

/**
 * Alias untuk Pesan dengan parameter tambahan (untuk kompatibilitas db.js)
 */
export const Pesan2 = (text, title = "", jenis = "info") => {
    Pesan(title ? `${title}: ${text}` : text, jenis);
};

// Make them global for easier migration from React Native
if (typeof window !== 'undefined') {
    window.AsyncStorage = AsyncStorage;
    window.Appearance = Appearance;
    window.Pesan = Pesan;
    window.Pesan2 = Pesan2;
}

// export async function requestUserPermission() {
//     const authStatus = await messaging().requestPermission();
//     const enabled =
//         authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//         authStatus === messaging.AuthorizationStatus.PROVISIONAL;

//     if (enabled) {
//         console.log('Authorization status:', authStatus);
//         getFcmToken(); // Panggil fungsi untuk mendapatkan token
//     }
// }

// export async function getFcmToken() {
//     let fcmToken = await messaging().getToken();
//     if (fcmToken) {
//         let TokenFirebase = await AsyncStorage.getItem("TokenFirebase");
//         if (!TokenFirebase) {
//             await api("model/profile_crud", { act: "", TokenFirebase: fcmToken })
//         }
//         console.log("Your Firebase Token is:", fcmToken);
//         // **Penting:** Kirim token ini ke server backend Anda
//     } else {
//         console.log("Failed to get FCM token");
//     }
// }

export const isJson = function (str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

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

export function decrypt(text, shift) {
    return encrypt(text, 26 - shift);
}

export const api = async function (url, data = {}, decript = true) {
    try {
        return new Promise(async (resolve, reject) => {
            fetch(host + url, {
                method: 'POST',
                body: await jsonToForm(data),
            }).then(response => response.text()).then(hasil => {
                let Hasil = decript === true ? decrypt(hasil, 3) : hasil;
                if (__DEV__) console.log(Hasil);
                if (isJson(Hasil)) {
                    resolve(JSON.parse(Hasil));
                } else {
                    resolve({ status: "gagal", pesan: "Terjadi Kesalahan" });
                }
            }).catch((error) => {
                reject(error)
            });
        });
    } catch (e) {
        Pesan("Terjadi Kesalahan", "Mohon maaf terjadi kesalahan " + e, "danger");
        console.log(e);
    }
};

async function jsonToForm(data) {
    const formData = new FormData();
    const token = await AsyncStorage.getItem('token');
    if (token) formData.append("token", token);

    const appendFormData = (key, value) => {
        if (Array.isArray(value)) {
            value.forEach(item => {
                formData.append(`${key}[]`, item);
            });
        } else if (typeof value === 'object' && value !== null) {
            for (let subKey in value) {
                appendFormData(`${key}[${subKey}]`, value[subKey]);
            }
        } else {
            formData.append(key, value);
        }
    };
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            appendFormData(key, data[key]);
        }
    }

    return formData;
}

export async function cekProfile(isMenu = false) {
    let sql = await api("getProfile", { Path: "", isMenu });
    if (sql.status == "gagal") handleLogout();
    return sql;
}

export async function handleLogout() {
    await AsyncStorage.removeItem('token');
    localStorage.removeItem('token');
    if (typeof window !== 'undefined') {
        window.location.reload();
    }
}

export const saiki = function (first = null, hasil = "hari") {
    var today = new Date();
    var dd = first == null ? today.getDate() : first;
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    if (dd < 10) { dd = '0' + dd; }
    if (mm < 10) { mm = '0' + mm; }
    if (hasil == "hari") {
        today = yyyy + '-' + mm + '-' + dd;
    } else if (hasil == "time") {
        today = H + ':' + i + ':' + s;
    } else if (hasil == 'timestamp') {
        today = yyyy + '-' + mm + '-' + dd + " " + H + ':' + i + ':' + s;
    }
    return today;
}

export function tampilBulan(date) {
    let bulan = date.substring(5);
    let tahun = date.substring(0, 4);
    let BulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Dessember"];
    let hasil = `${BulanIndo[bulan - 1]} ${tahun}`;
    return hasil;
}

export function getHariIni() {
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const today = new Date();
    const namaHari = hari[today.getDay()];
    const tanggal = today.getDate();
    const namaBulan = bulan[today.getMonth()];
    const tahun = today.getFullYear();

    return `${namaHari}, ${tanggal} ${namaBulan} ${tahun}`;
}

export const tanggal = (first = 0) => {
    let baseDate = new Date();

    if (typeof first === 'number' && first !== 0) {
        baseDate.setDate(baseDate.getDate() + first);
    }

    let year = baseDate.getFullYear();
    let month = ('0' + (baseDate.getMonth() + 1)).slice(-2);
    let day = ('0' + baseDate.getDate()).slice(-2);

    return `${year}-${month}-${day}`;
};

export const formatTanggal = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';

    let year = date.getFullYear();
    let month = ('0' + (date.getMonth() + 1)).slice(-2);
    let day = ('0' + date.getDate()).slice(-2);

    return `${year}-${month}-${day}`;
};

export const tanggalIndo = function (data, time = false) {
    let d = new Date(data);
    if (isNaN(d.getTime())) return '';

    let year = d.getFullYear();
    let month = ('0' + (d.getMonth() + 1)).slice(-2);
    let day = ('0' + d.getDate()).slice(-2);

    let hasil = [year, month, day].join('-');
    if (hasil === "0000-00-00" || hasil == null) return hasil;

    const BulanIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    let tgl = hasil.substring(8, 10);
    let bln = hasil.substring(5, 7);
    let thn = hasil.substring(2, 4);

    let result = `${tgl} ${BulanIndo[parseInt(bln, 10) - 1]} ${thn}`;

    if (time === true) {
        let jam = ('0' + d.getHours()).slice(-2);
        let menit = ('0' + d.getMinutes()).slice(-2);
        let detik = ('0' + d.getSeconds()).slice(-2);
        result += ` ${jam}:${menit}:${detik}`;
    }

    return result;
};

export const tanggalIndoFull = function (data, time = false) {
    let d = new Date(data);
    if (isNaN(d.getTime())) return '';

    let year = d.getFullYear();
    let month = ('0' + (d.getMonth() + 1)).slice(-2);
    let day = ('0' + d.getDate()).slice(-2);

    let hasil = [year, month, day].join('-');
    if (hasil === "0000-00-00" || hasil == null) return hasil;

    const BulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    let tgl = hasil.substring(8, 10);
    let bln = hasil.substring(5, 7);
    let thn = hasil.substring(0, 4);

    let result = `${tgl} ${BulanIndo[parseInt(bln, 10) - 1]} ${thn}`;

    if (time === true) {
        let jam = ('0' + d.getHours()).slice(-2);
        let menit = ('0' + d.getMinutes()).slice(-2);
        let detik = ('0' + d.getSeconds()).slice(-2);
        result += ` ${jam}:${menit}:${detik}`;
    }

    return result;
};

export const numberFormat = function (ini) {
    var formatter = new Intl.NumberFormat("en-GB", { style: "decimal" });
    var nmr = 0;
    if (isNaN(ini)) {
        nmr = 0;
    } else {
        nmr = ini;
    }
    return formatter.format(nmr.toString().replace(/,/g, ""));
}

export function splitCoor(Lokasi) {
    const [longitude, latitude] = Lokasi.split(",").map(Number);
    return {
        longitude, latitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };
}

export function isBase64(str) {
    const base64ImageRegex = /^data:image\/(jpeg|png|gif|bmp|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/;

    if (!base64ImageRegex.test(str)) {
        return false;
    }

    const parts = str.match(base64ImageRegex);
    const base64Data = parts[2];

    if (base64Data.length < 20) {
        return false;
    }

    return true;
}

export const ESC = {
    CMD: {
        INIT: "\x1B\x40",
        BOLD_ON: "\x1B\x45\x01",
        BOLD_OFF: "\x1B\x45\x00",
        ALIGN_LEFT: "\x1B\x61\x00",
        ALIGN_CENTER: "\x1B\x61\x01",
        ALIGN_RIGHT: "\x1B\x61\x02",
        SIZE_NORMAL: "\x1D\x21\x00",
        SIZE_DOUBLE: "\x1D\x21\x11",
    },

    line: () => "--------------------------------\n",

    formatItem: (name, price) => {
        const maxLen = 32;
        let left = name;
        let right = price;

        let spaces = maxLen - (left.length + right.length);
        if (spaces < 1) spaces = 1;

        return left + " ".repeat(spaces) + right + "\n";
    },
};