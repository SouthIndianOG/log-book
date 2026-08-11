import { afterEach, describe, expect, it, vi } from 'vitest'

const { upsertMock, deleteEqMock, fromMock } = vi.hoisted(() => {
  const upsertMock = vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null }))
  const deleteEqMock = vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null }))
  const fromMock = vi.fn(() => ({
    upsert: upsertMock,
    delete: () => ({ eq: deleteEqMock }),
  }))
  return { upsertMock, deleteEqMock, fromMock }
})

vi.mock('../supabase/client', () => ({
  supabase: { from: fromMock },
}))

import { db } from '../db/schema'
import { drainQueue } from './drain'

afterEach(async () => {
  await db.sync_queue.clear()
  upsertMock.mockReset()
  upsertMock.mockImplementation(async () => ({ error: null }))
  deleteEqMock.mockReset()
  deleteEqMock.mockImplementation(async () => ({ error: null }))
  fromMock.mockClear()
})

describe('drainQueue', () => {
  it('upserts a queued insert and removes it from the queue', async () => {
    await db.sync_queue.add({
      table: 'cases',
      operation: 'insert',
      recordId: 'case-1',
      payload: { id: 'case-1', patient_name: 'Test' },
      createdAt: new Date().toISOString(),
      attempts: 0,
    })

    await drainQueue()

    expect(fromMock).toHaveBeenCalledWith('cases')
    expect(upsertMock).toHaveBeenCalledWith({ id: 'case-1', patient_name: 'Test' })
    expect(await db.sync_queue.count()).toBe(0)
  })

  it('strips local-only fields from attachments before upserting', async () => {
    await db.sync_queue.add({
      table: 'attachments',
      operation: 'insert',
      recordId: 'att-1',
      payload: {
        id: 'att-1',
        storage_path: 'attachments/att-1',
        localBlob: new Blob(['x']),
        uploadStatus: 'pending',
      },
      createdAt: new Date().toISOString(),
      attempts: 0,
    })

    await drainQueue()

    expect(upsertMock).toHaveBeenCalledWith({ id: 'att-1', storage_path: 'attachments/att-1' })
  })

  it('deletes via .eq for a queued delete operation', async () => {
    await db.sync_queue.add({
      table: 'cases',
      operation: 'delete',
      recordId: 'case-2',
      createdAt: new Date().toISOString(),
      attempts: 0,
    })

    await drainQueue()

    expect(deleteEqMock).toHaveBeenCalledWith('id', 'case-2')
    expect(await db.sync_queue.count()).toBe(0)
  })

  it('stops draining on failure and preserves order for retry', async () => {
    upsertMock.mockImplementationOnce(async () => ({ error: new Error('network down') }))

    await db.sync_queue.bulkAdd([
      {
        table: 'cases',
        operation: 'insert',
        recordId: 'case-3',
        payload: { id: 'case-3' },
        createdAt: new Date().toISOString(),
        attempts: 0,
      },
      {
        table: 'cases',
        operation: 'insert',
        recordId: 'case-4',
        payload: { id: 'case-4' },
        createdAt: new Date().toISOString(),
        attempts: 0,
      },
    ])

    await drainQueue()

    const remaining = await db.sync_queue.orderBy('id').toArray()
    expect(remaining).toHaveLength(2)
    expect(remaining[0].recordId).toBe('case-3')
    expect(remaining[0].attempts).toBe(1)
    expect(remaining[0].lastError).toContain('network down')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })
})
