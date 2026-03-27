import { act } from '@testing-library/react-native'
import { useToastStore, toast } from '../toast.store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getState() {
  return useToastStore.getState()
}

function resetStore() {
  useToastStore.setState({ queue: [] })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers()
  resetStore()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('useToastStore', () => {
  describe('show', () => {
    it('adds a toast item to the queue', () => {
      act(() => { getState().show('Hello!') })
      expect(getState().queue).toHaveLength(1)
      expect(getState().queue[0].message).toBe('Hello!')
    })

    it('defaults to type "info" and duration 3000', () => {
      act(() => { getState().show('msg') })
      const item = getState().queue[0]
      expect(item.type).toBe('info')
      expect(item.duration).toBe(3000)
    })

    it('accepts custom type and duration', () => {
      act(() => { getState().show('Saved', 'success', 5000) })
      const item = getState().queue[0]
      expect(item.type).toBe('success')
      expect(item.duration).toBe(5000)
    })

    it('assigns a unique id to each toast', () => {
      act(() => {
        getState().show('A')
        getState().show('B')
      })
      const [a, b] = getState().queue
      expect(a.id).not.toBe(b.id)
    })

    it('auto-removes after duration + 500ms', () => {
      act(() => { getState().show('Temp', 'info', 2000) })
      expect(getState().queue).toHaveLength(1)

      act(() => { jest.advanceTimersByTime(2499) })
      expect(getState().queue).toHaveLength(1)

      act(() => { jest.advanceTimersByTime(1) }) // now at 2500ms
      expect(getState().queue).toHaveLength(0)
    })
  })

  describe('dismiss', () => {
    it('removes a toast by id', () => {
      act(() => { getState().show('Remove me') })
      const { id } = getState().queue[0]
      act(() => { getState().dismiss(id) })
      expect(getState().queue).toHaveLength(0)
    })

    it('ignores an unknown id', () => {
      act(() => { getState().show('Keep') })
      act(() => { getState().dismiss('nonexistent') })
      expect(getState().queue).toHaveLength(1)
    })

    it('only removes the targeted toast when multiple exist', () => {
      act(() => {
        getState().show('A')
        getState().show('B')
        getState().show('C')
      })
      const idToRemove = getState().queue[1].id
      act(() => { getState().dismiss(idToRemove) })
      expect(getState().queue).toHaveLength(2)
      expect(getState().queue.map((t) => t.message)).toEqual(['A', 'C'])
    })
  })
})

describe('toast singleton', () => {
  it('toast.info calls show with type "info"', () => {
    act(() => { toast.info('Info msg') })
    expect(getState().queue[0]).toMatchObject({ message: 'Info msg', type: 'info' })
  })

  it('toast.success calls show with type "success"', () => {
    act(() => { toast.success('Done') })
    expect(getState().queue[0]).toMatchObject({ message: 'Done', type: 'success' })
  })

  it('toast.error calls show with type "error"', () => {
    act(() => { toast.error('Oops') })
    expect(getState().queue[0]).toMatchObject({ message: 'Oops', type: 'error' })
  })

  it('toast.warning calls show with type "warning"', () => {
    act(() => { toast.warning('Careful') })
    expect(getState().queue[0]).toMatchObject({ message: 'Careful', type: 'warning' })
  })

  it('accepts an optional duration', () => {
    act(() => { toast.success('Quick', 1000) })
    expect(getState().queue[0].duration).toBe(1000)
  })
})
