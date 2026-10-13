import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getResourceById, getResources } from '@/actions/resources';
import { ResourceDetailView } from '@/components/resources/ResourceDetailView';
import { Layers, ArrowLeft } from 'lucide-react';
import { ResourceData } from '@/components/resources/ResourceCard';

export const dynamic = 'force-dynamic';

interface ResourcePageProps {
  params: Promise<{ id: string }>;
}

export default async function ResourcePage({ params }: ResourcePageProps) {
  const { id } = await params;

  const [resourceRes, allResourcesRes] = await Promise.all([
    getResourceById(id),
    getResources(),
  ]);

  if (!resourceRes.success || !resourceRes.resource) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Resource Not Found
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          The requested resource identifier does not exist or has been removed from the directory.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  const allResources = allResourcesRes.success
    ? (allResourcesRes.resources as unknown as ResourceData[])
    : [];

  return (
    <ResourceDetailView
      resource={resourceRes.resource as unknown as ResourceData}
      allResources={allResources}
    />
  );
}
