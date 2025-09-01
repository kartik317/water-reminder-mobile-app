import { icons } from '@/constants/icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Tabs } from 'expo-router';
import { useColorScheme } from "nativewind";
import React from "react";
import { Image, View } from "react-native";

const TabIcon = ({ icon, color }: any) => {
  return (
    <View>
      <Image source={icon} style={{ tintColor: color }} />
    </View>
  );
};

export default function Layout() {
  const { colorScheme } = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "dodgerblue",
          tabBarInactiveTintColor: "gray",
          tabBarStyle: {
            backgroundColor: colorScheme === "dark" ? "#111827" : "#c3f8ff",
            borderTopWidth: 0,
            height: 60,
          },
          headerStyle: {
            backgroundColor: colorScheme === "dark" ? "#111827" : "#c3f8ff",
          },
          headerTintColor: colorScheme === "dark" ? "#fff" : "#000",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerShown: false,
            title: "Water Tracker",
            tabBarIcon: ({ color }) => (
              <TabIcon icon={icons.glassCup} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scheduleScreen"
          options={{
            headerShown: false,
            title: "Schedule",
            tabBarIcon: ({ color }) => (
              <TabIcon icon={icons.clock} color={color} />
            ),
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}
