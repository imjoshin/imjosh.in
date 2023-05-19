import { themes } from '../themes';
import { useThemeName } from './useThemeName';

export function useTheme() {
  const [theme] = useThemeName()
  return themes[theme]
}