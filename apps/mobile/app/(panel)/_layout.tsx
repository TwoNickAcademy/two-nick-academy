import { Stack } from 'expo-router'
import { Colors } from '../../src/constants/colors'

export default function PanelLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle:      { backgroundColor: Colors.surface },
        headerTintColor:  Colors.gold,
        headerTitleStyle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
        contentStyle:     { backgroundColor: Colors.background },
      }}
    />
  )
}
