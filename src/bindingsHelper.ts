import { atom, selector, DefaultValue, RecoilState } from 'recoil'
import serial from './Serial'
import { throttle } from 'lodash'

export function memoSelector<T>(theAtom: RecoilState<T>) {
  return selector<T>({
    key: 'memo' + theAtom.key,
    get: ({ get }) => get(theAtom),
    set: ({ set, get }, newValue) => {
      const old = get(theAtom)
      if (old !== newValue) {
        set(theAtom, newValue)
      }
    }
  })
}

export function createHook<T>({
  key,
  ui2mcu,
  mcu2ui
}: {
  key: string
  ui2mcu: (v: T) => number
  mcu2ui: (v: number) => T
}) {
  const state = memoSelector(
    atom<T>({
      key,
      default: mcu2ui(0)
    })
  )

  // throttle to avoid filling the MCU serial buffer
  const serial_write = throttle(serial.write, 50, {
    leading: false,
    trailing: true
  })
  const send = selector<T>({
    key: key + '-selector',
    get: ({ get }) => get(state),
    set: ({ set }, newValue) => {
      if (newValue instanceof DefaultValue) throw new Error('no reset allowed')
      set(state, newValue)
      serial_write(key + ui2mcu(newValue) + '>')
    }
  })
  const receive = selector<number>({
    key: key + '-receive-selector',
    get: () => {
      throw new Error('cant get here')
    },
    set: ({ set }, newValue) => {
      if (newValue instanceof DefaultValue) throw new Error('no reset allowed')
      set(state, mcu2ui(newValue))
    }
  })

  return { send, receive }
}