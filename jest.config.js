module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/scripts/jest-webcrypto.cjs"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "babel-jest",
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^npm:zod@3.24.1$": "zod",
    "^npm:@supabase/supabase-js@2.117.2$": "@supabase/supabase-js",
  },
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/supabase/\\.private/"],
  modulePathIgnorePatterns: ["<rootDir>/supabase/\\.private/"],
};
