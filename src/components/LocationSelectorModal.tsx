import {useEffect, useMemo, useState} from 'react'
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {MEXICAN_STATES, MOCK_MUNICIPALITIES} from '#/lib/constants/mexico'
import {useTheme} from '#/alf'
import {SearchInput} from '#/components/forms/SearchInput'
import {WheelPicker} from './WheelPicker'

export function LocationSelectorModal({
  isOpen,
  onClose,
  initialState,
  initialMunicipality,
  onSelect,
}: {
  isOpen: boolean
  onClose: () => void
  initialState?: string
  initialMunicipality?: string
  onSelect: (state: string, municipality: string) => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [tempState, setTempState] = useState(initialState || 'All')
  const [tempMunicipality, setTempMunicipality] = useState(
    initialMunicipality || 'All',
  )
  const [searchQuery, setSearchQuery] = useState('')

  const filteredStates = useMemo(() => {
    return MEXICAN_STATES.filter(s =>
      s.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [searchQuery])

  const municipalities = useMemo(() => {
    const list = MOCK_MUNICIPALITIES[tempState] || ['All']
    return list.filter(m => m.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [tempState, searchQuery])

  // Sync municipality when state changes
  useEffect(() => {
    const list = MOCK_MUNICIPALITIES[tempState] || ['All']
    setTempMunicipality(prev => (list.includes(prev) ? prev : 'All'))
  }, [tempState])

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.modalDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalContent, t.atoms.bg]}>
          <View style={styles.modalHandle} />

          <Text style={[styles.modalTitle, t.atoms.text]}>Select Location</Text>

          <View style={{marginBottom: 20}}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClearText={() => setSearchQuery('')}
              placeholder={_(msg`Search states or municipalities...`)}
            />
          </View>

          <View style={styles.pickersContainer}>
            <View style={styles.pickerWrapper}>
              <Text style={[styles.pickerLabel, t.atoms.text_contrast_medium]}>
                State
              </Text>
              <WheelPicker
                items={filteredStates}
                selectedValue={tempState}
                onValueChange={setTempState}
                theme={t}
              />
            </View>

            <View style={styles.pickerWrapper}>
              <Text style={[styles.pickerLabel, t.atoms.text_contrast_medium]}>
                Municipality
              </Text>
              {municipalities.length > 0 ? (
                <WheelPicker
                  items={municipalities}
                  selectedValue={tempMunicipality}
                  onValueChange={setTempMunicipality}
                  theme={t}
                />
              ) : (
                <View style={styles.emptyPicker}>
                  <Text style={t.atoms.text_contrast_low}>
                    All Municipalities
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.doneButton,
              {backgroundColor: t.palette.primary_500},
            ]}
            onPress={() => {
              onSelect(tempState, tempMunicipality)
              onClose()
            }}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  pickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  pickerWrapper: {
    flex: 1,
    marginHorizontal: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyPicker: {
    height: 44 * 5, // Match WheelPicker height
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 12,
  },
  doneButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
