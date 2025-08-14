import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import CountryPicker from './country-picker';
import {
  countries,
  Country,
  formatE164,
  parseE164,
  formatPhoneAsTyping,
  isValidPhoneLength,
} from '@/lib/utils/phone';
import { theme } from '@/styles/theme';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';

interface PhoneInputProps {
  value: string; // E.164 format or empty string
  onChangeText: (e164Phone: string) => void;
  placeholder?: string;
  error?: boolean;
  style?: any;
  disabled?: boolean;
}

export default function PhoneInput({
  value,
  onChangeText,
  error = false,
  style,
  disabled = false,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Default to US
  const [localNumber, setLocalNumber] = useState('');
  const [displayValue, setDisplayValue] = useState('');

  const backgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');

  // Initialize from E.164 value
  useEffect(() => {
    if (value) {
      const parsed = parseE164(value);
      if (parsed.country) {
        setSelectedCountry(parsed.country);
        setLocalNumber(parsed.localNumber);
        setDisplayValue(formatPhoneAsTyping(parsed.localNumber, parsed.country.code));
      } else {
        // If we can't parse, treat as local number for current country
        setLocalNumber(value);
        setDisplayValue(formatPhoneAsTyping(value, selectedCountry.code));
      }
    } else {
      setLocalNumber('');
      setDisplayValue('');
    }
  }, [selectedCountry.code, value]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);

    // Update E.164 format with new country
    if (localNumber) {
      const e164 = formatE164(localNumber, country.dialCode);
      onChangeText(e164);
    }

    // Update display format
    setDisplayValue(formatPhoneAsTyping(localNumber, country.code));
  };

  const handleTextChange = (text: string) => {
    // Remove all non-numeric characters for processing
    const cleaned = text.replace(/\D/g, '');

    // Update local state
    setLocalNumber(cleaned);

    // Format for display
    const formatted = formatPhoneAsTyping(cleaned, selectedCountry.code);
    setDisplayValue(formatted);

    // Generate E.164 format for parent
    const e164 = cleaned ? formatE164(cleaned, selectedCountry.dialCode) : '';
    onChangeText(e164);
  };

  const isValid = localNumber ? isValidPhoneLength(localNumber, selectedCountry.code) : true;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputRow}>
        {/* Country Picker */}
        <CountryPicker
          selectedCountry={selectedCountry}
          onSelect={handleCountrySelect}
          style={styles.countryPicker}
        />

        {/* Phone Input */}
        <TextInput
          style={[
            styles.phoneInput,
            { backgroundColor, color: textColor },
            error && styles.inputError,
            !isValid && styles.inputWarning,
            disabled && styles.inputDisabled,
          ]}
          value={displayValue}
          onChangeText={handleTextChange}
          placeholderTextColor={theme.colorGrey}
          keyboardType="phone-pad"
          autoCorrect={false}
          autoCapitalize="none"
          editable={!disabled}
          maxLength={selectedCountry.code === 'US' || selectedCountry.code === 'CA' ? 14 : 15} // Account for formatting
        />
      </View>

      {/* Validation feedback */}
      {localNumber && !isValid && (
        <Text style={styles.validationText}>
          Invalid phone number length for {selectedCountry.name}
        </Text>
      )}

      {/* E.164 preview (for development/debugging) */}
      {__DEV__ && value && (
        <Text style={styles.debugText}>E.164: {value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countryPicker: {
    flex: 0,
    minWidth: 120,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colorLightGrey,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  inputError: {
    borderColor: theme.colorRed || '#FF0000',
  },
  inputWarning: {
    borderColor: '#FFA500', // Orange for validation warning
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: theme.colorGrey,
  },
  validationText: {
    color: '#FFA500',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 132, // Align with phone input (country picker width + gap)
  },
  debugText: {
    color: theme.colorGrey,
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});