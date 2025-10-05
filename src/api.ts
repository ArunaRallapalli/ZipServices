// frontend/src/api.ts
import { Alert } from "react-native";

const API_URL = "http://10.0.2.2:5000"; // Use your backend URL for Android Emulator

export type SignUpPayload = {
  name: string;
  email: string;
  password: string;
};

export type ApiResponse<T> = {
  message: string;
  user?: T;
};

// Generic function to handle POST requests
async function post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const rawText = await response.text();

    let json: ApiResponse<T>;
    try {
      json = JSON.parse(rawText);
    } catch {
      json = { message: rawText };
    }

    if (!response.ok) {
      throw new Error(json.message || `Request failed with status ${response.status}`);
    }

    return json;
  } catch (err: any) {
    console.error(`API ${endpoint} error:`, err);
    throw err;
  }
}

// Quick ping test
export async function pingBackend() {
  try {
    const res = await fetch(`${API_URL}/ping`);
    const data = await res.json();
    console.log("✅ Backend reachable:", data);
  } catch (err) {
    console.error("❌ Backend unreachable:", err);
    Alert.alert("Backend Test Failed", "Cannot reach backend. Check server and network.");
  }
}

// Sign up
export async function registerUser(payload: SignUpPayload) {
  return post("/auth/register", payload);
}

export default API_URL;
