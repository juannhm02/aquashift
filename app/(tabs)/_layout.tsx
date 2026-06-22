import React, { useEffect, useState, useMemo } from 'react';
import { Tabs, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../../src/theme/colors';
import { useTheme } from '../../src/theme/ThemeContext';
import { useRoster } from '../../src/store/RosterContext';
import { subscribeSwaps, SwapRequest } from '../../src/store/swaps';
import { SEASON_YEAR } from '../../src/data/season';
import { TabSessionProvider } from '../../src/store/TabSessionContext';

// Altura fija para que todos los iconos de la tab bar queden a la misma altura
// sin importar si la etiqueta cabe en una línea o no (con "Cambios" se partía
// en dos líneas y el icono se veía más alto que el resto).
const TAB_ICON_HEIGHT = 34;

function TabIcon({ emoji, label, focused, colors }: { emoji: string; label: string; focused: boolean; colors: AppColors }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2, height: TAB_ICON_HEIGHT }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text
        numberOfLines={1}
        style={{ fontSize: 10, color: focused ? colors.primary : colors.text3, fontWeight: focused ? '700' : '400' }}
      >
        {label}
      </Text>
    </View>
  );
}

function NotifIcon({ focused, count, styles, colors }: { focused: boolean; count: number; styles: ReturnType<typeof makeStyles>; colors: AppColors }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2, height: TAB_ICON_HEIGHT }}>
      <View>
        <Text style={{ fontSize: 20 }}>🔔</Text>
        {count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{count}</Text>
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 10, color: focused ? colors.primary : colors.text3, fontWeight: focused ? '700' : '400' }}
      >
        Avisos
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useLocalSearchParams<{ user: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { roster } = useRoster();
  const { colors, scheme, toggleScheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);

  // Suscripción en tiempo real a Firestore: cualquier cambio de turno creado
  // o respondido desde OTRO dispositivo llega aquí solo, sin recargar.
  useEffect(() => {
    const unsubscribe = subscribeSwaps(setSwaps);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [router, user]);

  if (!user) {
    return null;
  }

  const pendingForMe = swaps.filter(s => s.to === user && s.status === 'pending').length;
  const p = roster[user] ?? { color: '#555', bg: '#eee' };

  return (
    <TabSessionProvider value={{ user, swaps, setSwaps }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontWeight: '700', fontSize: 16, color: colors.text },
          // 'left' en vez del 'center' por defecto: con título centrado a lo
          // ancho de toda la cabecera, en pantallas estrechas el texto se
          // solapaba con el avatar/nombre/botón "Salir" de headerRight. Con
          // 'left' el título usa solo el hueco disponible entre headerLeft y
          // headerRight, sin invadirlo.
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerRight}>
              <View style={[styles.headerAv, { backgroundColor: p.bg }]}>
                <Text style={[styles.headerAvTxt, { color: p.color }]}>{user}</Text>
              </View>
              <Text style={styles.headerName} numberOfLines={1}>
                {roster[user]?.fullName ?? user}
              </Text>
              <TouchableOpacity onPress={toggleScheme} style={styles.themeBtn}>
                <Text style={styles.themeTxt}>{scheme === 'dark' ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.replace('/')} style={styles.logoutBtn}>
                <Text style={styles.logoutTxt}>Salir</Text>
              </TouchableOpacity>
            </View>
          ),
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="june"
          options={{
            title: `Junio ${SEASON_YEAR}`,
            tabBarIcon: ({ focused }) => <TabIcon emoji="☀️" label="Junio" focused={focused} colors={colors} />,
          }}
        />
        <Tabs.Screen
          name="july"
          options={{
            title: `Julio ${SEASON_YEAR}`,
            tabBarIcon: ({ focused }) => <TabIcon emoji="🌞" label="Julio" focused={focused} colors={colors} />,
          }}
        />
        <Tabs.Screen
          name="august"
          options={{
            title: `Agosto ${SEASON_YEAR}`,
            tabBarIcon: ({ focused }) => <TabIcon emoji="🏖️" label="Agosto" focused={focused} colors={colors} />,
          }}
        />
        <Tabs.Screen
          name="september"
          options={{
            title: `Septiembre ${SEASON_YEAR}`,
            tabBarIcon: ({ focused }) => <TabIcon emoji="🍃" label="Sept." focused={focused} colors={colors} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notificaciones',
            tabBarIcon: ({ focused }) => <NotifIcon focused={focused} count={pendingForMe} styles={styles} colors={colors} />,
          }}
        />
        <Tabs.Screen
          name="myswaps"
          options={{
            title: 'Mis cambios',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🔄" label="Cambios" focused={focused} colors={colors} />,
          }}
        />
        <Tabs.Screen
          name="debts"
          options={{
            title: 'Horas pendientes',
            tabBarIcon: ({ focused }) => <TabIcon emoji="⚖️" label="Deudas" focused={focused} colors={colors} />,
          }}
        />
      </Tabs>
    </TabSessionProvider>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    badge: {
      position: 'absolute',
      top: -2,
      right: -6,
      backgroundColor: colors.red,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 16 },
    headerAv: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerAvTxt: { fontSize: 12, fontWeight: '700' },
    headerName: { fontSize: 12, fontWeight: '600', color: colors.text2, maxWidth: 90 },
    themeBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    themeTxt: { fontSize: 13 },
    logoutBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    logoutTxt: { fontSize: 12, color: colors.text2 },
  });
}
