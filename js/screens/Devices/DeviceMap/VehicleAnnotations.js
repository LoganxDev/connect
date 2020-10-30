// libs
import React from 'react';
import {
  View,
  Platform,
} from 'react-native';
import MapboxGL from '@react-native-mapbox-gl/maps';

// local
import { deviceTitle } from '../../../utils/device';

// styles
import Styles from './DeviceMapStyles';

const ONE_WEEK_MILLIS = 7 * 86400 * 1000;

const VehicleAnnotations = (props) => {
  const { devices, devicesDriveTimeSorted, deviceLocations } = props.devices;
  const selectedPin = props.selectedPin;
  const now = Date.now();
  let locEntries;
  if (Platform.OS === 'ios') {
    locEntries = devicesDriveTimeSorted
      .map(dongleId => [dongleId, deviceLocations[dongleId]])
      .filter(([dongleId, location]) => location !== undefined && dongleId === selectedPin && now - location.time < ONE_WEEK_MILLIS);
  } else {
    locEntries = devicesDriveTimeSorted
      .map(dongleId => [dongleId, deviceLocations[dongleId]])
      .filter(([dongleId, location]) => location !== undefined && dongleId !== selectedPin && now - location.time < ONE_WEEK_MILLIS);
    if (selectedPin && deviceLocations[selectedPin]) {
      locEntries.push([selectedPin, deviceLocations[selectedPin]]);
    }
  }

  return (
    locEntries.map(([dongleId, location]) => {
      const device = devices[dongleId];
      if (!device) {
        console.warn('device location but no device', dongleId);
        return null;
      }
      if (location.lng) {
        const title = deviceTitle(device);
        const pinStyle = (Platform.OS === 'ios' && selectedPin !== dongleId) ? {display: 'none'} : null;
        return (
          <MapboxGL.PointAnnotation
            pointerEvents='none'
            key={ 'pointAnnotation_key_' + location.dongle_id }
            id={ 'pointAnnotation_' + location.dongle_id }
            title=''
            onDeselected={ props.onSelectedPinChange(null) }
            style={ [Styles.annotationPin, pinStyle ]}
            selected={ selectedPin===dongleId }
            coordinate={ [location.lng, location.lat] }>
            <View style={Styles.annotationPin} />
            <MapboxGL.Callout
                title={ title }
                textStyle={ { color: 'white' } }
                tipStyle={ [Styles.annotationCalloutTip ]}
                contentStyle={ [Styles.annotationCallout ]}
            />
          </MapboxGL.PointAnnotation>
        );
      } else {
        return null;
      }
    })
  );
}

export default VehicleAnnotations;