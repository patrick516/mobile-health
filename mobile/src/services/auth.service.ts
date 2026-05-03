import apiClient from "../lib/apiClient";

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  date_of_birth?: string;
  gender?: string;
  country?: string;
  district?: string;
  town?: string;
}) => {
  const response = await apiClient.post("/mobile/auth/register", data);
  return response.data;
};

export const loginUser = async (email: string, password: string) => {
  const response = await apiClient.post("/mobile/auth/login", {
    email,
    password,
  });
  return response.data;
};

export const logoutUser = async () => {
  const response = await apiClient.post("/mobile/auth/logout");
  return response.data;
};

export const refreshToken = async () => {
  const response = await apiClient.post("/mobile/auth/refresh");
  return response.data;
};
