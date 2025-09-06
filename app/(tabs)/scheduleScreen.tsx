import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { configureReanimatedLogger } from 'react-native-reanimated';

configureReanimatedLogger({
  strict: false,
});


// ✅ global notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // show banner popup
    shouldShowList: true,   // show in notification center
  }),
});

interface NotificationTimer {
  id: number;
  name: string;
  hour: number;
  minute: number;
  isActive: boolean;
  notificationId?: string | null; // <-- allow null also
}


export default function TimerScreen() {
  const [timers, setTimers] = useState<NotificationTimer[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingTimer, setEditingTimer] = useState<NotificationTimer | null>(null);
  const [newTimerName, setNewTimerName] = useState<string>("");
  const [newTimerHour, setNewTimerHour] = useState<string>("8");
  const [newTimerMinute, setNewTimerMinute] = useState<string>("00");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request notification permissions when component mounts
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive water reminders.',
          [{ text: 'OK' }]
        );
      }
    };

    requestPermissions();
  }, []);

  // Schedule a daily repeating notification
  const scheduleNotification = async (timer: NotificationTimer): Promise<string | null> => {
    try {
      // Cancel existing notification if it exists
      if (timer.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(timer.notificationId);
      }

      // Create the trigger time for today
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(timer.hour, timer.minute, 0, 0);

      // If the time has already passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      // Schedule the notification with daily repeat
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💧 Time to Drink Water!",
          body: `${timer.name} - Stay hydrated and healthy!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: "water-reminder",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: timer.hour,
          minute: timer.minute,
        },
      });

      //console.log(`Scheduled notification ${notificationId} for ${timer.name} at ${timer.hour}:${timer.minute}`);
      return notificationId;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return null;
    }
  };

  // Cancel a scheduled notification
  const cancelNotification = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      //console.log(`Cancelled notification ${notificationId}`);
    } catch (error) {
      console.error("Error cancelling notification:", error);
    }
  };

  // Load saved timers when app starts
  useEffect(() => {
    const loadTimers = async () => {
      try {
        const savedTimers = await AsyncStorage.getItem("notification_timers");
        if (savedTimers !== null) {
          const parsedTimers: NotificationTimer[] = JSON.parse(savedTimers);

          // cancel everything first (to avoid duplicates)
          const pending = await Notifications.getAllScheduledNotificationsAsync();
          for (const n of pending) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
          }

          // reschedule fresh
          for (const timer of parsedTimers) {
            if (timer.isActive) {
              const newNotificationId = await scheduleNotification(timer);
              if (newNotificationId) {
                timer.notificationId = newNotificationId;
              }
            }
          }

          setTimers(parsedTimers);
          await AsyncStorage.setItem("notification_timers", JSON.stringify(parsedTimers));
        }
      } catch (error) {
        console.error("Error loading timers:", error);
      }
    };
    loadTimers();
  }, []);


  // Save timers whenever they change
  useEffect(() => {
    const saveTimers = async () => {
      try {
        await AsyncStorage.setItem("notification_timers", JSON.stringify(timers));
      } catch (error) {
        console.error("Error saving timers:", error);
      }
    };

    // Only save if timers array is not empty or if we're clearing it
    if (timers.length > 0 || timers.length === 0) {
      saveTimers();
    }
  }, [timers]);

  // Update current time every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const addTimer = async (): Promise<void> => {
    const hour = parseInt(newTimerHour);
    const minute = parseInt(newTimerMinute);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      Alert.alert("Invalid Time", "Please enter a valid time (Hour: 0-23, Minute: 0-59).");
      return;
    }

    const newTimer: NotificationTimer = {
      id: Date.now(),
      name: newTimerName || `Notification ${timers.length + 1}`,
      hour,
      minute,
      isActive: true,
      notificationId: undefined,
    };

    // Schedule the notification
    const notificationId = await scheduleNotification(newTimer);
    if (notificationId) {
      newTimer.notificationId = notificationId;
    }

    setTimers([...timers, newTimer]);
    setShowAddModal(false);
    setNewTimerName("");
    setNewTimerHour("8");
    setNewTimerMinute("00");

    Alert.alert(
      "Notification Added",
      `"${newTimer.name}" has been scheduled for ${formatTime(hour, minute)} daily.`,
      [{ text: "OK" }]
    );
  };

  const editTimer = async (): Promise<void> => {
    if (!editingTimer) return;

    const hour = parseInt(newTimerHour);
    const minute = parseInt(newTimerMinute);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      Alert.alert("Invalid Time", "Please enter a valid time (Hour: 0-23, Minute: 0-59).");
      return;
    }

    const updatedTimer = {
      ...editingTimer,
      name: newTimerName || editingTimer.name,
      hour,
      minute,
    };

    // Re-schedule the notification with new time
    const notificationId = await scheduleNotification(updatedTimer);
    if (notificationId) {
      updatedTimer.notificationId = notificationId;
    }

    setTimers(prevTimers =>
      prevTimers.map(timer =>
        timer.id === editingTimer.id ? updatedTimer : timer
      )
    );

    setShowEditModal(false);
    setEditingTimer(null);
    setNewTimerName("");
    setNewTimerHour("8");
    setNewTimerMinute("00");
  };

  const toggleTimer = async (id: number): Promise<void> => {
    const timer = timers.find(t => t.id === id);
    if (!timer) return;

    if (timer.isActive) {
      // Disable: Cancel the scheduled notification
      if (timer.notificationId) {
        await cancelNotification(timer.notificationId);
      }

      setTimers(prevTimers =>
        prevTimers.map(timer =>
          timer.id === id
            ? { ...timer, isActive: false, notificationId: undefined }
            : timer
        )
      );
    } else {
      // Enable: Schedule the notification
      const notificationId = await scheduleNotification(timer);

      setTimers(prevTimers =>
        prevTimers.map(timer =>
          timer.id === id
            ? { ...timer, isActive: true, notificationId }
            : timer
        )
      );
    }
  };

  const deleteTimer = (id: number): void => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const timer = timers.find(t => t.id === id);

            // Cancel the scheduled notification if it exists
            if (timer?.notificationId) {
              await cancelNotification(timer.notificationId);
            }

            setTimers(prevTimers => prevTimers.filter(timer => timer.id !== id));
          }
        }
      ]
    );
  };

  const openEditModal = (timer: NotificationTimer): void => {
    setEditingTimer(timer);
    setNewTimerName(timer.name);
    setNewTimerHour(timer.hour.toString());
    setNewTimerMinute(timer.minute.toString().padStart(2, '0'));
    setShowEditModal(true);
  };

  const formatTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const getTimeUntilNext = (hour: number, minute: number): string => {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);

    // If the time has passed today, set for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const diff = target.getTime() - now.getTime();
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hoursLeft}h ${minutesLeft}m`;
  };

  // Get status text for timer
  const getTimerStatus = (timer: NotificationTimer): { text: string; color: string; bgColor: string } => {
    if (!timer.isActive) {
      return { text: 'Inactive', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }

    return { text: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  return (
    <View className="flex-1 bg-blue-100 p-4 dark:bg-neutral-900">
      <Text className="text-3xl font-bold text-center mb-2 dark:text-white">🔔 Notification Scheduler</Text>

      {/* Current Time Display */}
      <Text className="text-lg text-center mb-4 text-gray-600 dark:text-gray-400">
        Current Time: {formatTime(currentTime.getHours(), currentTime.getMinutes())}
      </Text>

      {/* Add Notification Button */}
      <Pressable
        className="bg-blue-500 px-6 py-3 rounded-xl mb-6"
        onPress={() => setShowAddModal(true)}
      >
        <Text className="text-white text-lg font-bold text-center">+ Add Notification</Text>
      </Pressable>

      {/* Info Text */}
      <Text className="text-sm text-center mb-4 text-gray-600 dark:text-gray-400 px-4">
        💡 Notifications will work even when the app is closed. Make sure notifications are enabled in your device settings.
      </Text>

      {/* Notifications List */}
      <ScrollView className="flex-1">
        {timers.length === 0 ? (
          <View className="bg-white p-6 rounded-xl items-center dark:bg-neutral-800">
            <Text className="text-gray-500 text-center dark:text-gray-400">
              No notifications set. Tap "Add Notification" to create one!
            </Text>
          </View>
        ) : (
          timers.map((timer) => {
            const status = getTimerStatus(timer);
            return (
              <View key={timer.id} className="bg-white p-4 rounded-xl mb-4 shadow-sm dark:bg-neutral-800">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-lg font-bold flex-1 dark:text-white">{timer.name}</Text>
                  <View className={`px-2 py-1 rounded-full ${status.bgColor}`}>
                    <Text className={`text-sm ${status.color}`}>
                      {status.text}
                    </Text>
                  </View>
                </View>

                <Text className="text-2xl font-mono mb-1 text-center dark:text-white">
                  {formatTime(timer.hour, timer.minute)}
                </Text>

                {timer.isActive && (
                  <Text className="text-sm text-green-600 text-center mb-3">
                    ✅ Scheduled daily - Next in: {getTimeUntilNext(timer.hour, timer.minute)}
                  </Text>
                )}

                {!timer.isActive && (
                  <Text className="text-sm text-gray-500 text-center mb-3">
                    ❌ Disabled - Enable to receive daily notifications
                  </Text>
                )}

                <View className="flex-row justify-between">
                  <Pressable
                    className={`px-4 py-2 rounded-lg flex-1 mr-1 ${timer.isActive ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                    onPress={() => toggleTimer(timer.id)}
                  >
                    <Text className="text-white font-bold text-center">
                      {timer.isActive ? 'Disable' : 'Enable'}
                    </Text>
                  </Pressable>

                  <Pressable
                    className="bg-blue-500 px-4 py-2 rounded-lg flex-1 mx-1"
                    onPress={() => openEditModal(timer)}
                  >
                    <Text className="text-white font-bold text-center">Edit</Text>
                  </Pressable>

                  <Pressable
                    className="bg-red-500 px-4 py-2 rounded-lg flex-1 ml-1"
                    onPress={() => deleteTimer(timer.id)}
                  >
                    <Text className="text-white font-bold text-center">Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Notification Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 dark:bg-black/70">
          <View className="bg-white p-6 rounded-xl mx-4 w-80 dark:bg-neutral-800">
            <Text className="text-xl font-bold mb-4 text-center dark:text-white">Add New Notification</Text>

            <Text className="text-gray-600 mb-2 dark:text-gray-400">Notification Name:</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 dark:bg-neutral-700 dark:text-white dark:border-neutral-600"
              value={newTimerName}
              onChangeText={setNewTimerName}
              placeholder="e.g. Water Reminder"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-600 mb-2 dark:text-gray-400">Set Time (24-hour format):</Text>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-center mb-1 dark:text-gray-400">Hour (0-23)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-center dark:text-white dark:bg-neutral-700 dark:border-neutral-600"
                  value={newTimerHour}
                  onChangeText={setNewTimerHour}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="08"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <Text className="text-2xl font-bold mx-2 dark:text-white">:</Text>

              <View className="flex-1 ml-2">
                <Text className="text-center mb-1 dark:text-gray-400">Minute (0-59)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-center dark:text-white dark:bg-neutral-700 dark:border-neutral-600"
                  value={newTimerMinute}
                  onChangeText={setNewTimerMinute}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <Text className="text-sm text-gray-500 mb-4 text-center dark:text-gray-400">
              Preview: {formatTime(parseInt(newTimerHour) || 0, parseInt(newTimerMinute) || 0)}
            </Text>

            <View className="flex-row justify-between">
              <Pressable
                className="bg-gray-500 px-6 py-3 rounded-lg flex-1 mr-2"
                onPress={() => {
                  setShowAddModal(false);
                  setNewTimerName("");
                  setNewTimerHour("8");
                  setNewTimerMinute("00");
                }}
              >
                <Text className="text-white text-center font-bold">Cancel</Text>
              </Pressable>

              <Pressable
                className="bg-blue-500 px-6 py-3 rounded-lg flex-1 ml-2"
                onPress={addTimer}
              >
                <Text className="text-white text-center font-bold">Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Notification Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 dark:bg-black/70">
          <View className="bg-white p-6 rounded-xl mx-4 w-80 dark:bg-neutral-800">
            <Text className="text-xl font-bold mb-4 text-center dark:text-white">Edit Notification</Text>

            <Text className="text-gray-600 mb-2 dark:text-gray-400">Notification Name:</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 dark:bg-neutral-700 dark:text-white dark:border-neutral-600"
              value={newTimerName}
              onChangeText={setNewTimerName}
              placeholder="Enter notification name"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-600 mb-2 dark:text-gray-400">Set Time (24-hour format):</Text>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-center mb-1 dark:text-gray-400">Hour (0-23)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-center dark:text-white dark:bg-neutral-700 dark:border-neutral-600"
                  value={newTimerHour}
                  onChangeText={setNewTimerHour}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              <Text className="text-2xl font-bold mx-2 dark:text-white">:</Text>

              <View className="flex-1 ml-2">
                <Text className="text-center mb-1 dark:text-gray-400">Minute (0-59)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-center dark:text-white dark:bg-neutral-700 dark:border-neutral-600"
                  value={newTimerMinute}
                  onChangeText={setNewTimerMinute}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>

            <Text className="text-sm text-gray-500 mb-4 text-center dark:text-gray-400">
              Preview: {formatTime(parseInt(newTimerHour) || 0, parseInt(newTimerMinute) || 0)}
            </Text>

            <View className="flex-row justify-between">
              <Pressable
                className="bg-gray-500 px-6 py-3 rounded-lg flex-1 mr-2"
                onPress={() => {
                  setShowEditModal(false);
                  setEditingTimer(null);
                  setNewTimerName("");
                  setNewTimerHour("8");
                  setNewTimerMinute("00");
                }}
              >
                <Text className="text-white text-center font-bold">Cancel</Text>
              </Pressable>

              <Pressable
                className="bg-blue-500 px-6 py-3 rounded-lg flex-1 ml-2"
                onPress={editTimer}
              >
                <Text className="text-white text-center font-bold">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}