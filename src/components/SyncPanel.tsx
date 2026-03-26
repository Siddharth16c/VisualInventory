import { useState } from 'react';
import { Download, Upload, RefreshCw, Database, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useLocalDb, useSyncStatus, useSync } from '@/db/local/hooks';
import { exportDatabaseFile, importDatabaseFile } from '@/db/local/db';
import { emitDbChange } from '@/db/dal';

export function SyncPanel() {
  const { isReady, isLoading: dbLoading, error: dbError } = useLocalDb();
  const { status, isLoading: statusLoading, refresh: refreshStatus } = useSyncStatus();
  const { isPulling, isPushing, lastError, pull, push, sync, clearError } = useSync();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const file = await exportDatabaseFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visualos-backup-${new Date().toISOString().split('T')[0]}.db`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Database exported successfully!');
    } catch (err: any) {
      setMessage(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      await importDatabaseFile(file);
      setMessage('Database imported successfully! Refreshing...');
      emitDbChange('all');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setMessage(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSync = async () => {
    setMessage(null);
    try {
      const result = await sync();
      setMessage(`Sync complete: ${result.pullResult.pulled} pulled, ${result.pushResult.pushed} pushed`);
      refreshStatus();
      emitDbChange('all');
    } catch (err: any) {
      setMessage(`Sync failed: ${err.message}`);
    }
  };

  const handlePullOnly = async () => {
    setMessage(null);
    try {
      const result = await pull();
      setMessage(`Pulled ${result.pulled} records from cloud`);
      refreshStatus();
      emitDbChange('all');
    } catch (err: any) {
      setMessage(`Pull failed: ${err.message}`);
    }
  };

  const handlePushOnly = async () => {
    setMessage(null);
    try {
      const result = await push();
      setMessage(`Pushed ${result.pushed} pending changes to cloud`);
      refreshStatus();
    } catch (err: any) {
      setMessage(`Push failed: ${err.message}`);
    }
  };

  if (dbLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Initializing local database...</span>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="h-4 w-4" />
        <span>Failed to initialize local database: {dbError.message}</span>
      </div>
    );
  }

  if (!isReady) {
    return null;
  }

  const pendingCount = Object.values(status).reduce((sum, s: any) => sum + s.pendingWrites, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-indigo-400" />
        <h3 className="font-semibold text-slate-200">Local Database Sync</h3>
      </div>

      {lastError && (
        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-2 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{lastError}</span>
          <button onClick={clearError} className="ml-auto text-red-300 hover:text-red-100">×</button>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-900/20 p-2 rounded-lg">
          <Check className="h-4 w-4" />
          <span className="text-sm">{message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={handleSync}
          disabled={isPulling || isPushing}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isPulling || isPushing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync All
        </button>

        <button
          onClick={handlePullOnly}
          disabled={isPulling}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          {isPulling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Pull
        </button>

        <button
          onClick={handlePushOnly}
          disabled={isPushing || pendingCount === 0}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          {isPushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Push ({pendingCount})
        </button>

        <button
          onClick={refreshStatus}
          disabled={statusLoading}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          {statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Import / Export</h4>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Backup
          </button>

          <label className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 cursor-pointer text-white rounded-lg text-sm font-medium transition-colors">
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import Backup
            <input
              type="file"
              accept=".db,.sqlite,.sqlite3"
              onChange={handleImport}
              disabled={isImporting}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Export saves the entire local database. Import replaces all local data.
        </p>
      </div>

      {Object.keys(status).length > 0 && (
        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Table Status</h4>
          <div className="grid gap-1 text-xs max-h-48 overflow-y-auto">
            {Object.entries(status).map(([table, s]: [string, any]) => (
              <div key={table} className="flex justify-between px-2 py-1 bg-slate-800 rounded">
                <span className="text-slate-300">{table}</span>
                <span className="text-slate-500">
                  {s.count} records · {s.pendingWrites > 0 && <span className="text-amber-400">{s.pendingWrites} pending</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}