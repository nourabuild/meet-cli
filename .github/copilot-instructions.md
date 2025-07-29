# Copilot Instructions for Wall Project

## Project Overview
**Wall** is a user-facing fortress platform with both web and native components. The project uses Expo Router for universal apps with TypeScript and follows a unified architecture across platforms.

## Architecture Overview
- **Website**: Expo Router website with Tailwind CSS
- **Native app**: Expo Router app with React Native (CNG - Create Next Generation)
- **Backend**: Expo API routes (WinterTC-compliant) in `src/app/api/` directory
- **API Pattern**: Routes use `+api.ts` suffix (e.g., `chat+api.ts`)

## File Structure & Routing
### Core Structure
- Use **root `src/` directory** for all source code
- API routes in `src/app/api/` with `+api.ts` suffix
- Current native app in `noura/` (likely transitional)

### File-Based Routing (Expo Router)
- Routes live in `app/` directory with file-based navigation
- Group routes with parentheses: `(tabs)/`
- Use `_layout.tsx` for nested layouts in each route group
- Index routes: `index.tsx` serves as default route for directories
- Navigate with `expo-router`: `router.replace()`, `router.push()`, `<Link>`

## Code Standards
- **File naming**: Use kebab-case for ALL file names (no capital letters)
- **TypeScript**: Use TypeScript whenever possible with strict mode
- **Import paths**: Use `@/` path aliases for imports
- **Indentation**: 4-space indentation (see .prettierrc)
- **Linting**: `eslint-plugin-react-native` enforces no unused styles

## Theme System (Native App)
- Centralized theme in `theme.ts` with sky-blue color palette
- Import: `import { theme } from "../../theme"`
- Colors: `colorSkyBlue`, `colorDeepSkyBlue`, `colorAzureBlue`, `colorPaleBlue`

## Development Workflows

### Package Management
- **Install packages**: `npx expo install <package>` (not npm install)
- **Linting**: `npx expo lint` (enforces React rules)
- **Native modules**: `npx create-expo-module --local`

### Platform Deployment
- **iOS**: `npx testflight` 
- **Android**: `eas build -p android -s`
- **Web/Server**: `npx expo export -p web && eas deploy`

### Local Development
- Start dev server: `npm start` (expo start)
- Run platforms: `npm run ios`, `npm run android`, `npm run web`

## Security & Environment
- **Secrets**: Use `.env` files and API routes for secret management
- **Critical**: NEVER use `EXPO_PUBLIC_` prefix for sensitive data
- **API routes**: Handle secrets server-side in `+api.ts` files

## API Development
- **Backend routes**: Place in `src/app/api/` directory
- **Naming convention**: Use `+api.ts` suffix (e.g., `chat+api.ts`)
- **Compliance**: Follow WinterTC standards for API design

## Current Native App (noura/)
### Navigation Structure
```
noura/app/
├── index.tsx              # Root redirect to auth
├── _layout.tsx           # Root stack navigator  
├── (tabs)/               # Main app tabs
│   ├── _layout.tsx       # Tab navigator with Feather icons
│   ├── index.tsx         # Home tab
│   ├── notifications.tsx # Notifications tab
│   └── profile.tsx       # Profile tab
├── onboarding.tsx        # Modal screen
└── new.tsx              # Modal screen
├── login.tsx         # Login form
└── register.tsx      # Registration form
```

### Platform-Specific Patterns
- **KeyboardAvoidingView**: Different behavior for iOS (`padding`) vs Android (`height`)
- **Modal screens**: Use `presentation: "modal"` in Stack.Screen options
- **Icons**: Expo Vector Icons with Feather icon set for tabs

## Authentication Flow
- Entry point redirects unauthenticated users to `/login`
- Auth forms use state management with loading states
- Success navigation: `router.replace("/(tabs)")` (replaces stack)
- Form validation with React Native Alert for errors

