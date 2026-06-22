import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { AppColors, PALETTE, Persona, Role } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useRoster } from '../store/RosterContext';
import { DatePickerField } from '../components/DatePickerField';

const ROLES: { value: Role; label: string }[] = [
  { value: 'socorrista', label: 'Socorrista' },
  { value: 'correturnos', label: 'Correturnos' },
];

type FormState = {
  id: string;
  fullName: string;
  role: Role;
  color: string;
  bg: string;
  activeFrom: string;
  activeUntil: string;
};

const EMPTY_FORM: FormState = {
  id: '',
  fullName: '',
  role: 'socorrista',
  color: PALETTE[0].color,
  bg: PALETTE[0].bg,
  activeFrom: '',
  activeUntil: '',
};

function personaToForm(id: string, p: Persona): FormState {
  return {
    id,
    fullName: p.fullName,
    role: p.role ?? 'socorrista',
    color: p.color,
    bg: p.bg,
    activeFrom: p.activeFrom ?? '',
    activeUntil: p.activeUntil ?? '',
  };
}

export function RosterAdminScreen() {
  const { roster, upsertPersona, removePersona } = useRoster();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const ids = Object.keys(roster);
  const isOpen = creating || editingId !== null;

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreating(true);
    setEditingId(null);
  }

  function openEdit(id: string) {
    setForm(personaToForm(id, roster[id]));
    setEditingId(id);
    setCreating(false);
  }

  function closeModal() {
    setCreating(false);
    setEditingId(null);
  }

  async function handleSave() {
    const id = form.id.trim().toUpperCase();
    if (!id) {
      Alert.alert('Falta el apodo', 'El apodo identifica al socorrista (ej. "BJ", "F").');
      return;
    }
    if (creating && roster[id]) {
      Alert.alert('Ya existe', `Ya hay un socorrista con el apodo "${id}".`);
      return;
    }
    if (!form.fullName.trim()) {
      Alert.alert('Falta el nombre', 'Indica el nombre completo.');
      return;
    }
    const persona: Persona = {
      color: form.color,
      bg: form.bg,
      fullName: form.fullName.trim(),
      role: form.role,
      ...(form.activeFrom.trim() ? { activeFrom: form.activeFrom.trim() } : {}),
      ...(form.activeUntil.trim() ? { activeUntil: form.activeUntil.trim() } : {}),
    };
    // Si se edita y se cambia el apodo, lo tratamos como crear uno nuevo y borrar el viejo.
    if (editingId && editingId !== id) {
      await removePersona(editingId);
    }
    await upsertPersona(id, persona);
    closeModal();
  }

  function handleRemove(id: string) {
    Alert.alert(
      'Eliminar socorrista',
      `¿Seguro que quieres eliminar a "${id}" (${roster[id]?.fullName})? Esto no borra los turnos ya asignados en el calendario.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removePersona(id) },
      ]
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Añade, edita o elimina socorristas. El rol solo determina qué horario se les
        aplica automáticamente en el calendario (ver "Correturnos").
      </Text>

      <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
        <Text style={styles.addBtnTxt}>+ Añadir socorrista</Text>
      </TouchableOpacity>

      {ids.map(id => {
        const p = roster[id];
        return (
          <View key={id} style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: p.bg }]}>
              <Text style={[styles.avatarTxt, { color: p.color }]}>{id}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{p.fullName}</Text>
              <Text style={styles.rowMeta}>
                {ROLES.find(r => r.value === (p.role ?? 'socorrista'))?.label}
                {p.activeFrom || p.activeUntil
                  ? ` · ${p.activeFrom ?? '…'} → ${p.activeUntil ?? '…'}`
                  : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(id)}>
              <Text style={styles.iconTxt}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleRemove(id)}>
              <Text style={[styles.iconTxt, { color: colors.red }]}>✕</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.sheetTitle}>
              {creating ? 'Nuevo socorrista' : `Editar ${editingId}`}
            </Text>

            <ScrollView style={{ maxHeight: '100%' }}>
              <Text style={styles.fieldLabel}>Apodo (identificador)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: BJ"
                placeholderTextColor={colors.text3}
                autoCapitalize="characters"
                value={form.id}
                onChangeText={v => setForm(f => ({ ...f, id: v }))}
              />

              <Text style={styles.fieldLabel}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Bartolomé José"
                placeholderTextColor={colors.text3}
                value={form.fullName}
                onChangeText={v => setForm(f => ({ ...f, fullName: v }))}
              />

              <Text style={styles.fieldLabel}>Rol</Text>
              <View style={styles.chipRow}>
                {ROLES.map(r => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.chip, form.role === r.value && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, role: r.value }))}
                  >
                    <Text style={[styles.chipTxt, form.role === r.value && styles.chipTxtActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Color</Text>
              <View style={styles.swatchRow}>
                {PALETTE.map(c => (
                  <TouchableOpacity
                    key={c.color}
                    style={[
                      styles.swatch,
                      { backgroundColor: c.bg, borderColor: c.color },
                      form.color === c.color && styles.swatchActive,
                    ]}
                    onPress={() => setForm(f => ({ ...f, color: c.color, bg: c.bg }))}
                  />
                ))}
              </View>

              <DatePickerField
                label="Activo desde (opcional)"
                value={form.activeFrom}
                onChange={v => setForm(f => ({ ...f, activeFrom: v }))}
                placeholder="Sin fecha de inicio"
              />

              <DatePickerField
                label="Activo hasta (opcional)"
                value={form.activeUntil}
                onChange={v => setForm(f => ({ ...f, activeUntil: v }))}
                placeholder="Sin fecha de fin"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveTxt}>Guardar</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 12, gap: 10 },
    intro: { fontSize: 12, color: colors.text2, marginBottom: 6, lineHeight: 18 },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 6,
    },
    addBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
    },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { fontSize: 13, fontWeight: '700' },
    rowInfo: { flex: 1 },
    rowName: { fontSize: 13, fontWeight: '600', color: colors.text },
    rowMeta: { fontSize: 11, color: colors.text3, marginTop: 2 },
    iconBtn: { padding: 6 },
    iconTxt: { fontSize: 16, color: colors.text2 },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
      maxHeight: '88%',
    },
    handle: { width: 36, height: 4, backgroundColor: colors.border2, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    closeBtn: { position: 'absolute', top: 16, right: 16, padding: 6 },
    closeTxt: { fontSize: 18, color: colors.text2 },
    sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 14 },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text3,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surface2,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 24,
      paddingVertical: 7,
      paddingHorizontal: 14,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.blueLight },
    chipTxt: { fontSize: 13, fontWeight: '600', color: colors.text },
    chipTxtActive: { color: colors.primary },
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
    swatchActive: { borderWidth: 3 },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
    },
    saveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
