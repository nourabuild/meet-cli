/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { ApplicationState } from '@/stores/store';
import { Colors } from '@/styles/theme';
import { useSelector } from 'react-redux';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { mode } = useSelector((state: ApplicationState) => state.theme);
  const themeMode: 'light' | 'dark' = mode === 'dark' ? 'dark' : 'light';
  const colorFromProps = props[themeMode];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[themeMode][colorName];
  }
}
