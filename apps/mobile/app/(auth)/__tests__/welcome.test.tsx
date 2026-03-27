import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import WelcomeScreen from '../welcome'

// router is already mocked in jest.setup.ts

describe('WelcomeScreen', () => {
  it('renders the app name', () => {
    const { getByText } = render(<WelcomeScreen />)
    expect(getByText('PhantomMsgr')).toBeTruthy()
  })

  it('renders the tagline', () => {
    const { getByText } = render(<WelcomeScreen />)
    expect(getByText(/Encrypted, anonymous messaging/)).toBeTruthy()
  })

  it('renders feature pills', () => {
    const { getByText } = render(<WelcomeScreen />)
    expect(getByText('Anonymous')).toBeTruthy()
    expect(getByText('Encrypted')).toBeTruthy()
    expect(getByText('Open Source')).toBeTruthy()
  })

  it('renders Create Account button', () => {
    const { getByText } = render(<WelcomeScreen />)
    expect(getByText('Create Account')).toBeTruthy()
  })

  it('renders Recover Account button', () => {
    const { getByText } = render(<WelcomeScreen />)
    expect(getByText('Recover Account')).toBeTruthy()
  })

  it('navigates to register screen when Create Account is pressed', () => {
    const { router } = require('expo-router')
    const { getByText } = render(<WelcomeScreen />)

    fireEvent.press(getByText('Create Account'))

    expect(router.push).toHaveBeenCalledWith('/(auth)/register')
  })

  it('navigates to recover screen when Recover Account is pressed', () => {
    const { router } = require('expo-router')
    const { getByText } = render(<WelcomeScreen />)

    fireEvent.press(getByText('Recover Account'))

    expect(router.push).toHaveBeenCalledWith('/(auth)/recover')
  })

  it('renders Terms of Service notice', () => {
    const { getByText } = render(<WelcomeScreen />)
    expect(getByText(/Terms of Service/)).toBeTruthy()
  })

  it('renders the ghost emoji logo', () => {
    const { getByText } = render(<WelcomeScreen />)
    expect(getByText('👻')).toBeTruthy()
  })
})
