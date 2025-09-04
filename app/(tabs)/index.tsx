import { images } from "@/constants/images";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Appearance,
  Image,
  Modal,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

export default function App() {
  const [glasses, setGlasses] = useState(0);
  const [goal, setGoal] = useState(8);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [newGoal, setNewGoal] = useState("8");
  const [isLoading, setIsLoading] = useState(true);

  // Theme state - initialize with system theme as fallback
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { setColorScheme } = useColorScheme();

  // ------------------------------
  // Helper function to get today's date string
  // ------------------------------
  const getTodayDateString = () => {
    const today = new Date();
    return today.toDateString(); // Returns format like "Wed Jan 01 2025"
  };

  // ------------------------------
  // Initialize theme first (before other data loading)
  // ------------------------------
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme");
        let initialTheme: "light" | "dark" = "light";
        
        if (savedTheme === "dark" || savedTheme === "light") {
          initialTheme = savedTheme;
        } else {
          // Fallback to system theme if no saved theme
          const systemTheme = Appearance.getColorScheme();
          initialTheme = systemTheme === "dark" ? "dark" : "light";
        }
        
        setTheme(initialTheme);
        setColorScheme(initialTheme);
      } catch (error) {
        console.error("Error initializing theme:", error);
        // Fallback to system theme on error
        const systemTheme = Appearance.getColorScheme();
        const fallbackTheme: "light" | "dark" = systemTheme === "dark" ? "dark" : "light";
        setTheme(fallbackTheme);
        setColorScheme(fallbackTheme);
      }
    };
    
    initializeTheme();
  }, []);

  // ------------------------------
  // Check if we need to reset glasses for new day
  // ------------------------------
  const checkAndResetForNewDay = async () => {
    try {
      const lastSavedDate = await AsyncStorage.getItem("lastDate");
      const today = getTodayDateString();
      
      if (lastSavedDate && lastSavedDate !== today) {
        // It's a new day, reset glasses
        setGlasses(0);
        await AsyncStorage.setItem("glasses", "0");
      }
      
      // Update the last saved date
      await AsyncStorage.setItem("lastDate", today);
    } catch (error) {
      console.error("Error checking date:", error);
    }
  };

  // ------------------------------
  // Load saved data on start (after theme is initialized)
  // ------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        // First check if we need to reset for new day
        await checkAndResetForNewDay();
        
        const savedGlasses = await AsyncStorage.getItem("glasses");
        const savedGoal = await AsyncStorage.getItem("goal");

        if (savedGlasses !== null) setGlasses(Number(savedGlasses));
        if (savedGoal !== null) setGoal(Number(savedGoal));

        // Small delay to ensure theme is fully applied before showing UI
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
        
      } catch (error) {
        console.error("Error loading data:", error);
        setIsLoading(false);
      }
    };
    
    // Only load data after a brief delay to ensure theme is set
    const timer = setTimeout(loadData, 50);
    return () => clearTimeout(timer);
  }, []);

  // ------------------------------
  // Set up interval to check for midnight reset
  // ------------------------------
  useEffect(() => {
    // Check every minute if it's a new day
    const interval = setInterval(async () => {
      await checkAndResetForNewDay();
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Save glasses when it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem("glasses", glasses.toString()).catch(error => {
        console.error("Error saving glasses:", error);
      });
    }
  }, [glasses, isLoading]);

  // Save goal when it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem("goal", goal.toString()).catch(error => {
        console.error("Error saving goal:", error);
      });
    }
  }, [goal, isLoading]);

  // Save theme when it changes (with error handling)
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem("theme", theme);
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    };
    
    // Only save if theme is valid and not during initial loading
    if ((theme === "dark" || theme === "light") && !isLoading) {
      saveTheme();
    }
  }, [theme, isLoading]);

  // Check goal completion
  useEffect(() => {
    if (glasses > 0 && glasses === goal && !isLoading) {
      setShowCompletionModal(true);
    }
  }, [glasses, goal, isLoading]);

  // ------------------------------
  // Handlers
  // ------------------------------
  const addGlass = () => setGlasses(glasses + 1);
  const resetGlasses = () => setGlasses(0);

  const updateGoal = () => {
    const goalValue = parseInt(newGoal);
    if (goalValue > 0 && goalValue <= 20) {
      setGoal(goalValue);
      setShowGoalModal(false);
    } else {
      Alert.alert("Invalid Goal", "Please enter a goal between 1 and 20 glasses.");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    setColorScheme(newTheme);
  };

  const progressPercentage = Math.min((glasses / goal) * 100, 100);

  // Loading screen
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-blue-100 dark:bg-neutral-900">
        <Text className="text-lg dark:text-white text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center bg-blue-100 px-6 dark:bg-neutral-900">
      {/* Theme Toggle */}
      <View className="absolute top-8 right-4 items-center">
        <Switch 
          value={theme === "dark"} 
          onValueChange={toggleTheme}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={theme === "dark" ? "#f5dd4b" : "#f4f3f4"}
        />
        <Text className="text-sm dark:text-white text-black mt-1">
          {theme === "dark" ? "Dark" : "Light"}
        </Text>
      </View>

      {/* App Title */}
      <Text className="font-bold text-4xl dark:text-white text-blue-900 mb-4">
        Water Tracker
      </Text>
      <Image source={images.glass} className="w-20 h-20 mb-4" resizeMode="contain" />

      <Text className="text-2xl dark:text-white text-blue-800 my-4">
        {glasses} / {goal} glasses
      </Text>

      {/* Progress Bar */}
      <View className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-4 mb-6">
        <View
          className="bg-blue-500 h-4 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </View>

      {/* Progress Percentage */}
      <Text className="text-lg mb-6 dark:text-gray-400 text-gray-600">
        {Math.round(progressPercentage)}% Complete
      </Text>

      {/* Add Glass Button */}
      <Pressable
        className="bg-blue-500 px-20 py-3 rounded-xl shadow-md active:opacity-80 mb-4 active:scale-95"
        onPress={addGlass}
      >
        <Text className="text-white text-lg font-bold">+1 Glass</Text>
      </Pressable>

      {/* Set Goal Button */}
      <Pressable
        className="bg-green-500 px-20 py-3 rounded-xl shadow-md active:opacity-80 mb-4 active:scale-95"
        onPress={() => {
          setNewGoal(goal.toString());
          setShowGoalModal(true);
        }}
      >
        <Text className="text-white text-lg font-bold">Set Goal</Text>
      </Pressable>

      {/* Reset Button */}
      <Pressable
        className="bg-gray-500 px-20 py-3 rounded-xl shadow-md active:opacity-80 active:scale-95"
        onPress={resetGlasses}
      >
        <Text className="text-white text-lg font-bold">Reset</Text>
      </Pressable>

      {/* Goal Setting Modal */}
      <Modal
        visible={showGoalModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-xl mx-6 w-80 dark:bg-neutral-800 shadow-xl">
            <Text className="text-xl font-bold mb-4 text-center dark:text-white text-gray-800">
              Set Your Daily Goal
            </Text>

            <Text className="text-gray-600 mb-2 dark:text-gray-400">
              Glasses per day:
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-lg mb-4 dark:bg-neutral-700 dark:text-white bg-gray-50"
              value={newGoal}
              onChangeText={setNewGoal}
              keyboardType="numeric"
              placeholder="Enter goal (1-20)"
              placeholderTextColor={theme === "dark" ? "#9CA3AF" : "#6B7280"}
              maxLength={2}
            />

            <View className="flex-row justify-between">
              <Pressable
                className="bg-gray-500 px-6 py-3 rounded-lg flex-1 mr-2 active:opacity-80"
                onPress={() => setShowGoalModal(false)}
              >
                <Text className="text-white text-center font-bold">Cancel</Text>
              </Pressable>

              <Pressable
                className="bg-blue-500 px-6 py-3 rounded-lg flex-1 ml-2 active:opacity-80"
                onPress={updateGoal}
              >
                <Text className="text-white text-center font-bold">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Goal Completion Modal */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 dark:bg-black/70">
          <View className="bg-white p-8 rounded-xl mx-6 items-center dark:bg-neutral-800 shadow-xl">
            <Text className="text-6xl mb-4">🎉</Text>
            <Text className="text-2xl font-bold mb-2 text-center dark:text-white text-gray-800">
              Goal Completed!
            </Text>
            <Text className="text-lg text-gray-600 mb-6 text-center dark:text-gray-400">
              Congratulations! You've reached your daily water goal of {goal} glasses!
            </Text>

            <Pressable
              className="bg-blue-500 px-8 py-3 rounded-lg active:opacity-80"
              onPress={() => setShowCompletionModal(false)}
            >
              <Text className="text-white text-lg font-bold">Awesome!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}