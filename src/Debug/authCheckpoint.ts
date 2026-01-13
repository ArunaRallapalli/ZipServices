// debug/authCheckpoint.ts
export const authCheckpoint = (
  location: string,
  auth: any,
  feature?: string
) => {
  console.log(`🔐 AUTH CHECKPOINT [${location}]`, {
    feature,
    initialized: auth.initialized,
    isAuthenticated: auth.isAuthenticated,
    userId: auth.userId,
    hasToken: !!auth.userToken,
    timestamp: new Date().toISOString()
  });
};
