import React from 'react';
import { getResources } from '@/actions/resources';
import { MyReservationsView } from '@/components/reservations/MyReservationsView';
import { ResourceData } from '@/components/resources/ResourceCard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Reservations — SyncSpace',
  description: 'Manage upcoming bookings, review approval requests, and view reservation history on SyncSpace.',
};

export default async function MyReservationsPage() {
  const resourcesRes = await getResources();
  const resources = resourcesRes.success
    ? (resourcesRes.resources as unknown as ResourceData[])
    : [];

  return <MyReservationsView resources={resources} />;
}
