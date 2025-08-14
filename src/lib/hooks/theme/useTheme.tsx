import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { StatusBarStyle } from 'expo-status-bar';

import { setThemeMode, ThemeMode, updateEffectiveTheme } from '@/stores/theme-slice';

import { ApplicationDispatch, ApplicationState } from '@/stores/store';
import { Colors } from '@/styles/theme';

export const useTheme = () => {
  const dispatch = useDispatch<ApplicationDispatch>();
  const { mode, selectedMode } = useSelector((state: ApplicationState) => state.theme);

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        dispatch(setThemeMode(savedTheme as ThemeMode));
      } else {
        dispatch(setThemeMode('light'));
      }
    };

    const subscription = Appearance.addChangeListener(() => {
      if (selectedMode === 'system') {
        dispatch(updateEffectiveTheme());
      }
    });

    loadTheme();

    return () => subscription.remove();
  }, [dispatch, mode, selectedMode]);

  const theme: Theme = mode === 'dark' ? DarkTheme : DefaultTheme;

  const statusBarStyle: StatusBarStyle = mode === 'light' ? 'dark' : 'light';
  const statusBarBackgroundColor = Colors[mode].background;

  return {
    theme,
    mode,
    statusBarStyle,
    selectedMode,
    statusBarBackgroundColor,
  };
};
