# 🏊 AquaShift — App de turnos para socorristas (Expo + React Native)

App móvil para gestionar los turnos de socorristas de la piscina, con sistema de solicitud de cambios de turno entre compañeros.

## Requisitos previos

- Node.js 18 o superior
- npm o yarn
- Expo Go instalado en el iPhone (desde la App Store)
- Conexión a internet (para la IA y Expo)

---

## Instalación y arranque

```bash
# 1. Instalar dependencias
cd piscina-turnos
npm install

# 2. Arrancar el servidor de desarrollo
npx expo start
```

Aparecerá un **código QR** en la terminal. Ábrelo con la app **Expo Go** en tu iPhone.

---

## Estructura del proyecto

```
piscina-turnos/
├── app/
│   ├── _layout.tsx          # Layout raíz
│   ├── index.tsx            # Pantalla de login
│   └── (tabs)/
│       ├── _layout.tsx      # Navegación por pestañas + cabecera
│       ├── june.tsx         # Pestaña Junio
│       ├── july.tsx         # Pestaña Julio
│       ├── notifications.tsx # Pestaña Notificaciones
│       └── myswaps.tsx      # Pestaña Mis cambios
├── src/
│   ├── theme/
│   │   └── colors.ts        # Colores y personas
│   ├── data/
│   │   └── shifts.ts        # Datos de turnos Junio/Julio
│   ├── store/
│   │   ├── swaps.ts         # Persistencia con AsyncStorage
│   │   └── api.ts           # Llamada a la API de Claude
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── CalendarScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   └── MySwapsScreen.tsx
│   └── components/
│       ├── Avatar.tsx
│       └── ShiftPill.tsx
└── package.json
```

---

## Cómo funciona

1. **Login**: cada socorrista (BJ, F, L, M, J, B) entra con su nombre
2. **Calendario**: dos pestañas, Junio y Julio. Toca cualquier día para ver los turnos y solicitar un cambio
3. **Solicitud de cambio**:
   - Elige el compañero con quien quieres cambiar
   - Elige tu turno
   - Escribe una nota opcional
   - La IA (Claude) genera el mensaje de solicitud automáticamente
4. **Notificaciones** (🔔): cuando otro socorrista te pide un cambio, aparece aquí para que lo aceptes o rechaces
5. **Mis cambios**: historial de todas tus solicitudes con su estado

> Los datos se guardan localmente en el dispositivo con AsyncStorage.

---

## Añadir el calendario a más meses

Edita `src/data/shifts.ts` y añade un nuevo objeto de datos con el mismo formato que `JUNE_DATA` o `JULY_DATA`.
