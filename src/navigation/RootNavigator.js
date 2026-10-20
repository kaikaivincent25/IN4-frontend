/**
 * RootNavigator - Complete Navigation with Professional Icon Tabs
 * 
 * IMPROVEMENTS:
 * - Uses react-native-vector-icons for professional icons
 * - Proper color states for active/inactive tabs
 * - Better visual hierarchy
 * - Consistent with brand colors
 * - Dynamic height/padding to prevent emulator navigation bar overlap
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Added for safe area handling
import { FONT_UI } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

import { useAuth } from '../context/AuthContext';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ExpertDirectoryScreen from '../screens/ExpertDirectoryScreen';
import SavedArticlesScreen from '../screens/SavedArticlesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import ExpertApplyScreen from '../screens/ExpertApplyScreen';
import ExpertProfileScreen from '../screens/ExpertProfileScreen';
import AdvancedSearchScreen from '../screens/AdvancedSearchScreen';
import ArticlePublishScreen from '../screens/ArticlePublishScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ArticleLibraryScreen from '../screens/ArticleLibraryScreen';
import ArticleReviewQueueScreen from '../screens/ArticleReviewQueueScreen';
import ArticleCommentsScreen from '../screens/ArticleCommentsScreen';
import ConversationInboxScreen from '../screens/ConversationInboxScreen.js';
import ConversationThreadScreen from '../screens/ConversationThreadScreen';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ===== BRAND COLORS =====
const COLORS = {
  BRAND_BLUE: THEME.BRAND_BLUE,
  BRAND_GREEN: THEME.BRAND_GREEN,
  BACKGROUND: THEME.BACKGROUND,
  TEXT_PRIMARY: THEME.TEXT_PRIMARY,
  TEXT_SECONDARY: THEME.TEXT_SECONDARY,
  TEXT_TERTIARY: THEME.TEXT_TERTIARY,
  TAB_BG: THEME.SURFACE,
  TAB_INACTIVE: THEME.TEXT_TERTIARY,
};

// ===== AUTH STACK =====
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
};

// ===== BOTTOM TAB NAVIGATOR =====
const BottomTabs = () => {
  const insets = useSafeAreaInsets(); // Get dynamic safe area insets

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: COLORS.TAB_BG,
          borderTopWidth: 1,
          borderTopColor: THEME.BORDER_LIGHT || THEME.BORDER,
          height: 66 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.BRAND_GREEN,
        tabBarInactiveTintColor: COLORS.TAB_INACTIVE,
        tabBarLabelStyle: {
          fontFamily: FONT_UI,
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          letterSpacing: 0.3,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      })}
    >
      {/* Main discovery destination */}
      <Tab.Screen
        name="HomeTab"
        component={ExpertDirectoryScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
              <Feather name="compass" size={size || 21} color={color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="ArticlesTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Articles',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
              <Feather name="book-open" size={size || 21} color={color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="ChatsTab"
        component={ConversationInboxScreen}
        options={{
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
              <Feather name="message-circle" size={size || 21} color={color} />
            </View>
          ),
        }}
      />

      {/* Profile Tab - Account */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
              <Feather name="user" size={size || 21} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIcon: {
    width: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconFocused: {
    backgroundColor: THEME.PALE_GREEN,
  },
});


// ===== HOME STACK (contains tabs + detail screens) =====
const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Bottom tabs as main navigation */}
      <Stack.Screen
        name="MainTabs"
        component={BottomTabs}
        options={{ animationEnabled: false }}
      />

      {/* Detail screens (modal-style) */}
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={{
          presentation: 'modal',
          animationEnabled: true,
          cardStyle: { backgroundColor: 'transparent' },
          cardOverlayEnabled: true,
        }}
      />

      <Stack.Screen
        name="AdvancedSearch"
        component={AdvancedSearchScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />

      <Stack.Screen
        name="ExpertApply"
        component={ExpertApplyScreen}
        options={{
          presentation: 'modal',
          animationEnabled: true,
        }}
      />

      <Stack.Screen
        name="ExpertProfile"
        component={ExpertProfileScreen}
        options={{
          presentation: 'modal',
          animationEnabled: true,
        }}
      />

      <Stack.Screen
        name="SavedArticles"
        component={SavedArticlesScreen}
        options={{ presentation: 'modal', animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="ArticlePublish"
        component={ArticlePublishScreen}
        options={{
          presentation: 'modal',
          animationEnabled: true,
        }}
      />

      <Stack.Screen
        name="ArticleLibrary"
        component={ArticleLibraryScreen}
        options={{ presentation: 'modal', animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="ArticleReviewQueue"
        component={ArticleReviewQueueScreen}
        options={{ presentation: 'modal', animation: 'slide_from_right' }}
      />

      <Stack.Screen name="ArticleComments" component={ArticleCommentsScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
      <Stack.Screen name="ConversationInbox" component={ConversationInboxScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
      <Stack.Screen name="ConversationThread" component={ConversationThreadScreen} options={{ presentation: 'modal', animation: 'slide_from_right' }} />
      
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          presentation: 'modal',
          animationEnabled: true,
        }}
      />
      
    </Stack.Navigator>
    



  );



};

// ===== ROOT NAVIGATOR =====
export const RootNavigator = () => {
  const { isLoading, userToken } = useAuth();

  return (
    <NavigationContainer>
      {isLoading ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      ) : userToken ? (
        <HomeStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};
