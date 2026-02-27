export const dbEventEmitter = new EventTarget();

export function emitDbChange(table: string) {
    dbEventEmitter.dispatchEvent(new CustomEvent('db_changed', { detail: { table } }));
}
