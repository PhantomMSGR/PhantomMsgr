import { useNetInfo } from '@react-native-community/netinfo'

export function useNetworkStatus() {
  const netInfo = useNetInfo()
  const isOnline = netInfo.isConnected !== false
  return { isOnline, netInfo }
}
