import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Skeleton } from '@phantom/ui'

export function SkeletonChatListItem() {
  return (
    <View style={styles.row}>
      <Skeleton.Avatar size={52} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Skeleton width="55%" height={14} radius={7} />
          <Skeleton width={40} height={11} radius={5} />
        </View>
        <Skeleton width="75%" height={12} radius={6} />
      </View>
    </View>
  )
}

SkeletonChatListItem.displayName = 'SkeletonChatListItem'

export function SkeletonChatList({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonChatListItem key={i} />
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
