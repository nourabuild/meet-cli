import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    StatusBar,
    Platform,
    Switch,
    TouchableOpacity,
    Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/styles/theme';

export default function ExperimentalScreen() {
    const insets = useSafeAreaInsets();
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    const [orientation, setOrientation] = useState('portrait');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Listen for dimension changes
    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
            setScreenData(window);
            setOrientation(window.width > window.height ? 'landscape' : 'portrait');
        });

        return () => subscription?.remove();
    }, []);

    const copyToClipboard = (text: string) => {
        // In a real app, you'd use @react-native-clipboard/clipboard
        Alert.alert('Copied', `${text} copied to clipboard`);
    };

    const dynamicStyles = StyleSheet.create({
        container: {
            backgroundColor: isDarkMode ? '#2c3e50' : '#4ecdc4',
        },
        infoContainer: {
            backgroundColor: isDarkMode ? '#34495e' : 'white',
        },
        infoTitle: {
            color: isDarkMode ? '#ecf0f1' : theme.colorBlack,
        },
        infoText: {
            color: isDarkMode ? '#bdc3c7' : theme.colorGrey,
        },
    });

    return (
        <SafeAreaView style={[styles.safeAreaContainer, dynamicStyles.container]} edges={['top', 'left', 'right']}>
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor={isDarkMode ? '#2c3e50' : '#4ecdc4'}
            />

            {/* Enhanced Navigation Bar */}
            <View style={styles.navigationArea}>
                <Text style={styles.navigationLabel}>
                    Layout Debugger - {orientation} - {Platform.OS} {Platform.Version}
                </Text>
                <View style={styles.controlsRow}>
                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => setShowAdvanced(!showAdvanced)}
                    >
                        <Text style={styles.toggleText}>
                            {showAdvanced ? 'Hide' : 'Show'} Advanced
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.switchContainer}>
                        <Text style={styles.switchLabel}>Dark</Text>
                        <Switch
                            value={isDarkMode}
                            onValueChange={setIsDarkMode}
                            trackColor={{ false: '#767577', true: '#81b0ff' }}
                            thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
                        />
                    </View>
                </View>
            </View>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Enhanced Screen Information */}
                <TouchableOpacity
                    style={[styles.infoContainer, dynamicStyles.infoContainer]}
                    onPress={() => copyToClipboard(`${screenData.width}x${screenData.height}`)}
                >
                    <Text style={[styles.infoTitle, dynamicStyles.infoTitle]}>
                        Device Information (Tap to copy)
                    </Text>
                    <Text style={[styles.infoText, dynamicStyles.infoText]}>
                        Window: {screenData.width} x {screenData.height}
                    </Text>
                    <Text style={[styles.infoText, dynamicStyles.infoText]}>
                        Screen: {Dimensions.get('screen').width} x {Dimensions.get('screen').height}
                    </Text>
                    <Text style={[styles.infoText, dynamicStyles.infoText]}>
                        Orientation: {orientation}
                    </Text>
                    <Text style={[styles.infoText, dynamicStyles.infoText]}>
                        Pixel Density: {Dimensions.get('window').scale}x
                    </Text>
                    <Text style={[styles.infoText, dynamicStyles.infoText]}>
                        Font Scale: {Dimensions.get('window').fontScale}x
                    </Text>
                </TouchableOpacity>

                {/* Enhanced Safe Area Insets */}
                <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                    <Text style={[styles.infoTitle, dynamicStyles.infoTitle]}>
                        Safe Area Insets
                    </Text>
                    <View style={styles.insetGrid}>
                        <View style={styles.insetItem}>
                            <Text style={[styles.insetNumber, dynamicStyles.infoTitle]}>{insets.top}</Text>
                            <Text style={[styles.insetLabel, dynamicStyles.infoText]}>Top</Text>
                        </View>
                        <View style={styles.insetItem}>
                            <Text style={[styles.insetNumber, dynamicStyles.infoTitle]}>{insets.right}</Text>
                            <Text style={[styles.insetLabel, dynamicStyles.infoText]}>Right</Text>
                        </View>
                        <View style={styles.insetItem}>
                            <Text style={[styles.insetNumber, dynamicStyles.infoTitle]}>{insets.bottom}</Text>
                            <Text style={[styles.insetLabel, dynamicStyles.infoText]}>Bottom</Text>
                        </View>
                        <View style={styles.insetItem}>
                            <Text style={[styles.insetNumber, dynamicStyles.infoTitle]}>{insets.left}</Text>
                            <Text style={[styles.insetLabel, dynamicStyles.infoText]}>Left</Text>
                        </View>
                    </View>

                    {/* Visual safe area representation */}
                    <View style={styles.safeAreaVisual}>
                        <View style={[styles.safeAreaBox, {
                            marginTop: insets.top / 4,
                            marginBottom: insets.bottom / 4,
                            marginLeft: insets.left / 4,
                            marginRight: insets.right / 4
                        }]}>
                            <Text style={styles.safeAreaLabel}>Safe Content Area</Text>
                        </View>
                    </View>
                </View>

                {/* Responsive Breakpoints */}
                <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                    <Text style={[styles.infoTitle, dynamicStyles.infoTitle]}>
                        Responsive Breakpoints
                    </Text>
                    <View style={styles.breakpointContainer}>
                        {[
                            { name: 'Small', min: 0, max: 576, color: '#e74c3c' },
                            { name: 'Medium', min: 576, max: 768, color: '#f39c12' },
                            { name: 'Large', min: 768, max: 992, color: '#2ecc71' },
                            { name: 'XL', min: 992, max: 1200, color: '#3498db' },
                            { name: 'XXL', min: 1200, max: 9999, color: '#9b59b6' }
                        ].map((bp) => {
                            const isActive = screenData.width >= bp.min && screenData.width < bp.max;
                            return (
                                <View key={bp.name} style={[
                                    styles.breakpointItem,
                                    { backgroundColor: isActive ? bp.color : '#ecf0f1' }
                                ]}>
                                    <Text style={[
                                        styles.breakpointLabel,
                                        { color: isActive ? 'white' : '#7f8c8d' }
                                    ]}>
                                        {bp.name} {isActive && '✓'}
                                    </Text>
                                    <Text style={[
                                        styles.breakpointRange,
                                        { color: isActive ? 'white' : '#7f8c8d' }
                                    ]}>
                                        {bp.min}-{bp.max === 9999 ? '∞' : bp.max}px
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Enhanced Spacing Tests */}
                <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                    <Text style={[styles.infoTitle, dynamicStyles.infoTitle]}>
                        Spacing System Tests
                    </Text>

                    {/* Margin tests with better visualization */}
                    <Text style={[styles.sectionLabel, dynamicStyles.infoText]}>Margins:</Text>
                    {[4, 8, 12, 16, 20, 24, 32].map((margin) => (
                        <View key={`margin-${margin}`} style={[styles.spacingTest, { margin }]}>
                            <Text style={styles.spacingLabel}>{margin}px margin</Text>
                        </View>
                    ))}

                    <Text style={[styles.sectionLabel, dynamicStyles.infoText]}>Paddings:</Text>
                    {[4, 8, 12, 16, 20, 24, 32].map((padding) => (
                        <View key={`padding-${padding}`} style={[styles.spacingTestPadding, { padding }]}>
                            <Text style={styles.spacingLabel}>{padding}px padding</Text>
                        </View>
                    ))}
                </View>

                {/* Flexbox Playground */}
                <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                    <Text style={[styles.infoTitle, dynamicStyles.infoTitle]}>
                        Flexbox Playground
                    </Text>

                    <Text style={[styles.sectionLabel, dynamicStyles.infoText]}>Justify Content:</Text>
                    {(['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] as (
                        "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly"
                    )[]).map((justify) => (
                        <View key={justify} style={[styles.flexContainer, { justifyContent: justify }]}>
                            <View style={styles.flexItem}><Text style={styles.flexItemText}>A</Text></View>
                            <View style={styles.flexItem}><Text style={styles.flexItemText}>B</Text></View>
                            <View style={styles.flexItem}><Text style={styles.flexItemText}>C</Text></View>
                        </View>
                    ))}
                </View>

                {showAdvanced && (
                    <>
                        {/* Advanced Layout Tests */}
                        <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                            <Text style={[styles.infoTitle, dynamicStyles.infoTitle]}>
                                Advanced Layout Tests
                            </Text>

                            {/* Aspect Ratio Test */}
                            <Text style={[styles.sectionLabel, dynamicStyles.infoText]}>Aspect Ratios:</Text>
                            <View style={styles.aspectRatioContainer}>
                                <View style={[styles.aspectRatioBox, { aspectRatio: 1 }]}>
                                    <Text style={styles.aspectRatioLabel}>1:1</Text>
                                </View>
                                <View style={[styles.aspectRatioBox, { aspectRatio: 16 / 9 }]}>
                                    <Text style={styles.aspectRatioLabel}>16:9</Text>
                                </View>
                                <View style={[styles.aspectRatioBox, { aspectRatio: 4 / 3 }]}>
                                    <Text style={styles.aspectRatioLabel}>4:3</Text>
                                </View>
                            </View>

                            {/* Z-Index Test */}
                            <Text style={[styles.sectionLabel, dynamicStyles.infoText]}>Z-Index Stacking:</Text>
                            <View style={styles.zIndexContainer}>
                                <View style={[styles.zIndexBox, styles.zIndex1]}>
                                    <Text style={styles.zIndexLabel}>Z: 1</Text>
                                </View>
                                <View style={[styles.zIndexBox, styles.zIndex2]}>
                                    <Text style={styles.zIndexLabel}>Z: 2</Text>
                                </View>
                                <View style={[styles.zIndexBox, styles.zIndex3]}>
                                    <Text style={styles.zIndexLabel}>Z: 3</Text>
                                </View>
                            </View>
                        </View>

                        {/* Performance Metrics */}
                        <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                            <Text style={[styles.infoTitle, dynamicStyles.infoTitle]}>
                                ⚡ Performance Info
                            </Text>
                            <Text style={[styles.infoText, dynamicStyles.infoText]}>
                                Render timestamp: {new Date().toISOString()}
                            </Text>
                            <Text style={[styles.infoText, dynamicStyles.infoText]}>
                                JS Engine: {Platform.constants?.reactNativeVersion?.major ? 'Hermes' : 'Unknown'}
                            </Text>
                            <Text style={[styles.infoText, dynamicStyles.infoText]}>
                                Debug mode: {__DEV__ ? 'Yes' : 'No'}
                            </Text>
                        </View>
                    </>
                )}

                {/* Bottom spacer */}
                <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeAreaContainer: {
        flex: 1,
        margin: 5,
    },
    navigationArea: {
        backgroundColor: '#9b59b6',
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginHorizontal: 15,
        marginVertical: 5,
        borderRadius: 8,
    },
    navigationLabel: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 8,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    toggleText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    switchLabel: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 15,
    },
    infoContainer: {
        backgroundColor: 'white',
        padding: 15,
        marginVertical: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colorBlack,
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: theme.colorGrey,
        marginBottom: 4,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    // Enhanced inset display
    insetGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 16,
    },
    insetItem: {
        alignItems: 'center',
    },
    insetNumber: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    insetLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    safeAreaVisual: {
        height: 100,
        backgroundColor: '#ecf0f1',
        borderRadius: 8,
        padding: 4,
        marginTop: 12,
    },
    safeAreaBox: {
        flex: 1,
        backgroundColor: '#3498db',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    safeAreaLabel: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    // Breakpoint styles
    breakpointContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    breakpointItem: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    breakpointLabel: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    breakpointRange: {
        fontSize: 10,
        marginTop: 2,
    },
    // Enhanced spacing tests
    spacingTest: {
        backgroundColor: '#3498db',
        paddingVertical: 8,
        borderRadius: 4,
        marginVertical: 2,
    },
    spacingTestPadding: {
        backgroundColor: '#e74c3c',
        borderRadius: 4,
        marginVertical: 2,
    },
    spacingLabel: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 11,
        textAlign: 'center',
    },
    // Flexbox playground
    flexContainer: {
        flexDirection: 'row',
        height: 50,
        backgroundColor: '#ecf0f1',
        borderRadius: 4,
        marginVertical: 4,
        paddingHorizontal: 8,
    },
    flexItem: {
        width: 30,
        height: 30,
        backgroundColor: '#3498db',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    flexItemText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    // Advanced layout tests
    aspectRatioContainer: {
        flexDirection: 'row',
        gap: 8,
        marginVertical: 8,
    },
    aspectRatioBox: {
        flex: 1,
        backgroundColor: '#9b59b6',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        maxHeight: 100,
    },
    aspectRatioLabel: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    zIndexContainer: {
        height: 120,
        position: 'relative',
        backgroundColor: '#ecf0f1',
        borderRadius: 4,
        marginVertical: 8,
    },
    zIndexBox: {
        position: 'absolute',
        width: 80,
        height: 60,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    zIndex1: {
        backgroundColor: '#e74c3c',
        top: 10,
        left: 10,
        zIndex: 1,
    },
    zIndex2: {
        backgroundColor: '#f39c12',
        top: 30,
        left: 40,
        zIndex: 2,
    },
    zIndex3: {
        backgroundColor: '#2ecc71',
        top: 50,
        left: 70,
        zIndex: 3,
    },
    zIndexLabel: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 11,
    },
});


// import React from 'react';
// import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
// import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// import { theme } from '@/styles/theme';

// export default function ExperimentalScreen() {
//     const insets = useSafeAreaInsets();
//     const { width, height } = Dimensions.get('window');
//     const screenData = Dimensions.get('screen');

//     return (
//         <SafeAreaView style={styles.safeAreaContainer} edges={['top', 'left', 'right']}>
//             {/* Navigation Bar Area - Purple */}
//             <View style={styles.navigationArea}>
//                 <Text style={styles.navigationLabel}>Navigation/Header Area (Purple)</Text>
//             </View>

//             {/* Content directly in safe area */}
//             <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
//                 {/* Screen Information */}
//                 <View style={styles.infoContainer}>
//                     <Text style={styles.infoTitle}>Screen Dimensions</Text>
//                     <Text style={styles.infoText}>Window: {width} x {height}</Text>
//                     <Text style={styles.infoText}>Screen: {screenData.width} x {screenData.height}</Text>
//                 </View>

//                 {/* Safe Area Insets */}
//                 <View style={styles.infoContainer}>
//                     <Text style={styles.infoTitle}>Safe Area Insets</Text>
//                     <Text style={styles.infoText}>Top: {insets.top}px (below dynamic island)</Text>
//                     <Text style={styles.infoText}>Bottom: {insets.bottom}px (above home indicator)</Text>
//                     <Text style={styles.infoText}>Left: {insets.left}px</Text>
//                     <Text style={styles.infoText}>Right: {insets.right}px</Text>

//                     {/* Visual indicators */}
//                     <View style={[styles.topInsetIndicator, { height: insets.top }]}>
//                         <Text style={styles.insetLabel}>Top Safe Area</Text>
//                     </View>
//                 </View>

//                 {/* Margin Testing Containers */}
//                 <View style={styles.infoContainer}>
//                     <Text style={styles.infoTitle}>Margin Tests</Text>

//                     <View style={styles.marginTest10}>
//                         <Text style={styles.marginLabel}>10px margin (Yellow)</Text>
//                     </View>

//                     <View style={styles.marginTest20}>
//                         <Text style={styles.marginLabel}>20px margin (Orange)</Text>
//                     </View>

//                     <View style={styles.marginTest30}>
//                         <Text style={styles.marginLabel}>30px margin (Purple)</Text>
//                     </View>
//                 </View>

//                 {/* Padding Testing Containers */}
//                 <View style={styles.infoContainer}>
//                     <Text style={styles.infoTitle}>Padding Tests</Text>

//                     <View style={styles.paddingTest10}>
//                         <Text style={styles.paddingLabel}>10px padding (Light Blue)</Text>
//                     </View>

//                     <View style={styles.paddingTest20}>
//                         <Text style={styles.paddingLabel}>20px padding (Light Green)</Text>
//                     </View>

//                     <View style={styles.paddingTest30}>
//                         <Text style={styles.paddingLabel}>30px padding (Light Pink)</Text>
//                     </View>
//                 </View>

//                 {/* Width Tests */}
//                 <View style={styles.infoContainer}>
//                     <Text style={styles.infoTitle}>Width Tests</Text>

//                     <View style={styles.width50}>
//                         <Text style={styles.widthLabel}>50% width (Teal)</Text>
//                     </View>

//                     <View style={styles.width75}>
//                         <Text style={styles.widthLabel}>75% width (Coral)</Text>
//                     </View>

//                     <View style={styles.width100}>
//                         <Text style={styles.widthLabel}>100% width (Gray)</Text>
//                     </View>
//                 </View>

//                 {/* Grid System Test */}
//                 <View style={styles.infoContainer}>
//                     <Text style={styles.infoTitle}>Grid System Test</Text>
//                     <View style={styles.gridContainer}>
//                         <View style={styles.gridItem}>
//                             <Text style={styles.gridLabel}>1/3</Text>
//                         </View>
//                         <View style={styles.gridItem}>
//                             <Text style={styles.gridLabel}>1/3</Text>
//                         </View>
//                         <View style={styles.gridItem}>
//                             <Text style={styles.gridLabel}>1/3</Text>
//                         </View>
//                     </View>
//                 </View>
//             </ScrollView>
//         </SafeAreaView>
//     );
// }

// const styles = StyleSheet.create({
//     safeAreaContainer: {
//         flex: 1,
//         backgroundColor: '#4ecdc4', // Teal/Blue
//         margin: 5,
//     },
//     navigationArea: {
//         backgroundColor: '#9b59b6', // Purple
//         height: 60, // Approximate navigation area height
//         marginHorizontal: 15, // Match the scroll container padding
//         marginVertical: 5,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     navigationLabel: {
//         color: 'white',
//         fontWeight: 'bold',
//         fontSize: 12,
//         textAlign: 'center',
//     },
//     scrollContainer: {
//         flex: 1,
//         paddingHorizontal: 15,
//     },
//     infoContainer: {
//         backgroundColor: 'white',
//         padding: 15,
//         marginVertical: 10,
//         borderRadius: 8,
//     },
//     infoTitle: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: theme.colorBlack,
//         marginBottom: 10,
//     },
//     infoText: {
//         fontSize: 14,
//         color: theme.colorGrey,
//         marginBottom: 5,
//     },
//     // Margin Tests
//     marginTest10: {
//         backgroundColor: '#ffd93d', // Yellow
//         margin: 10,
//         padding: 10,
//         borderRadius: 4,
//         marginVertical: 5,
//     },
//     marginTest20: {
//         backgroundColor: '#ff9f43', // Orange
//         margin: 20,
//         padding: 10,
//         borderRadius: 4,
//         marginVertical: 5,
//     },
//     marginTest30: {
//         backgroundColor: '#a55eea', // Purple
//         margin: 30,
//         padding: 10,
//         borderRadius: 4,
//         marginVertical: 5,
//     },
//     marginLabel: {
//         color: 'white',
//         fontWeight: 'bold',
//         fontSize: 12,
//         textAlign: 'center',
//     },
//     // Padding Tests
//     paddingTest10: {
//         backgroundColor: '#74b9ff', // Light Blue
//         padding: 10,
//         borderRadius: 4,
//         marginVertical: 5,
//     },
//     paddingTest20: {
//         backgroundColor: '#55a3ff', // Light Green
//         padding: 20,
//         borderRadius: 4,
//         marginVertical: 5,
//     },
//     paddingTest30: {
//         backgroundColor: '#fd79a8', // Light Pink
//         padding: 30,
//         borderRadius: 4,
//         marginVertical: 5,
//     },
//     paddingLabel: {
//         color: 'white',
//         fontWeight: 'bold',
//         fontSize: 12,
//         textAlign: 'center',
//     },
//     // Width Tests
//     width50: {
//         backgroundColor: '#00b894', // Teal
//         width: '50%',
//         padding: 10,
//         borderRadius: 4,
//         marginVertical: 5,
//     },
//     width75: {
//         backgroundColor: '#ff7675', // Coral
//         width: '75%',
//         padding: 10,
//         borderRadius: 4,
//         marginVertical: 5,
//     },
//     width100: {
//         backgroundColor: '#636e72', // Gray
//         width: '100%',
//         padding: 10,
//         borderRadius: 4,
//         marginVertical: 5,
//     },
//     widthLabel: {
//         color: 'white',
//         fontWeight: 'bold',
//         fontSize: 12,
//         textAlign: 'center',
//     },
//     // Grid System
//     gridContainer: {
//         flexDirection: 'row',
//         gap: 10,
//     },
//     gridItem: {
//         flex: 1,
//         backgroundColor: '#6c5ce7',
//         padding: 20,
//         borderRadius: 4,
//         alignItems: 'center',
//     },
//     gridLabel: {
//         color: 'white',
//         fontWeight: 'bold',
//         fontSize: 12,
//     },
//     // Visual indicators for safe area
//     topInsetIndicator: {
//         backgroundColor: '#ff6b6b',
//         marginTop: 10,
//         justifyContent: 'center',
//         alignItems: 'center',
//         borderRadius: 4,
//     },
//     insetLabel: {
//         color: 'white',
//         fontWeight: 'bold',
//         fontSize: 10,
//     },
// });

