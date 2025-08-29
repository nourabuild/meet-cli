import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { countries, Country } from '@/lib/utils/phone';
import { theme } from '@/styles/theme';
import SafeAreaContainer from '@/lib/utils/safe-area-container';
import { useThemeColor } from '@/lib/hooks/theme/useThemeColor';

interface CountryPickerProps {
  selectedCountry: Country;
  onSelect: (country: Country) => void;
  style?: any;
}

export default function CountryPicker({ selectedCountry, onSelect, style }: CountryPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (country: Country) => {
    onSelect(country);
    setModalVisible(false);
    setSearchQuery('');
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={[styles.countryItem, { backgroundColor }]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.countryItemLeft}>
        {item.flag ? <Text style={styles.flag}>{item.flag}</Text> : null}
        <Text style={[styles.countryName, { color: textColor, marginLeft: item.flag ? 12 : 0 }]}>{item.name}</Text>
      </View>
      <Text style={[styles.dialCode, { color: textColor }]}>{item.dialCode}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: cardColor }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerLeft}>
          {selectedCountry.flag ? <Text style={styles.flag}>{selectedCountry.flag}</Text> : null}
          <Text style={[styles.dialCode, { color: textColor }]}>{selectedCountry.dialCode}</Text>
        </View>
        <Feather name="chevron-down" size={16} color={theme.colorGrey} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaContainer
          backgroundColor={backgroundColor}
          edges={['bottom']}
        >
          <View style={[styles.modalContainer, { backgroundColor }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: textColor }]}>Select Country</Text>
              <View style={styles.headerSpace} />
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: cardColor }]}>
              <Feather name="search" size={20} color={theme.colorGrey} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholderTextColor={theme.colorGrey}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Feather name="x" size={18} color={theme.colorGrey} />
                </TouchableOpacity>
              )}
            </View>

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.code}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </SafeAreaContainer>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colorLightGrey,
    borderRadius: 12,
    minHeight: 48,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  flag: {
    fontSize: 20,
  },
  dialCode: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colorLightGrey,
  },
  cancelButton: {
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colorNouraBlue,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpace: {
    width: 60,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colorLightGrey,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  list: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colorLightGrey,
  },
  countryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
});