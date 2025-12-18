import AsyncStorage from "@react-native-async-storage/async-storage";


export const storage = {
async get(key: string, fallback: any = null) {
try {
const raw = await AsyncStorage.getItem(key);
return raw ? JSON.parse(raw) : fallback;
} catch (e) {
return fallback;
}
},
async set(key: string, data: any) {
try {
await AsyncStorage.setItem(key, JSON.stringify(data));
} catch (e) {}
}
};

