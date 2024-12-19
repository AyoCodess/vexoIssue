import "../global.css";

import {
  Slot,
  useNavigationContainerRef
} from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-get-random-values";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ToastProvider } from "react-native-toastier";
import { modalStack } from "../modalConfig";

import NetworkStatusModal from "@/components/Modals/NetworkStatusModal";
import { useInAppPurchasesStore } from '@/store/useInAppPurchasesStore';
import { useUserConfigStore } from "@/store/useUserConfigStore";
import { suppressGestureHandlerWarnings } from '@/utils/supressWarnings';
import { ClerkProvider,useAuth } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { isRunningInExpoGo } from "expo";
import { useFonts } from "expo-font";
import { PostHogProvider } from "posthog-react-native";
import React,{ useCallback,useEffect } from "react";
import { Platform } from 'react-native';
import { ModalProvider } from 'react-native-modalfy';
import { OneSignal } from "react-native-onesignal";
import Purchases from 'react-native-purchases';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { vexo } from 'vexo-analytics';


// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false // Reanimated runs in strict mode by default
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from "expo-router";

// SplashScreen.preventAutoHideAsync();
// Prevent the splash screen from auto-hiding before App component is mounted

suppressGestureHandlerWarnings();

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string,value: string) {
    try {
      return SecureStore.setItemAsync(key,value);
    } catch (err) {
      return;
    }
  },
};

// Construct a new instrumentation instance. This is needed to communicate between the integration and React
const reactNavigationIntegration = Sentry.reactNavigationIntegration();

//?  eas update metadata - tag your scope with information about your update allows you to see errors happening on certain updates
const manifest = Updates.manifest;
const metadata = "metadata" in manifest ? manifest.metadata : undefined;
const extra = "extra" in manifest ? manifest.extra : undefined;
const updateGroup =
  metadata && "updateGroup" in metadata ? metadata.updateGroup : undefined;

Sentry.init({
  dsn: "https://af1951c9021eaf80833800fce1f5d642@o4507328272203776.ingest.de.sentry.io/4507627920883792",
  enabled: process.env.NODE_ENV === 'production',
  enableNativeFramesTracking: !isRunningInExpoGo(),

  // attachScreenshot: true,
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production.
  spotlight: process.env.NODE_ENV !== "production",
  tracesSampleRate: 1.0,
  _experiments: {
    // profilesSampleRate is relative to tracesSampleRate.
    // Here, we'll capture profiles for 100% of transactions.
    profilesSampleRate: 1.0,
  },
  integrations: [
    reactNavigationIntegration
  ],
});

//TODO  EXPO DOCS NEED TO BE UPDATED url:  https://docs.expo.dev/guides/using-sentry/ 
// Sentry.configureScope((scope) => {
//   scope.setTag("expo-update-id",Updates.updateId);
//   scope.setTag("expo-is-embedded-update",Updates.isEmbeddedLaunch);

//   if (typeof updateGroup === "string") {
//     scope.setTag("expo-update-group-id",updateGroup);

//     const owner = extra?.expoClient?.owner ?? "[account]";
//     const slug = extra?.expoClient?.slug ?? "[project]";
//     scope.setTag(
//       "expo-update-debug-url",
//       `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`,
//     );
//   } else if (Updates.isEmbeddedLaunch) {
//     // This will be `true` if the update is the one embedded in the build, and not one downloaded from the updates server.
//     scope.setTag(
//       "expo-update-debug-url",
//       "not applicable for embedded updates",
//     );
//   }
// });

//* one signal
// Remove this method to stop OneSignal Debugging
// OneSignal.Debug.setLogLevel(LogLevel.Verbose);
// OneSignal Initialization
OneSignal.initialize("SOMEURL");

