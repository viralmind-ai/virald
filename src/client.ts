const API_URL = process.env.API_URL || "http://localhost:8080";
const NODE_ADDRESS = process.env.NODE_ADDRESS || "127.0.0.1:9090";

export const registerWithServer = async () => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      body: JSON.stringify({ address: NODE_ADDRESS }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw Error(`Eerror ${response.status}: ${response.statusText}`);
    }
    console.log("Registered with API Server:", await response.json());
  } catch (error) {
    console.error("Failed to register node:", error);
  }
};
