import { Tabs } from "expo-router";
export default function TabsLayout() {
return (
<Tabs screenOptions={{ headerShown: false }}>
<Tabs.Screen name="index" options={{ title: "Home" }} />
<Tabs.Screen name="goals" options={{ title: "Goals" }} />
<Tabs.Screen name="weekly" options={{ title: "Weekly" }} />
</Tabs>
);
}