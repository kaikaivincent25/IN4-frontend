/**
 * App.js - Root component
 * 
 * Wraps everything in providers:
 * - AuthProvider: Global auth state
 * - GestureHandlerRootView: Required by React Navigation
 * - RootNavigator: Navigation logic
 */

import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import TestingDisclaimer from './src/components/TestingDisclaimer';

export default function App() {
  const [testingAcknowledged, setTestingAcknowledged] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {testingAcknowledged ? (
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        ) : (
          <TestingDisclaimer onAcknowledge={() => setTestingAcknowledged(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}