function Root() {

  const [fontsLoaded,fontError] = useFonts({
    ggBlack: require("../../assets/fonts/GalanoGrotesqueAltBlack.otf"),
    ggBold: require("../../assets/fonts/GalanoGrotesqueAltBold.otf"),
    ggBoldItalic: require("../../assets/fonts/GalanoGrotesqueAltBoldItalic.otf"),
    ggExtraBold: require("../../assets/fonts/GalanoGrotesqueAltExtraBold.otf"),
    ggExtraLight: require("../../assets/fonts/GalanoGrotesqueAltExtraLight.otf"),
    ggLight: require("../../assets/fonts/GalanoGrotesqueAltLight.otf"),
    ggMedium: require("../../assets/fonts/GalanoGrotesqueAltMedium.otf"),
    ggMediumItalic: require("../../assets/fonts/GalanoGrotesqueAltMediumItalic.otf"),
    ggRegular: require("../../assets/fonts/GalanoGrotesqueAltRegular.otf"),
    ggSemiBold: require("../../assets/fonts/GalanoGrotesqueAltSemiBold.otf"),
    ggSemiBoldItalic: require("../../assets/fonts/GalanoGrotesqueAltSemiBoldItalic.otf"),
    ggThin: require("../../assets/fonts/GalanoGrotesqueAltThin.otf"),
    ggItalic: require("../../assets/fonts/GalanoGrotesqueAltItalic.otf"),
  });

  //* Capture the NavigationContainer ref and register it with the instrumentation.
  const ref = useNavigationContainerRef();

  useEffect(() => {
    if (ref) {
      reactNavigationIntegration.registerNavigationContainer(ref);
    }
  },[ref]);

  //*  check if clerk and convex are set up
  if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_DEV_KEY) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_DEV_KEY is not set");
  }
  if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_PROD_KEY) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_PROD_KEY is not set");
  }
  if (!process.env.EXPO_PUBLIC_CONVEX_DEV_DB_URL) {
    throw new Error("EXPO_PUBLIC_CONVEX_DEV_DB_URL is not set");
  }

  if (!process.env.EXPO_PUBLIC_CONVEX_PROD_DB_URL) {
    throw new Error("EXPO_PUBLIC_CONVEX_PROD_DB_URL is not set");
  }
  if (!process.env.EXPO_PUBLIC_POST_HOG_API_KEY) {
    throw new Error("EXPO_PUBLIC_POST_HOG_API_KEY is not set");
  }

  if (!process.env.EXPO_PUBLIC_VEXO_API_KEY) {
    throw new Error("EXPO_PUBLIC_VEXO_API_KEY is not set");
  }

  if (!process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY) {
    throw new Error("EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY is not set");
  }

  if (!process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY) {
    throw new Error("EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY is not set");
  }

  if (!process.env.EXPO_PUBLIC_VEXO_API_KEY) {
    throw new Error("EXPO_PUBLIC_VEXO_API_KEY is not set");
  }


  if (process.env.NODE_ENV === "production") {
    vexo(process.env.EXPO_PUBLIC_VEXO_API_KEY);
  }

  const revenueCatAPIKeys = {
    apple: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY,
    google: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
  };

  const currentEnvironment = useUserConfigStore((state) => state.environment);

  let convex = new ConvexReactClient(
    process.env.EXPO_PUBLIC_CONVEX_PROD_DB_URL,
    {
      unsavedChangesWarning: false,
      // verbose: true,
    },
  );

  const setCurrentOffering = useInAppPurchasesStore((state) => state.setCurrentOffering);

  useEffect(() => {
    async function setup() {

      if (!revenueCatAPIKeys.apple || !revenueCatAPIKeys.google) {
        throw new Error("RevenueCat API keys not configured");
      }

      if (Platform.OS == "android") {
        await Purchases.configure({ apiKey: revenueCatAPIKeys.google });
      } else {
        await Purchases.configure({ apiKey: revenueCatAPIKeys.apple });
      }

      const offerings = await Purchases.getOfferings();
      setCurrentOffering(offerings.current);
    }

    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

    setup()
      .catch(console.log);
  },[revenueCatAPIKeys]);

  if (currentEnvironment === "development") {
    convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_DEV_DB_URL,{
      unsavedChangesWarning: false,
      // verbose: true,
    });
  }


  //* load fonts
  const onLayoutRootView = useCallback(async () => {
    if (fontError) {
      Sentry.captureException(fontError);
    }
  },[fontError]);


  // Simplifying the condition to return null if fonts are not loaded and no font error occurred
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POST_HOG_API_KEY}
      options={{
        host: "https://us.i.posthog.com",
        disabled: process.env.NODE_ENV !== "production",
        enableSessionReplay: false,
      }}
    >
      <ClerkProvider
        tokenCache={tokenCache}
        publishableKey={currentEnvironment === "development" ? process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_DEV_KEY : process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_PROD_KEY}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <GestureHandlerRootView
            onLayout={onLayoutRootView}
            style={{ flex: 1 }}
          >
            <ToastProvider>
              <KeyboardProvider>
                <NetworkStatusModal />
                <ModalProvider stack={modalStack}>
                  <Slot />
                </ModalProvider>
              </KeyboardProvider>
            </ToastProvider>
          </GestureHandlerRootView>
          {/* <Toast config={toastConfig} visibilityTime={4000} /> */}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </PostHogProvider>
  );
}

export default process.env.NODE_ENV === 'development' ? Root : Sentry.wrap(Root);
