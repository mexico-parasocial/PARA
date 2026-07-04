import {
  type ComponentType,
  createRef,
  PureComponent,
  type ReactNode,
  type RefObject,
} from 'react'
import {type StyleProp, type ViewStyle} from 'react-native'
import {requireNativeViewManager} from 'expo-modules-core'

import {type VisibilityViewProps} from './types'
const NativeView: ComponentType<{
  onChangeStatus: (e: {nativeEvent: {isActive: boolean}}) => void
  children: ReactNode
  enabled: boolean
  style: StyleProp<ViewStyle>
}> = requireNativeViewManager('ExpoBlueskyVisibilityView')

export class VisibilityView extends PureComponent<VisibilityViewProps> {
  ref: RefObject<unknown>

  constructor(props: VisibilityViewProps) {
    super(props)
    this.ref = createRef()
    this.onChangeStatus = this.onChangeStatus.bind(this)
  }

  onChangeStatus(e: {nativeEvent: {isActive: boolean}}) {
    this.props.onChangeStatus(e.nativeEvent.isActive)
  }

  render() {
    return (
      <NativeView
        ref={this.ref}
        enabled={this.props.enabled}
        style={this.props.style}
        onChangeStatus={this.onChangeStatus}>
        {this.props.children}
      </NativeView>
    )
  }
}
