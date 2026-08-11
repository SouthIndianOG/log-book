import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { createRecord, updateRecord, deleteRecord, pendingSyncCount } from './outbox'

afterEach(async () => {
  await db.cases.clear()
  await db.complication_types.clear()
  await db.sync_queue.clear()
})

describe('createRecord', () => {
  it('writes to the Dexie table and enqueues an insert', async () => {
    await createRecord('cases', {
      id: 'case-1',
      user_id: 'user-1',
      patient_name: 'Test Patient',
      admit_date: '2026-01-01',
      status: 'active',
      updated_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    })

    const stored = await db.cases.get('case-1')
    expect(stored?.patient_name).toBe('Test Patient')

    const queued = await db.sync_queue.toArray()
    expect(queued).toHaveLength(1)
    expect(queued[0]).toMatchObject({ table: 'cases', operation: 'insert', recordId: 'case-1' })
  })
})

describe('updateRecord', () => {
  it('stamps updated_at for tables that have the column', async () => {
    await createRecord('cases', {
      id: 'case-2',
      user_id: 'user-1',
      patient_name: 'Original',
      admit_date: '2026-01-01',
      status: 'active',
      updated_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    })

    await updateRecord('cases', 'case-2', { patient_name: 'Updated' })

    const stored = await db.cases.get('case-2')
    expect(stored?.patient_name).toBe('Updated')
    expect(stored?.updated_at).not.toBe('2026-01-01T00:00:00Z')

    const queued = await db.sync_queue.toArray()
    const updateEntry = queued.find((q) => q.operation === 'update')
    expect(updateEntry?.payload?.updated_at).toBe(stored?.updated_at)
  })

  it('does not stamp updated_at for tables without the column', async () => {
    await createRecord('complication_types', {
      id: 'ct-1',
      user_id: 'user-1',
      label: 'Bleeding',
      is_default: true,
      usage_count: 0,
    })

    await updateRecord('complication_types', 'ct-1', { usage_count: 1 })

    const stored = await db.complication_types.get('ct-1')
    expect(stored?.usage_count).toBe(1)
    expect(stored).not.toHaveProperty('updated_at')
  })
})

describe('deleteRecord', () => {
  it('removes the row and enqueues a delete', async () => {
    await createRecord('cases', {
      id: 'case-3',
      user_id: 'user-1',
      patient_name: 'To Delete',
      admit_date: '2026-01-01',
      status: 'active',
      updated_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    })

    await deleteRecord('cases', 'case-3')

    expect(await db.cases.get('case-3')).toBeUndefined()
    const queued = await db.sync_queue.toArray()
    expect(queued.some((q) => q.operation === 'delete' && q.recordId === 'case-3')).toBe(true)
  })
})

describe('pendingSyncCount', () => {
  it('reflects the number of queued items', async () => {
    expect(await pendingSyncCount()).toBe(0)
    await createRecord('cases', {
      id: 'case-4',
      user_id: 'user-1',
      patient_name: 'Counted',
      admit_date: '2026-01-01',
      status: 'active',
      updated_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    })
    expect(await pendingSyncCount()).toBe(1)
  })
})
