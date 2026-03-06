import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { Colors } from '../../src/constants/colors'

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:          false,
        tabBarStyle:          {
          backgroundColor:    Colors.card,
          borderTopColor:     Colors.border,
          borderTopWidth:     1,
          paddingBottom:      8,
          paddingTop:         8,
          height:             60,
        },
        tabBarActiveTintColor:   Colors.gold,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle:        { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: 'Señales',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Academia',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI Mentor',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🤖" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Tienda',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
