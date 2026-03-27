/**
 * Must be imported before any library that calls crypto.getRandomValues()
 * (e.g. socket.io-client, tweetnacl).
 * expo-crypto provides a native implementation compatible with the Web Crypto API.
 */
import { getRandomValues } from 'expo-crypto'

if (typeof global.crypto === 'undefined') {
  ;(global as any).crypto = { getRandomValues }
} else if (typeof (global as any).crypto.getRandomValues === 'undefined') {
  ;(global as any).crypto.getRandomValues = getRandomValues
}
