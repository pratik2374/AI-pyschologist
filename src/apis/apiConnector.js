import axios from "axios";

export const apiConnector = async (method, url, body = {}, headers = {}) => {
  try {
    const response = await axios({
      method,
      url,
      data: body,
      headers: {
        "Content-Type": "application/json", 
        ...headers,
      },
      withCredentials: true, 
    });
    return response;
  } catch (error) {
    console.error("API Connector Error:", error?.response || error.message);
    throw error?.response || error;
  }
};
