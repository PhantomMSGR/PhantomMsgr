import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SearchBar } from '../SearchBar'

const DEFAULT_PROPS = {
  value: '',
  onChange: jest.fn(),
  onCancel: jest.fn(),
  isExpanded: false,
  onExpand: jest.fn(),
}

describe('SearchBar', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('collapsed state', () => {
    it('shows the search icon button', () => {
      const { getByTestId } = render(<SearchBar {...DEFAULT_PROPS} isExpanded={false} />)
      // Ionicons mock renders as View with testID="icon-search"
      expect(getByTestId('icon-search')).toBeTruthy()
    })

    it('does not show TextInput when collapsed', () => {
      const { UNSAFE_queryAllByType } = render(
        <SearchBar {...DEFAULT_PROPS} isExpanded={false} />,
      )
      const { TextInput } = require('react-native')
      expect(UNSAFE_queryAllByType(TextInput)).toHaveLength(0)
    })

    it('calls onExpand when search icon button is pressed', () => {
      const onExpand = jest.fn()
      const { getByTestId } = render(
        <SearchBar {...DEFAULT_PROPS} isExpanded={false} onExpand={onExpand} />,
      )
      // Press the icon — event bubbles up to the wrapping Pressable
      fireEvent.press(getByTestId('icon-search'))
      expect(onExpand).toHaveBeenCalledTimes(1)
    })
  })

  describe('expanded state', () => {
    it('shows the TextInput when expanded', () => {
      const { UNSAFE_getAllByType } = render(
        <SearchBar {...DEFAULT_PROPS} isExpanded />,
      )
      const { TextInput } = require('react-native')
      expect(UNSAFE_getAllByType(TextInput)).toHaveLength(1)
    })

    it('shows the Cancel button when expanded', () => {
      const { getByText } = render(<SearchBar {...DEFAULT_PROPS} isExpanded />)
      expect(getByText('Cancel')).toBeTruthy()
    })

    it('reflects the current value in TextInput', () => {
      const { UNSAFE_getByType } = render(
        <SearchBar {...DEFAULT_PROPS} isExpanded value="Alice" />,
      )
      const { TextInput } = require('react-native')
      const input = UNSAFE_getByType(TextInput)
      expect(input.props.value).toBe('Alice')
    })

    it('calls onChange when text is typed', () => {
      const onChange = jest.fn()
      const { UNSAFE_getByType } = render(
        <SearchBar {...DEFAULT_PROPS} isExpanded onChange={onChange} />,
      )
      const { TextInput } = require('react-native')
      fireEvent.changeText(UNSAFE_getByType(TextInput), 'Bob')
      expect(onChange).toHaveBeenCalledWith('Bob')
    })

    it('calls onCancel and onChange("") when Cancel is pressed', () => {
      const onCancel = jest.fn()
      const onChange = jest.fn()
      const { getByText } = render(
        <SearchBar {...DEFAULT_PROPS} isExpanded onCancel={onCancel} onChange={onChange} />,
      )
      fireEvent.press(getByText('Cancel'))
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('')
    })
  })
})
