import React from 'react';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useTheme } from '@/lib/hooks/theme/useTheme';

interface ThemeProviderProps {
    children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
    const { theme } = useTheme();

    return (
        <NavigationThemeProvider value={theme}>
            {children}
        </NavigationThemeProvider>
    );
}