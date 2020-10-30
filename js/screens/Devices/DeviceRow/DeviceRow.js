// libs
import React from 'react';
import {
  TouchableOpacity,
  View,
} from 'react-native';
import moment from 'moment';

// local
import { deviceTitle, isDeviceOnline } from '../../../utils/device';
import { Assets } from '../../../constants';

// styles
import Styles from '../DeviceMap/DeviceMapStyles';
import X from '../../../theme';

const DeviceRow = (props) => {
  const devices = props.devices;
  const device = devices[props.dongleId];
  if (!device) {
    return null;
  }
  const title = deviceTitle(device);

  const handlePressedDevice = (device) => {
    const deviceLocations = props.devices;
    const location = deviceLocations[device.dongle_id];
    props.navigation.navigate('DeviceInfo', { dongleId: device.dongle_id });
    if (location && location.lng) {
      props.onDevicePress({selectedPin: device.dongle_id}, { centerCoordinate: [ location.lng, location.lat ], zoom: 16, duration: 600 });
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={ 0.8 }
      testID={ "DeviceMap-sheet-device-" + props.index }
      onPress={ () => handlePressedDevice(device) }
      style={ Styles.sheetDevice }>
      <View style={ Styles.sheetDeviceAvatar }>
        <X.Image
          source={ Assets.placeholderCar }
          style={ Styles.sheetDeviceAvatarImageHolder } />
      </View>
      <View style={ Styles.sheetDeviceInfo }>
        <X.Text
          color='white'
          size='small'
          weight='bold'
          numberOfLines={ 1 }
          style={ Styles.sheetDeviceInfoTitle }>
          { title }
        </X.Text>
        { isDeviceOnline(device) ? (
          <View style={ Styles.sheetDeviceInfoStatus }>
            <View style={ Styles.sheetDeviceInfoOnlineBubble } />
            <X.Text
              color='white'
              size='small'>
              Online { device.last_athena_ping < (Date.now()/1000 - 60) ? '(' + moment(device.last_athena_ping*1000).fromNow() + ')' : '' }
            </X.Text>
          </View>
        ) : (
          <X.Text
            color='lightGrey'
            size='small'>
            Offline
          </X.Text>
        ) }
      </View>
      <View style={ Styles.sheetDeviceArrow }>
        <X.Image
          source={ Assets.iconChevronLeft }
          style={ Styles.sheetDeviceArrowImage } />
      </View>
    </TouchableOpacity>
  );
}

export default DeviceRow;