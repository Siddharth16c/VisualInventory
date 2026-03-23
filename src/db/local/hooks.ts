import { useState, useEffect, useCallback } from 'react';
import { getDb, initLocalDb } from './db';
import { pullFromSupabase, pushToSupabase, getSyncStatus, syncAll } from './sync';

export function useLocalDb() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initLocalDb()
      .then(() => setIsReady(true))
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, []);

  return { isReady, isLoading, error };
}

export function useSyncStatus() {
  const [status, setStatus] = useState<Record<string, { lastSync: string; count: number; pendingWrites: number }>>({});
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const s = await getSyncStatus();
      setStatus(s);
    } catch (err) {
      console.error('Failed to get sync status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, isLoading, refresh };
}

export function useSync() {
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const pull = useCallback(async (tables?: string[]) => {
    setIsPulling(true);
    setLastError(null);
    try {
      const result = await pullFromSupabase(tables);
      if (result.errors.length > 0) {
        setLastError(result.errors.join('; '));
      }
      return result;
    } catch (err: any) {
      setLastError(err.message);
      throw err;
    } finally {
      setIsPulling(false);
    }
  }, []);

  const push = useCallback(async () => {
    setIsPushing(true);
    setLastError(null);
    try {
      const result = await pushToSupabase();
      if (result.errors.length > 0) {
        setLastError(result.errors.join('; '));
      }
      return result;
    } catch (err: any) {
      setLastError(err.message);
      throw err;
    } finally {
      setIsPushing(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setIsPulling(true);
    setIsPushing(true);
    setLastError(null);
    try {
      const result = await syncAll();
      if (result.pullResult.errors.length > 0 || result.pushResult.errors.length > 0) {
        setLastError([...result.pullResult.errors, ...result.pushResult.errors].join('; '));
      }
      return result;
    } catch (err: any) {
      setLastError(err.message);
      throw err;
    } finally {
      setIsPulling(false);
      setIsPushing(false);
    }
  }, []);

  return {
    isPulling,
    isPushing,
    lastError,
    pull,
    push,
    sync,
    clearError: () => setLastError(null),
  };
}

import { dbEventEmitter } from '../events';

export function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: any[] = [],
  defaultVal?: T
): T | undefined {
  const [data, setData] = useState<T | undefined>(defaultVal);

  const fetch = useCallback(async () => {
    try {
      const result = await querier();
      setData(result);
    } catch (err: any) {
      console.error('useLiveQuery error:', err);
    }
  }, deps);

  useEffect(() => {
    fetch();
    const handler = () => fetch();
    dbEventEmitter.addEventListener('db_changed', handler);
    return () => dbEventEmitter.removeEventListener('db_changed', handler);
  }, [fetch]);

  return data;
}