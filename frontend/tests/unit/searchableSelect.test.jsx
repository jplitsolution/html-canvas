import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SearchableSelect from '../../src/components/ui/SearchableSelect'

describe('SearchableSelect', () => {
  const options = [
    { value: '1', label: 'ML_Moov_Mia (233)', sublabel: 'ID: 233 · CI / Moov' },
    { value: '2', label: 'Digiadmob (23)', sublabel: 'Code: DAM' },
    { value: '3', label: 'Offer_Zain (45)', sublabel: 'IQ / Zain' },
  ]

  it('renders placeholder when no value is selected', () => {
    render(
      <SearchableSelect
        value=""
        onChange={() => {}}
        options={options}
        placeholder="All offers / campaigns"
      />,
    )
    expect(screen.getByText('All offers / campaigns')).toBeInTheDocument()
  })

  it('renders selected option label', () => {
    render(
      <SearchableSelect
        value="1"
        onChange={() => {}}
        options={options}
        placeholder="All offers / campaigns"
      />,
    )
    expect(screen.getByText('ML_Moov_Mia (233)')).toBeInTheDocument()
  })

  it('opens dropdown and allows searching options', () => {
    const handleChange = vi.fn()
    render(
      <SearchableSelect
        value=""
        onChange={handleChange}
        options={options}
        placeholder="Select campaign"
        searchPlaceholder="Search campaign..."
      />,
    )

    // Click trigger to open
    fireEvent.click(screen.getByRole('combobox'))

    // Search input should be rendered
    const searchInput = screen.getByPlaceholderText('Search campaign...')
    expect(searchInput).toBeInTheDocument()

    // Type in search query
    fireEvent.change(searchInput, { target: { value: 'Moov' } })

    // Only matching option should be visible
    expect(screen.getByText('ML_Moov_Mia (233)')).toBeInTheDocument()
    expect(screen.queryByText('Digiadmob (23)')).not.toBeInTheDocument()

    // Click matching option
    fireEvent.click(screen.getByText('ML_Moov_Mia (233)'))
    expect(handleChange).toHaveBeenCalledWith('1')
  })

  it('selects "All" option when clicked', () => {
    const handleChange = vi.fn()
    render(
      <SearchableSelect
        value="2"
        onChange={handleChange}
        options={options}
        allOptionLabel="All Vendors"
      />,
    )

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('All Vendors'))
    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('clears selection when clear button is clicked', () => {
    const handleChange = vi.fn()
    render(
      <SearchableSelect
        value="2"
        onChange={handleChange}
        options={options}
      />,
    )

    fireEvent.click(screen.getByTitle('Clear selection'))
    expect(handleChange).toHaveBeenCalledWith('')
  })
})
