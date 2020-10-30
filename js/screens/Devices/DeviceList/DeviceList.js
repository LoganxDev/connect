// libs
import React, { useState, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useBackHandler } from '@react-native-community/hooks'

// local
import DeviceRow from '../DeviceRow/DeviceRow';
import { Sheet } from '../../../components';

// styles
import Styles from '../DeviceMap/DeviceMapStyles';
import X from '../../../theme';

const DeviceList = (props) => {
  const [deviceListAtTop, setDeviceListAtTop] = useState(true);
  const [collapsed, setCollapsed] = useState(true);
  const sheetRef = useRef(null);
  const deviceListRef = useRef(null);

  useBackHandler(() => {
    sheetRef.current.collapse()
  });


  const onScroll = (e) => {
    const { contentOffset, velocity } = e.nativeEvent;
    let newDeviceListAtTop = contentOffset.y <= 0;
    if (newDeviceListAtTop !== deviceListAtTop) {
      setDeviceListAtTop(newDeviceListAtTop)
      if (newDeviceListAtTop && contentOffset.y < 0) {
        sheetRef.current.collapse();
      }
    }
  }

  const onScrollBeginDrag = (e) => {
    let { contentOffset, velocity } = e.nativeEvent;
    if (deviceListAtTop && velocity && velocity.y > 0) {
      sheetRef.current.collapse();
    }
    if (!deviceListAtTop && (contentOffset.y < 0 || (contentOffset.y === 0 && velocity && velocity.y !== 0))) {
      setDeviceListAtTop(true);
      sheetRef.current.collapse();
    }
  }

  return (
    <Sheet
      animation='easeInEaseOut'
      touchEnabled={ deviceListAtTop }
      style={ Styles.sheet }
      testID="DeviceMap-sheet"
      onExpand={ () => {
        setDeviceListAtTop(true);
        setCollapsed(false);
      } }
      onSwipeUp={ () => {setDeviceListAtTop(false);} }
      onCollapse={ () => {
        setDeviceListAtTop(true);
        setCollapsed(true);
        deviceListRef.current && deviceListRef.current.scrollToIndex({ index: 0, viewOffset: 0 })
      } }
      ref={sheetRef}
      >
        <View style={ Styles.sheetHeader }>
          <X.Button
            size='tiny'
            color='borderless'
            isDisabled={ props.areDevicesRefreshing }
            onPress={props.fetchDevices}
            style={ Styles.sheetHeaderActionButton }>
            <ActivityIndicator
              color='white'
              style={ [
                Styles.sheetHeaderActionSpinner,
                props.areDevicesRefreshing && Styles.sheetHeaderActionSpinnerLoading
              ] }
              size='small'
              animating={ props.areDevicesRefreshing } />
            <X.Text
              color='white'
              size='small'
              weight='semibold'>
              Refresh
            </X.Text>
          </X.Button>
        </View>

      { props.devices.devicesDriveTimeSorted.length > 0 ?
        <FlatList
          refreshing={ props.devices.isFetchingDevices }
          data={ props.devices.devicesDriveTimeSorted }
          renderItem={({item, index}) => (
            <DeviceRow onDevicePress={props.handleDevicePress} index={index} devices={props.devices.devices} dongleId={item} navigation={props.navigation} />
          )}
          style={ Styles.sheetDevices }
          extraData={ props.devices }
          keyExtractor={ (item) => item }
          onScroll={ onScroll }
          onScrollBeginDrag={ onScrollBeginDrag }
          onScrollEndDrag={ onScrollBeginDrag }
          scrollEventThrottle={ 16 }
          alwaysBounceVertical={ false }
          bounces={ false }
          scrollEnabled={ !collapsed }
          disableScrollViewPanResponder={ true }
          overScrollMode='never'
          ref={deviceListRef}
          />
        :
        <View style={ Styles.sheetZeroState }>
          <X.Text
            color='white'>
            { props.devices.isFetchingDevices ? 'Loading...' : "You haven't paired a device yet." }
          </X.Text>
          <X.Line
            color='transparent'
            spacing='tiny'/>
          <X.Button
            style={ { paddingLeft: 20, paddingRight: 20, } }
            onPress={ () => props.navigation.navigate('SetupPairing') }>
            Setup new device
          </X.Button>
        </View>
      }
    </Sheet>
  );
}

export default DeviceList;