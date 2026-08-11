import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { orderMock, fromMock } = vi.hoisted(() => {
  const orderMock = vi.fn()
  const gtMock = vi.fn(() => ({ order: orderMock }))
  const eqMock = vi.fn(() => ({ gt: gtMock }))
  const selectMock = vi.fn(() => ({ eq: eqMock }))
  const fromMock = vi.fn(() => ({ select: selectMock }))
  return { orderMock, fromMock }
})

vi.mock('../supabase/client', () => ({
  supabase: { from: fromMock },
}))

import { db } from '../db/schema'
import { pullRemoteChanges } from './pull'

beforeEach(() => {
  orderMock.mockReset()
  orderMock.mockResolvedValue({ data: [], error: null })
})

afterEach(async () => {
  await db.cases.clear()
  await db.case_entries.clear()
  await db.opd_entries.clear()
  await db.sync_meta.clear()
  fromMock.mockClear()
})

describe('pullRemoteChanges', () => {
  it('applies a remote row when there is no local copy', async () => {
    orderMock
      .mockResolvedValueOnce({
        data: [{ id: 'case-1', user_id: 'user-1', patient_name: 'Remote', updated_at: '2026-01-02T00:00:00Z' }],
        error: null,
      })
      .mockResolvedValue({ data: [], error: null })

    await pullRemoteChanges('user-1')

    const stored = await db.cases.get('case-1')
    expect(stored?.patient_name).toBe('Remote')

    const meta = await db.sync_meta.get('cases')
    expect(meta?.lastSyncedAt).toBe('2026-01-02T00:00:00Z')
  })

  it('overwrites local with remote when remote is newer (last-write-wins)', async () => {
    await db.cases.put({
      id: 'case-2',
      user_id: 'user-1',
      patient_name: 'Local (stale)',
      admit_date: '2026-01-01',
      status: 'active',
      updated_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    })

    orderMock
      .mockResolvedValueOnce({
        data: [
          { id: 'case-2', user_id: 'user-1', patient_name: 'Remote (fresh)', updated_at: '2026-01-03T00:00:00Z' },
        ],
        error: null,
      })
      .mockResolvedValue({ data: [], error: null })

    await pullRemoteChanges('user-1')

    const stored = await db.cases.get('case-2')
    expect(stored?.patient_name).toBe('Remote (fresh)')
  })

  it('keeps local when local is newer than the pulled remote row', async () => {
    await db.cases.put({
      id: 'case-3',
      user_id: 'user-1',
      patient_name: 'Local (fresh, unsynced edit)',
      admit_date: '2026-01-01',
      status: 'active',
      updated_at: '2026-01-05T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    })

    orderMock
      .mockResolvedValueOnce({
        data: [
          { id: 'case-3', user_id: 'user-1', patient_name: 'Remote (stale)', updated_at: '2026-01-04T00:00:00Z' },
        ],
        error: null,
      })
      .mockResolvedValue({ data: [], error: null })

    await pullRemoteChanges('user-1')

    const stored = await db.cases.get('case-3')
    expect(stored?.patient_name).toBe('Local (fresh, unsynced edit)')
  })
})
