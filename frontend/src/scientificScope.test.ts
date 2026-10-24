import { describe, expect, it } from 'vitest'
import { scientificScopeNote } from './scientificScope'

describe('volcano scientific scope wording', () => {

  it('marks Taal as the focus without claiming validation', () => {

    const note = scientificScopeNote('taal') ?? ''

    expect(note).toMatch(/Scientific focus/)
    expect(note).toMatch(/not established/)
    expect(note).not.toMatch(/validated/i)

  })
  it('marks Mayon and Kanlaon as teaching illustrations without a reference event', () => {

    for (const id of ['mayon', 'kanlaon'])
      expect(scientificScopeNote(id)).toMatch(/^Teaching illustration only\./)

  })
  it('adds no scope claim for an unknown or custom vent', () => {

    expect(scientificScopeNote('custom')).toBeNull()

  })
  it('keeps UI copy free of em dashes', () => {

    for (const id of ['taal', 'mayon', 'kanlaon'])
      expect(scientificScopeNote(id)).not.toContain('\u2014')

  })

})
