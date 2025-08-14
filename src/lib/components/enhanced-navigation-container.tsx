// import React, { ReactNode } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     StatusBar,
//     Platform,
//     Switch,
//     TouchableOpacity,
// } from 'react-native';
// import { SafeAreaView, Edge } from 'react-native-safe-area-context';

// interface EnhancedNavigationContainerProps {
//     children: ReactNode;
//     title?: string;
//     showAdvancedToggle?: boolean;
//     showDarkModeToggle?: boolean;
//     showAdvanced?: boolean;
//     onAdvancedToggle?: () => void;
//     isDarkMode?: boolean;
//     onDarkModeToggle?: () => void;
//     orientation?: string;
//     backgroundColor?: string;
//     navigationBackgroundColor?: string;
//     edges?: Edge[];
// }

// export default function EnhancedNavigationContainer({
//     children,
//     title = "Layout Debugger",
//     showAdvancedToggle = true,
//     showDarkModeToggle = true,
//     showAdvanced = false,
//     onAdvancedToggle,
//     isDarkMode = false,
//     onDarkModeToggle,
//     orientation = "portrait",
//     backgroundColor,
//     navigationBackgroundColor = '#9b59b6',
//     edges = ['top', 'left', 'right'], // Default edges, can be overridden
// }: EnhancedNavigationContainerProps) {

//     const containerBackgroundColor = backgroundColor || (isDarkMode ? '#2c3e50' : '#4ecdc4');

//     return (
//         <SafeAreaView
//             style={[styles.safeAreaContainer, { backgroundColor: containerBackgroundColor }]}
//             edges={edges}
//         >
//             <StatusBar
//                 barStyle={isDarkMode ? 'light-content' : 'dark-content'}
//                 backgroundColor={containerBackgroundColor}
//             />

//             {/* Enhanced Navigation Bar */}
//             <View style={[styles.navigationArea, { backgroundColor: navigationBackgroundColor }]}>
//                 <Text style={styles.navigationLabel}>
//                     {title} - {orientation} - {Platform.OS} {Platform.Version}
//                 </Text>

//                 <View style={styles.controlsRow}>
//                     {showAdvancedToggle && onAdvancedToggle && (
//                         <TouchableOpacity
//                             style={styles.toggleButton}
//                             onPress={onAdvancedToggle}
//                         >
//                             <Text style={styles.toggleText}>
//                                 {showAdvanced ? 'Hide' : 'Show'} Advanced
//                             </Text>
//                         </TouchableOpacity>
//                     )}

//                     {showDarkModeToggle && onDarkModeToggle && (
//                         <View style={styles.switchContainer}>
//                             <Text style={styles.switchLabel}>Dark</Text>
//                             <Switch
//                                 value={isDarkMode}
//                                 onValueChange={onDarkModeToggle}
//                                 trackColor={{ false: '#767577', true: '#81b0ff' }}
//                                 thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
//                             />
//                         </View>
//                     )}
//                 </View>
//             </View>

//             {children}
//         </SafeAreaView>
//     );
// }

// const styles = StyleSheet.create({
//     safeAreaContainer: {
//         flex: 1,
//         margin: 5,
//     },
//     navigationArea: {
//         backgroundColor: '#9b59b6',
//         paddingHorizontal: 15,
//         paddingVertical: 10,
//         marginHorizontal: 15,
//         marginVertical: 5,
//         borderRadius: 8,
//     },
//     navigationLabel: {
//         color: 'white',
//         fontWeight: 'bold',
//         fontSize: 14,
//         textAlign: 'center',
//         marginBottom: 8,
//     },
//     controlsRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//     },
//     toggleButton: {
//         backgroundColor: 'rgba(255,255,255,0.2)',
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 4,
//     },
//     toggleText: {
//         color: 'white',
//         fontSize: 12,
//         fontWeight: '600',
//     },
//     switchContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: 8,
//     },
//     switchLabel: {
//         color: 'white',
//         fontSize: 12,
//         fontWeight: '600',
//     },
// });
