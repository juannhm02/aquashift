import React from 'react';
import { NotificationsScreen } from '../../src/screens/NotificationsScreen';
import { useTabSession } from '../../src/store/TabSessionContext';

export default function NotificationsTabScreen() {
  const { user, swaps, setSwaps } = useTabSession();

  return <NotificationsScreen currentUser={user} swaps={swaps} onSwapsChange={setSwaps} />;
}
