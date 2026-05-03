export const loginUser = async (email: string, password: string) => {
  // TODO: Replace with real API call later

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        user: {
          id: "1",
          name: "Patrick",
          email,
        },
        token: "fake-jwt-token",
      });
    }, 1000); // simulate network delay
  });
};
