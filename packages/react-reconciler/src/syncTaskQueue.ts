let syncQueue: ((...args: any) => void)[] | null = null
let isFlushingSyncQueue = false

export function scheduleSyncCallback(callback: (...args: any) => void) {
	if (syncQueue === null) {
		syncQueue = [callback]
	} else {
		syncQueue.push(callback)
	}
}

export function flushSyncCallback() {
	if (!isFlushingSyncQueue && syncQueue) {
		isFlushingSyncQueue = true
		try {
			syncQueue.forEach((callback) => callback())
		} catch (e) {
			if (true) {
				console.error('flushSyncCallback:error', e)
			}
		} finally {
			isFlushingSyncQueue = false
		}
	}
}