## Integration Points
- **Expo plugins**: `expo-router`, `expo-quick-actions` configured in app.json
- **New Architecture**: `newArchEnabled: true` for React Native new architecture
- **Edge-to-edge**: Android edge-to-edge enabled
- **Bundle identifiers**: `com.anonymous.noura` (update for production)
- **Scheme**: `noura` for deep linking

## Critical Notes
- Project is transitioning to unified `src/` structure from current `noura/` app
- Native builds include iOS/Android folders but they're gitignored (generated)
- TypeScript config extends expo base with strict mode
- Use kebab-case for all new files, avoid capital letters

## Development Environment
### Dependencies & Versions
- **React**: 19.0.0 (latest)
- **React Native**: 0.79.5 
- **Expo SDK**: ~53.0.20
- **TypeScript**: ~5.8.3 with strict mode
- **Expo Router**: ~5.1.4 for navigation

### Quick Actions Integration
- `expo-quick-actions` plugin configured in app.json
- Commented implementation in `_layout.tsx` shows pattern:
```tsx
QuickActions.setItems([{
    title: "Create a Meeting",
    icon: Platform.OS === "ios" ? "symbol:leaf" : "leaf",
    id: "0",
    params: { href: "/new" }
}]);
```

### Form Patterns (Auth Implementation)
- **State management**: Local useState for form fields and loading states
- **Validation**: Client-side validation with React Native Alert for errors
- **Platform adaptation**: KeyboardAvoidingView with iOS/Android behavior differences
- **Auto-complete**: Use semantic autoComplete values (`email`, `given-name`, `family-name`, `new-password`)
- **Theme integration**: All forms use centralized theme colors and consistent styling

### Component Architecture Patterns
- Empty component shells exist: `NouraButton.tsx`, `NouraCard.tsx`, `NouraImage.tsx`
- Standard screen template with `styles.container`, `styles.text` pattern
- Consistent StyleSheet structure across screens
- Theme-based color usage throughout

### Build & Deployment Readiness
- **Bundle IDs**: Currently `com.anonymous.noura` (requires production update)
- **Deep linking**: `noura://` scheme configured
- **Assets**: Standard Expo asset structure (icon, splash, adaptive-icon)
- **Platforms**: iOS (tablet support), Android (edge-to-edge), Web (favicon)

### Git Workflow
- Root `.gitignore` excludes development files: `JOURNAL.md`, `WORK.md`, `image.png`
- Native folders (`android/`, `ios/`) are gitignored - regenerated on build
- Standard Expo development file exclusions (`.expo/`, `node_modules/`, etc.)

## Debugging & Troubleshooting

### Common Development Patterns
- **Console logging**: Use `console.log()` for development debugging (as seen in auth forms)
- **Error boundaries**: Use try/catch with React Native Alert for user-facing errors
- **Loading states**: Boolean flags with conditional rendering and disabled states
- **Development builds**: Use `expo-dev-client` for enhanced debugging capabilities

### Environment Variables
- Local env files pattern: `.env*.local` (gitignored)
- API routes handle server-side environment access
- Never expose secrets through `EXPO_PUBLIC_` prefix

### Performance Considerations
- **New Architecture**: React Native new architecture enabled (`newArchEnabled: true`)
- **Metro bundler**: Standard Expo Metro configuration
- **React Native Screens**: Optimized screen transitions with `react-native-screens`

## Best Practices Summary
1. **File naming**: Always use kebab-case, never capital letters
2. **Navigation**: Use `router.replace()` for auth flows, `router.push()` for stack navigation
3. **Theming**: Import and use centralized theme, avoid hardcoded colors
4. **Package management**: Always use `npx expo install` for dependencies
5. **Secret management**: Keep sensitive data in API routes, never in client code
6. **Platform adaptation**: Use Platform.OS checks for iOS/Android differences
7. **Form accessibility**: Use proper autoComplete, labels, and keyboard types
