// frontend/SignUpService.ts
import API_URL from "../../api";

export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export const pingBackend = async () => {
  try {
    const res = await fetch(`${API_URL}/ping`);
    const data = await res.json();
    console.log("✅ Backend reachable:", data);
    return data;
  } catch (err) {
    console.error("❌ Backend unreachable:", err);
    throw err;
  }
};

export const registerUser = async (user: SignUpData) => {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      throw new Error(data.message || `Signup failed (status ${res.status})`);
    }

    return data;
  } catch (err) {
    console.error("Signup error:", err);
    throw err;
  }
};
