import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:8080";
const NODE_ADDRESS = process.env.NODE_ADDRESS || "127.0.0.1:9090";

export const registerWithServer = async () => {
    try {
        const response = await axios.post(`${API_URL}/register`, { address: NODE_ADDRESS });
        console.log("Registered with API Server:", response.data);
    } catch (error) {
        console.error("Failed to register node:", error);
    }
};
