import { images } from "@/constants/images";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { setColorScheme } = useColorScheme();

  // ------------------------------
  // Load saved data on start
  // ------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedGlasses = await AsyncStorage.getItem("glasses");
        const savedGoal = await AsyncStorage.getItem("goal");
        const savedTheme = await AsyncStorage.getItem("theme");

        if (savedGlasses !== null) setGlasses(Number(savedGlasses));
        if (savedGoal !== null) setGoal(Number(savedGoal));

        // Force apply theme on app start
        if (savedTheme === "dark" || savedTheme === "light") {
          setTheme(savedTheme);
          setColorScheme(savedTheme); // tell nativewind to use your saved theme
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);


  // Save glasses when it changes
  useEffect(() => {
    AsyncStorage.setItem("glasses", glasses.toString());
  }, [glasses]);

  // Save goal when it changes
  useEffect(() => {
    AsyncStorage.setItem("goal", goal.toString());
  }, [goal]);

  // Save theme when it changes
  useEffect(() => {
    AsyncStorage.setItem("theme", theme);
  }, [theme]);

  // Check goal completion
  useEffect(() => {
    if (glasses > 0 && glasses === goal) {
      setShowCompletionModal(true);
    }
  }, [glasses, goal]);

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
    setColorScheme(newTheme); // update nativewind globally
    AsyncStorage.setItem("theme", newTheme); // persist instantly
  };

  const progressPercentage = Math.min((glasses / goal) * 100, 100);

  return (
    <View className="flex-1 justify-center items-center bg-blue-100 px-6 dark:bg-neutral-900">
      {/* Theme Toggle */}
      <View className="absolute top-8 right-4 items-center">
        <Switch value={theme === "dark"} onChange={toggleTheme} />
        <Text className="text-sm dark:text-white text-black">
          {theme === "dark" ? "Dark" : "Light"}
        </Text>
      </View>

      {/* App Title */}
      <Text className="font-bold text-4xl dark:text-white">
        Water Tracker
      </Text>
      <Image source={images.glass} className="w-20 h-20" resizeMode="contain" />

      <Text className="text-2xl dark:text-white my-4">
        {glasses} / {goal} glasses
      </Text>

      {/* Progress Bar */}
      <View className="w-full bg-gray-300 rounded-full h-4 mb-6">
        <View
          className="bg-blue-500 h-4 rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
      </View>

      {/* Progress Percentage */}
      <Text className="text-lg mb-6 dark:text-gray-400 text-gray-600">
        {Math.round(progressPercentage)}% Complete
      </Text>

      {/* Add Glass Button */}
      <Pressable
        className="bg-blue-500 px-20 py-3 rounded-xl shadow-md active:opacity-80 mb-4"
        onPress={addGlass}
      >
        <Text className="text-white text-lg font-bold">+1 Glass</Text>
      </Pressable>

      {/* Set Goal Button */}
      <Pressable
        className="bg-green-500 px-20 py-3 rounded-xl shadow-md active:opacity-80 mb-4"
        onPress={() => {
          setNewGoal(goal.toString());
          setShowGoalModal(true);
        }}
      >
        <Text className="text-white text-lg font-bold">Set Goal</Text>
      </Pressable>

      {/* Reset Button */}
      <Pressable
        className="bg-gray-500 px-20 py-3 rounded-xl shadow-md active:opacity-80"
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
          <View className="bg-white p-6 rounded-xl mx-6 w-80 dark:bg-neutral-800">
            <Text className="text-xl font-bold mb-4 text-center dark:text-white">
              Set Your Daily Goal
            </Text>

            <Text className="text-gray-600 mb-2 dark:text-gray-400">
              Glasses per day:
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-lg mb-4 dark:bg-neutral-700 dark:text-white"
              value={newGoal}
              onChangeText={setNewGoal}
              keyboardType="numeric"
              placeholder="Enter goal (1-20)"
              maxLength={2}
            />

            <View className="flex-row justify-between">
              <Pressable
                className="bg-gray-500 px-6 py-3 rounded-lg flex-1 mr-2"
                onPress={() => setShowGoalModal(false)}
              >
                <Text className="text-white text-center font-bold">Cancel</Text>
              </Pressable>

              <Pressable
                className="bg-blue-500 px-6 py-3 rounded-lg flex-1 ml-2"
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
          <View className="bg-white p-8 rounded-xl mx-6 items-center dark:bg-neutral-800">
            <Text className="text-6xl mb-4">🎉</Text>
            <Text className="text-2xl font-bold mb-2 text-center dark:text-white">
              Goal Completed!
            </Text>
            <Text className="text-lg text-gray-600 mb-6 text-center dark:text-gray-400">
              Congratulations! You've reached your daily water goal of {goal} glasses!
            </Text>

            <Pressable
              className="bg-blue-500 px-8 py-3 rounded-lg"
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
