# Lomi Lomi — Application Mobile

## Stack recommandée

- **React Native** avec **Expo** (SDK 52+)
- **React Navigation** pour la navigation
- **Expo Notifications** pour les push
- **Expo Location** pour la géolocalisation

## Installation rapide

```bash
npx create-expo-app@latest lomilomi-mobile --template blank-typescript
cd lomilomi-mobile
npx expo install expo-location expo-notifications @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
```

## Structure prévue

```
mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/
│   │   ├── discover.tsx    # Swipe / découverte
│   │   ├── messages.tsx    # Conversations
│   │   ├── boutique.tsx    # Boutique
│   │   ├── carte.tsx       # Carte interactive
│   │   └── profile.tsx     # Profil
│   ├── login.tsx
│   ├── register.tsx
│   └── _layout.tsx
├── components/
├── lib/
│   ├── api.ts              # Même client API que le web
│   └── auth-context.tsx    # Contexte auth (AsyncStorage)
└── assets/
```

## Points clés

- Le client API (`lib/api.ts`) peut être partagé avec le frontend web
- Utiliser `AsyncStorage` au lieu de `localStorage` pour le token
- Notifications push via `expo-notifications` + backend webhook
- Géolocalisation background via `expo-location` (mode `Background`)
- Les icônes utilisent `lucide-react-native` (même set que le web)

## Commande de lancement

```bash
npx expo start
```

> Cette app mobile est optionnelle et sera développée dans une phase ultérieure.
> Le frontend web est responsive et fonctionne déjà sur mobile via navigateur.
