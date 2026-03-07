'use client';

import { useState, useRef } from 'react';

export interface ImportCard {
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  foil: boolean;
  rarity: string;
  quantity: number;
  scryfallId: string;
  purchasePrice: number;
  currency: string;
  condition: string;
  language: string;
  misprint: boolean;
  altered: boolean;
}

export function useImport(onImportComplete: () => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCards, setImportCards] = useState<ImportCard[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle');
  const [importResult, setImportResult] = useState<{ imported: number; errors?: string[] } | null>(null);
  const [importGameType, setImportGameType] = useState<'mtg' | 'pokemon' | 'lorcana'>('mtg');
  const [originalCsvContent, setOriginalCsvContent] = useState('');
  const [totalCardsToImport, setTotalCardsToImport] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportStatus('preview');
    try {
      const text = await file.text();
      setOriginalCsvContent(text);
      const res = await fetch('/api/collection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: text, action: 'preview', gameType: importGameType }),
      });
      const data = await res.json();
      if (data.success) {
        setImportCards(data.cards);
        setTotalCardsToImport(data.totalCards || data.cards.length);
      } else {
        alert('Failed to parse CSV: ' + (data.error || 'Unknown error'));
        setImportStatus('idle');
      }
    } catch {
      alert('Failed to read file');
      setImportStatus('idle');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    setImportLoading(true);
    setImportStatus('importing');
    try {
      const res = await fetch('/api/collection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: originalCsvContent, action: 'import', gameType: importGameType }),
      });
      const data = await res.json();
      setImportResult(data);
      setImportStatus('done');
      onImportComplete();
    } catch {
      alert('Failed to import cards');
      setImportStatus('preview');
    } finally {
      setImportLoading(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportCards([]);
    setImportStatus('idle');
    setImportResult(null);
    setOriginalCsvContent('');
    setTotalCardsToImport(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    fileInputRef, showImportModal, setShowImportModal,
    importCards, importLoading, importStatus, setImportStatus,
    importResult, importGameType, setImportGameType,
    totalCardsToImport,
    handleFileUpload, confirmImport, closeImportModal,
  };
}
