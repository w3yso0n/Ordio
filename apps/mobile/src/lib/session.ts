import { Alert } from 'react-native';
import { router } from 'expo-router';
import { clearDeviceSession } from './api';
import { queueClear } from '../db/client.native';
import { clearLocalSessionData } from './local-checks';
import { resetTicketStore } from './ticket-store';

export async function signOutToPair() {
  await clearDeviceSession();
  clearLocalSessionData();
  resetTicketStore();
  queueClear();
  router.replace('/pair');
}

export function confirmSignOut(message: string) {
  Alert.alert('Cerrar sesión', message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Salir', style: 'destructive', onPress: () => void signOutToPair() },
  ]);
}
