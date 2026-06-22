import React from 'react';
import { DebtsScreen } from '../../src/screens/DebtsScreen';
import { useTabSession } from '../../src/store/TabSessionContext';

export default function DebtsTabScreen() {
  const { user, swaps } = useTabSession();

  return <DebtsScreen currentUser={user} swaps={swaps} />;
}
