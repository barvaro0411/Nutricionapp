import React from "react";
import { Stack } from "expo-router";
import RootLayout from "../../../app/_layout";

const mockReplace = jest.fn();
const mockEffects: Array<() => unknown> = [];
let mockSegments = ["(auth)", "login"];
let mockAuth: {
  session: { user: { id: string } } | null;
  profile: null;
  isLoading: boolean;
  isRecoveringPassword: boolean;
};

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useEffect: (effect: () => unknown) => { mockEffects.push(effect); },
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value === false ? true : value, jest.fn()],
}));
jest.mock("expo-router", () => ({
  Stack: Object.assign(jest.fn(), { Screen: jest.fn() }),
  useRouter: () => ({ replace: mockReplace }),
  useSegments: () => mockSegments,
}));
jest.mock("react-native", () => ({
  View: "View", Text: "Text", TouchableOpacity: "TouchableOpacity",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (styles: unknown) => styles },
  Platform: { OS: "web" },
}));
jest.mock("expo-linking", () => ({}));
jest.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));
jest.mock("@tanstack/react-query", () => ({
  QueryClient: jest.fn(), QueryClientProvider: "QueryClientProvider",
}));
jest.mock("@/services/supabase", () => ({ configurationError: null }));
jest.mock("@/stores/useAuthStore", () => ({ useAuthStore: () => mockAuth }));
jest.mock("@/stores/useMealReviewStore", () => ({}));
jest.mock("@/services/notificationService", () => ({}));
jest.mock("@/components/common/ToastContainer", () => ({ ToastContainer: "ToastContainer" }));

function renderNavigation() {
  const root = RootLayout();
  return root.props.children.type() as React.ReactElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEffects.length = 0;
  mockSegments = ["(auth)", "login"];
  mockAuth = {
    session: { user: { id: "owner" } }, profile: null,
    isLoading: false, isRecoveringPassword: false,
  };
});

test("navigation opens the home when remounted after loading the login profile", () => {
  const tree = renderNavigation();
  const stack = React.Children.toArray(tree.props.children).find(
    child => React.isValidElement(child) && child.type === Stack,
  ) as React.ReactElement;
  expect(stack.props.initialRouteName).toBe("(tabs)");
  const screens = React.Children.toArray(stack.props.children) as React.ReactElement[];
  expect(screens[0].props.name).toBe("(tabs)");
});

test("successful login redirects home even with an incomplete profile", () => {
  renderNavigation();
  mockEffects[mockEffects.length - 1]();
  expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
});

test("a signed-in user can still open meal review during normal navigation", () => {
  mockSegments = ["meal", "review"];
  renderNavigation();
  mockEffects[mockEffects.length - 1]();
  expect(mockReplace).not.toHaveBeenCalled();
});

test("signed-out users on meal review are sent to login", () => {
  mockSegments = ["meal", "review"];
  mockAuth.session = null;
  renderNavigation();
  mockEffects[mockEffects.length - 1]();
  expect(mockReplace).toHaveBeenCalledWith("/(auth)/login");
});

test("password recovery retains its dedicated destination", () => {
  mockAuth.isRecoveringPassword = true;
  renderNavigation();
  mockEffects[mockEffects.length - 1]();
  expect(mockReplace).toHaveBeenCalledWith("/reset-password");
});
