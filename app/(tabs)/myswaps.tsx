import React from 'react';
import { MySwapsScreen } from '../../src/screens/MySwapsScreen';
import { useTabSession } from '../../src/store/TabSessionContext';

export default function MySwapsTabScreen() {
  const { user, swaps, setSwaps } = useTabSession();

  return <MySwapsScreen currentUser={user} swaps={swaps} onSwapsChange={setSwaps} />;
}
